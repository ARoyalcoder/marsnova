#include "AuthController.h"
#include "../utils/Security.h"
#include "../utils/Validation.h"
#include <drogon/drogon.h>
#include <unordered_map>
#include <mutex>
#include <atomic>
#include <regex>
#include <chrono>
#include <algorithm>
#include <cctype>
#include <cstdlib>
#include <iostream>

namespace {

struct SessionRecord {
    std::string sessionId;
    std::string userId;
    std::string email;
    std::string fullName;
    std::string role;
    std::string status;
    std::string csrfToken;
    std::chrono::system_clock::time_point expiresAt;
    std::chrono::system_clock::time_point lastVerifiedAt;
};

struct UserRecord {
    std::string id;
    std::string email;
    std::string passwordHash;
    std::string fullName;
    std::string role;
    std::string status; // active, inactive, suspended, pending_verification
};

static std::mutex s_authMutex;
static std::unordered_map<std::string, SessionRecord> s_sessions;

// Process-local staff accounts. This is the live user store in the standalone compat build
// (its DbClient is a stub) and the fixture store for tests. Nothing seeds it: it starts
// empty and only gets accounts from bootstrapAdminFromEnv(), createStaffUser or seedTestUser.
static std::unordered_map<std::string, UserRecord> s_users;

// PostgreSQL is the user store when built against real Drogon.
#ifdef MARSNOVA_COMPAT_DROGON
static std::atomic<bool> s_useDatabase{false};
#else
static std::atomic<bool> s_useDatabase{true};
#endif
static std::atomic<int> s_staffCountCache{0};
static std::atomic<long long> s_revalidateSeconds{60};

// Only these roles may hold a staff session. users also holds client/learner accounts.
#define MARSNOVA_STAFF_ROLES_SQL "('super_admin','agency_manager','editor')"

static std::string toLower(const std::string &str) {
    std::string lower = str;
    std::transform(lower.begin(), lower.end(), lower.begin(), [](unsigned char c) {
        return std::tolower(c);
    });
    return lower;
}

static bool isValidEmail(const std::string &email) {
    return Validation::isValidEmail(email);
}

// -----------------------------------------------------------------------------
// Staff user store: PostgreSQL (real Drogon) or the process-local map (compat/tests).
// Callbacks are never invoked while s_authMutex is held.
// -----------------------------------------------------------------------------
enum class LookupResult { Found, NotFound, Error };
enum class InsertResult { Created, Conflict, Error };
enum class BootstrapResult { Created, Skipped, Error };

using LookupCallback = std::function<void(LookupResult, const UserRecord &)>;
using InsertCallback = std::function<void(InsertResult)>;
using BootstrapCallback = std::function<void(BootstrapResult)>;

static bool isStaffRole(const std::string &role) {
    return role == "super_admin" || role == "agency_manager" || role == "editor";
}

static void findUserByEmail(const std::string &email, LookupCallback cb) {
    const std::string key = toLower(email);

    if (!s_useDatabase) {
        UserRecord user;
        bool found = false;
        {
            std::lock_guard<std::mutex> lock(s_authMutex);
            auto it = s_users.find(key);
            if (it != s_users.end()) {
                user = it->second;
                found = true;
            }
        }
        cb(found ? LookupResult::Found : LookupResult::NotFound, user);
        return;
    }

    auto db = drogon::app().getDbClient("default");
    if (!db) {
        cb(LookupResult::Error, UserRecord{});
        return;
    }

    db->execSqlAsync(
        "SELECT u.id::text AS id, u.email AS email, u.password_hash AS password_hash, "
        "u.full_name AS full_name, r.role_name AS role, u.status AS status "
        "FROM users u JOIN roles r ON r.id = u.role_id "
        "WHERE lower(u.email) = $1 AND r.role_name IN " MARSNOVA_STAFF_ROLES_SQL " LIMIT 1",
        [cb](const drogon::orm::Result &r) {
            if (r.empty()) {
                cb(LookupResult::NotFound, UserRecord{});
                return;
            }
            const auto &row = r[0];
            UserRecord user;
            user.id = row["id"].as<std::string>();
            user.email = row["email"].as<std::string>();
            user.passwordHash = row["password_hash"].as<std::string>();
            user.fullName = row["full_name"].as<std::string>();
            user.role = row["role"].as<std::string>();
            user.status = row["status"].as<std::string>();
            cb(LookupResult::Found, user);
        },
        [cb](const drogon::orm::DrogonDbException &e) {
            std::cout << "[MarsNova Auth] user lookup failed: " << e.base().what() << std::endl;
            cb(LookupResult::Error, UserRecord{});
        },
        key
    );
}

// Creates a staff account. Emails are stored lowercase so lookups and uniqueness agree.
static void insertStaffUser(UserRecord user, InsertCallback cb) {
    const std::string key = toLower(user.email);

    if (!s_useDatabase) {
        bool conflict = false;
        {
            std::lock_guard<std::mutex> lock(s_authMutex);
            if (s_users.find(key) != s_users.end()) {
                conflict = true;
            } else {
                user.id = "u-" + Security::randomHex(8);
                s_users[key] = user;
            }
        }
        cb(conflict ? InsertResult::Conflict : InsertResult::Created);
        return;
    }

    auto db = drogon::app().getDbClient("default");
    if (!db) {
        cb(InsertResult::Error);
        return;
    }

    db->execSqlAsync(
        "INSERT INTO users (role_id, email, password_hash, full_name, status) "
        "SELECT r.id, $1, $2, $3, 'active' FROM roles r WHERE r.role_name = $4 "
        "ON CONFLICT (email) DO NOTHING RETURNING id::text AS id",
        [cb](const drogon::orm::Result &r) {
            cb(r.empty() ? InsertResult::Conflict : InsertResult::Created);
        },
        [cb](const drogon::orm::DrogonDbException &e) {
            std::cout << "[MarsNova Auth] staff insert failed: " << e.base().what() << std::endl;
            cb(InsertResult::Error);
        },
        key, user.passwordHash, user.fullName, user.role
    );
}

// Creates the first admin only when no active super_admin exists. In PostgreSQL the check and the
// insert are one statement, so concurrent starts cannot both create an admin.
static void insertBootstrapAdmin(UserRecord admin, BootstrapCallback cb) {
    const std::string key = toLower(admin.email);

    if (!s_useDatabase) {
        bool created = false;
        {
            std::lock_guard<std::mutex> lock(s_authMutex);
            bool hasActiveAdmin = false;
            for (const auto &kv : s_users) {
                if (kv.second.role == "super_admin" && kv.second.status == "active") {
                    hasActiveAdmin = true;
                    break;
                }
            }
            if (!hasActiveAdmin && s_users.find(key) == s_users.end()) {
                admin.id = "u-" + Security::randomHex(8);
                s_users[key] = admin;
                created = true;
            }
        }
        cb(created ? BootstrapResult::Created : BootstrapResult::Skipped);
        return;
    }

    auto db = drogon::app().getDbClient("default");
    if (!db) {
        cb(BootstrapResult::Error);
        return;
    }

    db->execSqlAsync(
        "INSERT INTO users (role_id, email, password_hash, full_name, status) "
        "SELECT r.id, $1, $2, $3, 'active' FROM roles r WHERE r.role_name = 'super_admin' "
        "AND NOT EXISTS (SELECT 1 FROM users u JOIN roles sr ON sr.id = u.role_id "
        "WHERE sr.role_name = 'super_admin' AND u.status = 'active') "
        "ON CONFLICT (email) DO NOTHING RETURNING id::text AS id",
        [cb](const drogon::orm::Result &r) {
            cb(r.empty() ? BootstrapResult::Skipped : BootstrapResult::Created);
        },
        [cb](const drogon::orm::DrogonDbException &e) {
            std::cout << "[MarsNova Auth] bootstrap insert failed: " << e.base().what() << std::endl;
            cb(BootstrapResult::Error);
        },
        key, admin.passwordHash, admin.fullName
    );
}

// Refreshes the cached active-staff count shown on the admin overview (PostgreSQL mode only).
static void refreshStaffCount() {
    if (!s_useDatabase) return;
    auto db = drogon::app().getDbClient("default");
    if (!db) return;

    db->execSqlAsync(
        "SELECT count(*)::text AS n FROM users u JOIN roles r ON r.id = u.role_id "
        "WHERE u.status = 'active' AND r.role_name IN " MARSNOVA_STAFF_ROLES_SQL,
        [](const drogon::orm::Result &r) {
            if (r.empty()) return;
            try {
                s_staffCountCache = std::stoi(r[0]["n"].as<std::string>());
            } catch (...) {
            }
        },
        [](const drogon::orm::DrogonDbException &) {}
    );
}

// Re-checks a database-backed session's user. A suspended, deactivated, removed or no-longer-staff
// user loses the session. A failed check keeps the session so a database blip cannot lock staff out.
static void revalidateSessionAsync(const std::string &sessionId, const std::string &userId) {
    auto db = drogon::app().getDbClient("default");
    if (!db) return;

    db->execSqlAsync(
        "SELECT u.status AS status, r.role_name AS role FROM users u "
        "JOIN roles r ON r.id = u.role_id WHERE u.id = $1::uuid LIMIT 1",
        [sessionId](const drogon::orm::Result &r) {
            std::string status;
            std::string role;
            bool revoke = true;
            if (!r.empty()) {
                status = r[0]["status"].as<std::string>();
                role = r[0]["role"].as<std::string>();
                revoke = (status != "active") || !isStaffRole(role);
            }

            {
                std::lock_guard<std::mutex> lock(s_authMutex);
                auto it = s_sessions.find(sessionId);
                if (it == s_sessions.end()) return;
                if (revoke) {
                    s_sessions.erase(it);
                } else {
                    it->second.role = role;
                    it->second.status = status;
                }
            }

            if (revoke) {
                auto dbClient = drogon::app().getDbClient("default");
                if (dbClient) {
                    dbClient->execSqlAsync(
                        "DELETE FROM sessions WHERE id = $1",
                        [](const drogon::orm::Result &) {},
                        [](const drogon::orm::DrogonDbException &) {},
                        sessionId
                    );
                }
            }
        },
        [](const drogon::orm::DrogonDbException &e) {
            std::cout << "[MarsNova Auth] session revalidation failed: " << e.base().what() << std::endl;
        },
        userId
    );
}

std::string extractSessionId(const drogon::HttpRequestPtr &req) {
    // 1. Try Cookie: marsnova_session=...
    std::string cookieHeader = req->getHeader("Cookie");
    if (!cookieHeader.empty()) {
        size_t pos = cookieHeader.find("marsnova_session=");
        if (pos != std::string::npos) {
            size_t start = pos + 17;
            size_t end = cookieHeader.find(';', start);
            return cookieHeader.substr(start, (end == std::string::npos) ? std::string::npos : end - start);
        }
    }

    // 2. Try Authorization: Bearer <sessionId>
    std::string authHeader = req->getHeader("Authorization");
    if (!authHeader.empty() && authHeader.rfind("Bearer ", 0) == 0) {
        return authHeader.substr(7);
    }

    // 3. Try X-Session-Id header
    std::string xSession = req->getHeader("X-Session-Id");
    if (!xSession.empty()) {
        return xSession;
    }

    return "";
}

std::string extractCsrfToken(const drogon::HttpRequestPtr &req) {
    std::string token = req->getHeader("X-CSRF-Token");
    if (!token.empty()) return token;

    token = req->getHeader("X-XSRF-Token");
    if (!token.empty()) return token;

    auto json = req->jsonObject();
    if (json && json->isMember("csrf_token")) {
        return (*json)["csrf_token"].asString();
    }

    return "";
}

bool authenticateSession(const drogon::HttpRequestPtr &req,
                         SessionRecord &outSession,
                         Json::Value &outError,
                         drogon::HttpStatusCode &outStatus) {
    std::string sid = extractSessionId(req);
    if (sid.empty()) {
        outError["error"] = "Authentication required. No session cookie or token provided.";
        outError["code"] = "UNAUTHORIZED";
        outStatus = drogon::k401Unauthorized;
        return false;
    }

    bool needsRevalidation = false;
    std::string revalidateUserId;

    {
        std::lock_guard<std::mutex> lock(s_authMutex);
        auto it = s_sessions.find(sid);
        if (it == s_sessions.end()) {
            outError["error"] = "Invalid or expired session. Please log in.";
            outError["code"] = "INVALID_SESSION";
            outStatus = drogon::k401Unauthorized;
            return false;
        }

        auto now = std::chrono::system_clock::now();
        if (now >= it->second.expiresAt) {
            s_sessions.erase(it);
            outError["error"] = "Session expired. Please log in again.";
            outError["code"] = "SESSION_EXPIRED";
            outStatus = drogon::k401Unauthorized;
            return false;
        }

        if (!s_useDatabase) {
            // Re-verify underlying user account status
            auto userIt = s_users.find(toLower(it->second.email));
            if (userIt != s_users.end()) {
                if (userIt->second.status == "suspended") {
                    s_sessions.erase(it);
                    outError["error"] = "Your staff account has been suspended.";
                    outError["code"] = "ACCOUNT_SUSPENDED";
                    outStatus = drogon::k403Forbidden;
                    return false;
                }
                if (userIt->second.status != "active") {
                    s_sessions.erase(it);
                    outError["error"] = "Your account is not active.";
                    outError["code"] = "ACCOUNT_INACTIVE";
                    outStatus = drogon::k403Forbidden;
                    return false;
                }
                it->second.status = userIt->second.status;
                it->second.role = userIt->second.role;
            }
        } else if (now - it->second.lastVerifiedAt >= std::chrono::seconds(s_revalidateSeconds.load())) {
            // The database can't be read synchronously here, so refresh in the background.
            // A suspension takes effect within one interval plus one request.
            it->second.lastVerifiedAt = now;
            needsRevalidation = true;
            revalidateUserId = it->second.userId;
        }

        outSession = it->second;
    }

    if (needsRevalidation) {
        revalidateSessionAsync(sid, revalidateUserId);
    }
    return true;
}

} // namespace

