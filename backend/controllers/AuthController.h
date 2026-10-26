#pragma once
#include <drogon/HttpController.h>
#include <string>
#include <memory>
#include <chrono>

class AuthController : public drogon::HttpController<AuthController> {
public:
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(AuthController::login, "/api/v1/auth/login", drogon::Post, drogon::Options);
    ADD_METHOD_TO(AuthController::logout, "/api/v1/auth/logout", drogon::Post, drogon::Options);
    ADD_METHOD_TO(AuthController::getSession, "/api/v1/auth/session", drogon::Get, drogon::Options);
    ADD_METHOD_TO(AuthController::getSession, "/api/v1/auth/me", drogon::Get, drogon::Options);

    // Protected Role-Based Admin Operations (staff accounts)
    ADD_METHOD_TO(AuthController::createStaffUser, "/api/v1/admin/users", drogon::Post, drogon::Options);
    METHOD_LIST_END

    void login(const drogon::HttpRequestPtr &req,
               std::function<void(const drogon::HttpResponsePtr &)> &&callback);

    void logout(const drogon::HttpRequestPtr &req,
                std::function<void(const drogon::HttpResponsePtr &)> &&callback);

    void getSession(const drogon::HttpRequestPtr &req,
                    std::function<void(const drogon::HttpResponsePtr &)> &&callback);

    // RBAC Endpoints
    void createStaffUser(const drogon::HttpRequestPtr &req,
                         std::function<void(const drogon::HttpResponsePtr &)> &&callback);

    // Testing and seeding helpers
    struct StaffAuthResult {
        bool authenticated{false};
        std::string userId;
        std::string email;
        std::string fullName;
        std::string role;
        std::string status;
        std::string csrfToken;
        std::string errorCode;
        std::string errorMessage;
        drogon::HttpStatusCode statusCode{drogon::k200OK};
    };

    static StaffAuthResult verifyRequestSession(const drogon::HttpRequestPtr &req);

    // One-time first-admin bootstrap. Reads MARSNOVA_BOOTSTRAP_ADMIN_EMAIL and
    // MARSNOVA_BOOTSTRAP_ADMIN_PASSWORD (optional MARSNOVA_BOOTSTRAP_ADMIN_NAME) and creates a
    // super_admin only when no active super_admin exists. It never overwrites or resets an
    // existing account. Call once at startup, after the database client is available.
    static void bootstrapAdminFromEnv();

    // Staff accounts live in PostgreSQL when built against real Drogon, and in a process-local
    // map in the standalone compat build (whose DbClient is a stub). Tests and tooling can
    // override the default.
    static void useDatabaseUserStore(bool enabled);
    static bool usingDatabaseUserStore();

    // How often a database-backed session re-checks its user's role/status (default 60s).
    static void setSessionRevalidationInterval(std::chrono::seconds interval);

    // Test helpers: these only touch the process-local user map and the session table.
    // No account exists unless something seeds it. Pass `id` to pin a stable user id.
    static void seedTestUser(const std::string &email,
                             const std::string &password,
                             const std::string &role,
                             const std::string &status = "active",
                             const std::string &fullName = "Staff User",
                             const std::string &id = "");
    static void clearSessions();
    static void clearUsers();
    static void expireSession(const std::string &sessionId);
};