static void completeLogin(const std::function<void(const drogon::HttpResponsePtr &)> &callback,
                          const std::string &reqId,
                          const std::string &clientIp,
                          const std::string &password,
                          LookupResult lookup,
                          const UserRecord &user);

AuthController::StaffAuthResult AuthController::verifyRequestSession(const drogon::HttpRequestPtr &req) {
    StaffAuthResult res;
    SessionRecord session;
    Json::Value err;
    drogon::HttpStatusCode status;

    if (!authenticateSession(req, session, err, status)) {
        res.authenticated = false;
        res.errorCode = err.get("code", "UNAUTHORIZED").asString();
        res.errorMessage = err.get("error", "Authentication required").asString();
        res.statusCode = status;
        return res;
    }

    res.authenticated = true;
    res.userId = session.userId;
    res.email = session.email;
    res.fullName = session.fullName;
    res.role = session.role;
    res.status = session.status;
    res.csrfToken = session.csrfToken;
    res.statusCode = drogon::k200OK;
    return res;
}

void AuthController::seedTestUser(const std::string &email,
                                 const std::string &password,
                                 const std::string &role,
                                 const std::string &status,
                                 const std::string &fullName,
                                 const std::string &id) {
    std::lock_guard<std::mutex> lock(s_authMutex);
    UserRecord u;
    u.id = id.empty() ? "u-" + Security::randomHex(8) : id;
    u.email = email;
    u.fullName = fullName;
    u.role = role;
    u.status = status;
    u.passwordHash = Security::hashPassword(password);
    s_users[toLower(email)] = u;
}

void AuthController::clearSessions() {
    std::lock_guard<std::mutex> lock(s_authMutex);
    s_sessions.clear();
}

void AuthController::clearUsers() {
    std::lock_guard<std::mutex> lock(s_authMutex);
    s_users.clear();
}

void AuthController::useDatabaseUserStore(bool enabled) {
    s_useDatabase = enabled;
}

bool AuthController::usingDatabaseUserStore() {
    return s_useDatabase;
}

void AuthController::setSessionRevalidationInterval(std::chrono::seconds interval) {
    s_revalidateSeconds = interval.count();
}

void AuthController::bootstrapAdminFromEnv() {
    auto readEnv = [](const char *name) {
        const char *value = std::getenv(name);
        std::string out = value ? value : "";
        const auto isSpace = [](unsigned char c) { return std::isspace(c) != 0; };
        out.erase(out.begin(), std::find_if_not(out.begin(), out.end(), isSpace));
        out.erase(std::find_if_not(out.rbegin(), out.rend(), isSpace).base(), out.end());
        return out;
    };

    std::cout << "[MarsNova Auth] Staff user store: "
              << (s_useDatabase ? "PostgreSQL"
                                : "in-process memory (standalone build: accounts are not persisted across restarts)")
              << std::endl;

    const std::string email = readEnv("MARSNOVA_BOOTSTRAP_ADMIN_EMAIL");
    const std::string password = readEnv("MARSNOVA_BOOTSTRAP_ADMIN_PASSWORD");
    std::string fullName = readEnv("MARSNOVA_BOOTSTRAP_ADMIN_NAME");
    if (fullName.empty()) fullName = "Studio Administrator";

    if (email.empty() && password.empty()) {
        std::cout << "[MarsNova Auth] No bootstrap admin requested (MARSNOVA_BOOTSTRAP_ADMIN_EMAIL / _PASSWORD not set)." << std::endl;
        refreshStaffCount();
        return;
    }
    if (email.empty() || password.empty()) {
        std::cout << "[MarsNova Auth] Bootstrap admin NOT created: set both MARSNOVA_BOOTSTRAP_ADMIN_EMAIL and "
                     "MARSNOVA_BOOTSTRAP_ADMIN_PASSWORD." << std::endl;
        return;
    }
    if (!isValidEmail(email)) {
        std::cout << "[MarsNova Auth] Bootstrap admin NOT created: MARSNOVA_BOOTSTRAP_ADMIN_EMAIL is not a valid email." << std::endl;
        return;
    }
    if (password.length() < 12) {
        std::cout << "[MarsNova Auth] Bootstrap admin NOT created: MARSNOVA_BOOTSTRAP_ADMIN_PASSWORD must be at least "
                     "12 characters." << std::endl;
        return;
    }

    UserRecord admin;
    admin.email = email;
    admin.fullName = fullName;
    admin.role = "super_admin";
    admin.status = "active";
    admin.passwordHash = Security::hashPassword(password);

    insertBootstrapAdmin(admin, [email](BootstrapResult result) {
        switch (result) {
            case BootstrapResult::Created:
                std::cout << "[MarsNova Auth] Bootstrap admin created: " << email
                          << ". Remove MARSNOVA_BOOTSTRAP_ADMIN_PASSWORD from the environment now." << std::endl;
                break;
            case BootstrapResult::Skipped:
                std::cout << "[MarsNova Auth] Bootstrap admin skipped: an active super_admin already exists, or "
                          << email << " is already in use. Nothing was changed." << std::endl;
                break;
            case BootstrapResult::Error:
                std::cout << "[MarsNova Auth] Bootstrap admin FAILED: the user store was unavailable." << std::endl;
                break;
        }
        refreshStaffCount();
    });
}

void AuthController::expireSession(const std::string &sessionId) {
    std::lock_guard<std::mutex> lock(s_authMutex);
    auto it = s_sessions.find(sessionId);
    if (it != s_sessions.end()) {
        it->second.expiresAt = std::chrono::system_clock::now() - std::chrono::seconds(10);
    }
}

// -----------------------------------------------------------------------------
// POST /api/v1/auth/login
// -----------------------------------------------------------------------------
void AuthController::login(const drogon::HttpRequestPtr &req,
                          std::function<void(const drogon::HttpResponsePtr &)> &&callback) {
    if (req->method() == drogon::Options) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        callback(resp);
        return;
    }

    std::string reqId = req->attributes()->get("request_id");
    if (reqId.empty()) reqId = req->getHeader("X-Request-Id");

    auto jsonPtr = req->jsonObject();
    if (!jsonPtr) {
        Json::Value err;
        err["error"] = "Invalid JSON payload";
        err["code"] = "BAD_REQUEST";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    const auto &json = *jsonPtr;
    std::string email = json.get("email", "").asString();
    std::string password = json.get("password", "").asString();

    if (email.empty() || password.empty()) {
        Json::Value err;
        err["error"] = "Both email and password are required";
        err["code"] = "VALIDATION_FAILED";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    if (!isValidEmail(email)) {
        Json::Value err;
        err["error"] = "Please provide a valid email format";
        err["code"] = "VALIDATION_FAILED";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    const std::string clientIp = Security::resolveClientIp(req->peerAddr().toIp(), req->getHeader("X-Real-IP"), req->getHeader("X-Forwarded-For"));
    findUserByEmail(email, [callback, reqId, clientIp, password](LookupResult lookup, const UserRecord &user) {
        completeLogin(callback, reqId, clientIp, password, lookup, user);
    });
}

// Second half of login, once the user store has answered: synchronously for the in-process
// store, from the database callback otherwise.
static void completeLogin(const std::function<void(const drogon::HttpResponsePtr &)> &callback,
                          const std::string &reqId,
                          const std::string &clientIp,
                          const std::string &password,
                          LookupResult lookup,
                          const UserRecord &user) {
    if (lookup == LookupResult::Error) {
        // Fail closed: never sign anyone in when the user store can't be read.
        Json::Value err;
        err["error"] = "Staff sign-in is temporarily unavailable. Please try again shortly.";
        err["code"] = "AUTH_BACKEND_UNAVAILABLE";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k503ServiceUnavailable);
        callback(resp);
        return;
    }

    if (lookup == LookupResult::NotFound) {
        // Prevent user enumeration by timing
        Security::verifyPassword("dummy-password", Security::dummyPasswordHash());
        Json::Value err;
        err["error"] = "Invalid email or password";
        err["code"] = "INVALID_CREDENTIALS";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k401Unauthorized);
        callback(resp);
        return;
    }

    // Verify password hash
    if (!Security::verifyPassword(password, user.passwordHash)) {
        Json::Value err;
        err["error"] = "Invalid email or password";
        err["code"] = "INVALID_CREDENTIALS";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k401Unauthorized);
        callback(resp);
        return;
    }

    // Account status check
    if (user.status == "suspended") {
        Json::Value err;
        err["error"] = "Your staff account has been suspended. Please contact administration.";
        err["code"] = "ACCOUNT_SUSPENDED";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k403Forbidden);
        callback(resp);
        return;
    }

    if (user.status == "inactive") {
        Json::Value err;
        err["error"] = "Your account is currently inactive. Please contact administration.";
        err["code"] = "ACCOUNT_INACTIVE";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k403Forbidden);
        callback(resp);
        return;
    }

    if (user.status == "pending_verification") {
        Json::Value err;
        err["error"] = "Your account is pending verification.";
        err["code"] = "PENDING_VERIFICATION";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k403Forbidden);
        callback(resp);
        return;
    }

    // Generate secure session tokens
    std::string sessionId = Security::randomHex(32); // 64 hex chars
    std::string csrfToken = Security::randomHex(16); // 32 hex chars
    auto expiresAt = std::chrono::system_clock::now() + std::chrono::hours(24);

    SessionRecord session;
    session.sessionId = sessionId;
    session.userId = user.id;
    session.email = user.email;
    session.fullName = user.fullName;
    session.role = user.role;
    session.status = user.status;
    session.csrfToken = csrfToken;
    session.expiresAt = expiresAt;
    session.lastVerifiedAt = std::chrono::system_clock::now();

    {
        std::lock_guard<std::mutex> lock(s_authMutex);
        s_sessions[sessionId] = session;
    }

    // Database record persistence
    auto dbClient = drogon::app().getDbClient("default");
    if (dbClient) {
        dbClient->execSqlAsync(
            "INSERT INTO sessions (id, user_id, csrf_token, ip_address, expires_at) "
            "VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP + INTERVAL '24 hours')",
            [](const drogon::orm::Result &) {},
            [](const drogon::orm::DrogonDbException &) {},
            sessionId, user.id, csrfToken, clientIp
        );
        dbClient->execSqlAsync(
            "UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1",
            [](const drogon::orm::Result &) {},
            [](const drogon::orm::DrogonDbException &) {},
            user.id
        );
    }

    Json::Value userJson;
    userJson["id"] = user.id;
    userJson["email"] = user.email;
    userJson["full_name"] = user.fullName;
    userJson["role"] = user.role;
    userJson["status"] = user.status;

    Json::Value sessionJson;
    sessionJson["session_id"] = sessionId;
    sessionJson["csrf_token"] = csrfToken;
    sessionJson["user"] = userJson;

    Json::Value res;
    res["success"] = true;
    res["status"] = "ok";
    res["message"] = "Staff login successful";
    res["session"] = sessionJson;
    if (!reqId.empty()) res["request_id"] = reqId;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    resp->setStatusCode(drogon::k200OK);

    // Set secure HTTP-only session cookie with SameSite=Strict
    std::string cookieVal = "marsnova_session=" + sessionId + "; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400";
    resp->addHeader("Set-Cookie", cookieVal);
    resp->addHeader("X-CSRF-Token", csrfToken);

    callback(resp);
}

// -----------------------------------------------------------------------------
// POST /api/v1/auth/logout
// -----------------------------------------------------------------------------
void AuthController::logout(const drogon::HttpRequestPtr &req,
                           std::function<void(const drogon::HttpResponsePtr &)> &&callback) {
    if (req->method() == drogon::Options) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        callback(resp);
        return;
    }

    std::string reqId = req->attributes()->get("request_id");
    if (reqId.empty()) reqId = req->getHeader("X-Request-Id");

    std::string sid = extractSessionId(req);
    if (!sid.empty()) {
        std::lock_guard<std::mutex> lock(s_authMutex);
        s_sessions.erase(sid);

        auto dbClient = drogon::app().getDbClient("default");
        if (dbClient) {
            dbClient->execSqlAsync(
                "DELETE FROM sessions WHERE id = $1",
                [](const drogon::orm::Result &) {},
                [](const drogon::orm::DrogonDbException &) {},
                sid
            );
        }
    }

    Json::Value res;
    res["success"] = true;
    res["status"] = "ok";
    res["message"] = "Logged out successfully";
    if (!reqId.empty()) res["request_id"] = reqId;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    resp->setStatusCode(drogon::k200OK);

    // Expire cookie immediately
    resp->addHeader("Set-Cookie", "marsnova_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0");
    callback(resp);
}

// -----------------------------------------------------------------------------
// GET /api/v1/auth/session (and /api/v1/auth/me)
// -----------------------------------------------------------------------------
void AuthController::getSession(const drogon::HttpRequestPtr &req,
                               std::function<void(const drogon::HttpResponsePtr &)> &&callback) {
    if (req->method() == drogon::Options) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        callback(resp);
        return;
    }

    std::string reqId = req->attributes()->get("request_id");
    if (reqId.empty()) reqId = req->getHeader("X-Request-Id");

    SessionRecord session;
    Json::Value err;
    drogon::HttpStatusCode status;

    if (!authenticateSession(req, session, err, status)) {
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(status);
        if (status == drogon::k401Unauthorized || status == drogon::k403Forbidden) {
            resp->addHeader("Set-Cookie", "marsnova_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0");
        }
        callback(resp);
        return;
    }

    Json::Value userJson;
    userJson["id"] = session.userId;
    userJson["email"] = session.email;
    userJson["full_name"] = session.fullName;
    userJson["role"] = session.role;
    userJson["status"] = session.status;

    Json::Value permissions(Json::objectValue);
    if (session.role == "super_admin") {
        permissions["all"] = true;
        permissions["manage_users"] = true;
        permissions["manage_quotes"] = true;
        permissions["manage_projects"] = true;
    } else if (session.role == "agency_manager") {
        permissions["manage_quotes"] = true;
        permissions["manage_projects"] = true;
        permissions["manage_users"] = false;
    } else if (session.role == "editor") {
        permissions["edit_media"] = true;
        permissions["manage_quotes"] = false;
        permissions["manage_users"] = false;
    }
    userJson["permissions"] = permissions;

    Json::Value res;
    res["status"] = "ok";
    res["authenticated"] = true;
    res["user"] = userJson;
    res["csrf_token"] = session.csrfToken;
    if (!reqId.empty()) res["request_id"] = reqId;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    resp->setStatusCode(drogon::k200OK);
    callback(resp);
}

// -----------------------------------------------------------------------------
// POST /api/v1/admin/users (Requires super_admin only; strictly prevents privilege escalation)
// -----------------------------------------------------------------------------
void AuthController::createStaffUser(const drogon::HttpRequestPtr &req,
                                    std::function<void(const drogon::HttpResponsePtr &)> &&callback) {
    if (req->method() == drogon::Options) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        callback(resp);
        return;
    }

    std::string reqId = req->attributes()->get("request_id");
    if (reqId.empty()) reqId = req->getHeader("X-Request-Id");

    SessionRecord session;
    Json::Value err;
    drogon::HttpStatusCode status;

    if (!authenticateSession(req, session, err, status)) {
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(status);
        callback(resp);
        return;
    }

    // CSRF Protection on state-changing requests
    std::string providedCsrf = extractCsrfToken(req);
    if (providedCsrf.empty() || !Security::constantTimeEquals(providedCsrf, session.csrfToken)) {
        Json::Value csrfErr;
        csrfErr["error"] = "CSRF verification failed. Missing or invalid X-CSRF-Token header.";
        csrfErr["code"] = "CSRF_VERIFICATION_FAILED";
        if (!reqId.empty()) csrfErr["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(csrfErr);
        resp->setStatusCode(drogon::k403Forbidden);
        callback(resp);
        return;
    }

    // Privilege escalation prevention: Only super_admin may create or manage staff users
    if (session.role != "super_admin") {
        Json::Value rbacErr;
        rbacErr["error"] = "Privilege escalation rejected. Only super_admin can create or manage staff user accounts.";
        rbacErr["code"] = "FORBIDDEN_INSUFFICIENT_PERMISSIONS";
        if (!reqId.empty()) rbacErr["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(rbacErr);
        resp->setStatusCode(drogon::k403Forbidden);
        callback(resp);
        return;
    }

    auto jsonPtr = req->jsonObject();
    if (!jsonPtr) {
        Json::Value badJson;
        badJson["error"] = "Invalid JSON payload";
        badJson["code"] = "BAD_REQUEST";
        if (!reqId.empty()) badJson["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(badJson);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    const auto &json = *jsonPtr;
    std::string newEmail = json.get("email", "").asString();
    std::string newPassword = json.get("password", "").asString();
    std::string newFullName = json.get("full_name", "").asString();
    std::string newRole = json.get("role", "editor").asString();

    if (newEmail.empty() || newPassword.empty() || newFullName.empty()) {
        Json::Value valErr;
        valErr["error"] = "Email, password, and full_name are required.";
        valErr["code"] = "VALIDATION_FAILED";
        if (!reqId.empty()) valErr["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(valErr);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    if (newPassword.length() < 8) {
        Json::Value valErr;
        valErr["error"] = "Password must be at least 8 characters long.";
        valErr["code"] = "VALIDATION_FAILED";
        if (!reqId.empty()) valErr["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(valErr);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    if (!isValidEmail(newEmail)) {
        Json::Value valErr;
        valErr["error"] = "Invalid email format.";
        valErr["code"] = "VALIDATION_FAILED";
        if (!reqId.empty()) valErr["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(valErr);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    // Role validation
    if (newRole != "super_admin" && newRole != "agency_manager" && newRole != "editor") {
        Json::Value valErr;
        valErr["error"] = "Invalid role specified.";
        valErr["code"] = "VALIDATION_FAILED";
        if (!reqId.empty()) valErr["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(valErr);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    UserRecord newUser;
    newUser.email = newEmail;
    newUser.fullName = newFullName;
    newUser.role = newRole;
    newUser.status = "active";
    newUser.passwordHash = Security::hashPassword(newPassword);

    insertStaffUser(newUser, [callback, reqId, newEmail, newFullName, newRole](InsertResult result) {
        if (result == InsertResult::Conflict) {
            Json::Value conflictErr;
            conflictErr["error"] = "A staff account with this email already exists.";
            conflictErr["code"] = "USER_ALREADY_EXISTS";
            if (!reqId.empty()) conflictErr["request_id"] = reqId;
            auto resp = drogon::HttpResponse::newHttpJsonResponse(conflictErr);
            resp->setStatusCode(drogon::k409Conflict);
            callback(resp);
            return;
        }

        if (result == InsertResult::Error) {
            Json::Value dbErr;
            dbErr["error"] = "Staff accounts are temporarily unavailable. Please try again shortly.";
            dbErr["code"] = "AUTH_BACKEND_UNAVAILABLE";
            if (!reqId.empty()) dbErr["request_id"] = reqId;
            auto resp = drogon::HttpResponse::newHttpJsonResponse(dbErr);
            resp->setStatusCode(drogon::k503ServiceUnavailable);
            callback(resp);
            return;
        }

        refreshStaffCount();

        Json::Value createdJson;
        createdJson["email"] = newEmail;
        createdJson["full_name"] = newFullName;
        createdJson["role"] = newRole;
        createdJson["status"] = "active";

        Json::Value res;
        res["success"] = true;
        res["status"] = "ok";
        res["message"] = "Staff account created successfully";
        res["user"] = createdJson;
        if (!reqId.empty()) res["request_id"] = reqId;

        auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
        resp->setStatusCode(drogon::k201Created);
        callback(resp);
    });
}
