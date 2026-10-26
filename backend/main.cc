#include <drogon/drogon.h>
#include "controllers/AuthController.h"
#include "utils/Security.h"
#include <iostream>
#include <sstream>
#include <string>
#include <chrono>
#include <iomanip>

namespace {

// http(s)://localhost, 127.0.0.1 or [::1] on any port. These are only reachable from the machine
// itself, so they are always allowed and local development works whichever port Vite picks.
bool isLoopbackOrigin(const std::string &origin) {
    std::string rest;
    if (origin.rfind("http://", 0) == 0) rest = origin.substr(7);
    else if (origin.rfind("https://", 0) == 0) rest = origin.substr(8);
    else return false;
    if (rest.empty() || rest.find('/') != std::string::npos) return false;

    std::string host = rest;
    std::string port;
    if (rest[0] == '[') {
        const size_t close = rest.find(']');
        if (close == std::string::npos) return false;
        host = rest.substr(0, close + 1);
        if (close + 1 < rest.size()) {
            if (rest[close + 1] != ':') return false;
            port = rest.substr(close + 2);
        }
    } else {
        const size_t colon = rest.find(':');
        if (colon != std::string::npos) {
            host = rest.substr(0, colon);
            port = rest.substr(colon + 1);
        }
    }
    if (!port.empty()) {
        if (port.size() > 5) return false;
        for (char c : port) {
            if (c < '0' || c > '9') return false;
        }
    }
    return host == "localhost" || host == "127.0.0.1" || host == "[::1]";
}

// An Origin may receive credentialed CORS access only if it is listed in config.json
// (custom_config.cors_allowed_origins, rendered from CORS_ORIGINS in Docker), is loopback,
// or matches the known MarsNova deployment domains.
bool isAllowedOrigin(const std::string &origin) {
    if (origin.empty() || origin.size() > 256) return false;
    if (isLoopbackOrigin(origin)) return true;

    // Built-in allowlist for official MarsNova frontend domains (production & Vercel)
    if (origin == "https://marsnova.vercel.app" ||
        origin == "https://marsnova.in" ||
        origin == "https://www.marsnova.in") {
        return true;
    }
    // Allow MarsNova Vercel previews (e.g. https://marsnova-*.vercel.app)
    if (origin.rfind("https://marsnova", 0) == 0 && origin.find(".vercel.app") != std::string::npos) {
        return true;
    }

    const Json::Value &allowed = drogon::app().getCustomConfig()["cors_allowed_origins"];
    if (!allowed.isArray()) return false;
    for (size_t i = 0; i < allowed.size(); ++i) {
        std::string entry = allowed[static_cast<int>(i)].asString();
        while (!entry.empty() && entry.back() == '/') entry.pop_back();
        if (!entry.empty()) {
            if (entry == "*" || entry == origin) return true;
            if (entry.rfind("*.", 0) == 0) {
                std::string suffix = entry.substr(1);
                if (origin.size() >= suffix.size() &&
                    origin.compare(origin.size() - suffix.size(), suffix.size(), suffix) == 0) {
                    return true;
                }
            }
        }
    }
    return false;
}

// Request paths and the client-supplied X-Request-Id can contain quotes and backslashes; writing
// them raw into the JSON log line let a request forge extra fields in its own log entry.
std::string jsonEscapeForLog(const std::string &in) {
    std::ostringstream os;
    for (unsigned char c : in) {
        if (c == '"') os << "\\\"";
        else if (c == '\\') os << "\\\\";
        else if (c < 0x20 || c == 0x7f) os << "\\u" << std::hex << std::setw(4) << std::setfill('0') << static_cast<int>(c) << std::dec;
        else os << static_cast<char>(c);
    }
    return os.str();
}

}  // namespace

int main() {
    std::cout << "[MarsNova] Initializing Drogon Backend Server..." << std::endl;

    // 1. Load Drogon configuration with environment overrides (keeping secrets out of source control)
    drogon::app().loadConfigFile("./config.json");

    // 1b. Create the first admin from MARSNOVA_BOOTSTRAP_ADMIN_* when none exists. There are no
    // built-in staff accounts. With real Drogon the database client only exists once the event
    // loop is running, so move this call into an app-start hook there.
    AuthController::bootstrapAdminFromEnv();

    // In standalone in-memory mode, ensure default development staff accounts are available:
    if (!AuthController::usingDatabaseUserStore()) {
        AuthController::seedTestUser("admin@marsnova.in", "Admin@2026!", "super_admin", "active", "Aditya Verma", "u-00000000-0001");
        AuthController::seedTestUser("manager@marsnova.in", "Manager@2026!", "agency_manager", "active", "Priya Sharma", "u-00000000-0002");
        AuthController::seedTestUser("editor@marsnova.in", "Editor@2026!", "editor", "active", "Rohan Das", "u-00000000-0003");
    }

    // 2. Request ID Generation & Injection (Beginning Advice)
    drogon::app().registerBeginningAdvice([](const drogon::HttpRequestPtr &req) {
        std::string reqId = req->getHeader("X-Request-Id");
        if (reqId.empty()) {
            auto now = std::chrono::duration_cast<std::chrono::microseconds>(
                std::chrono::system_clock::now().time_since_epoch()
            ).count();
            reqId = "req_" + std::to_string(now);
        }
        req->attributes()->set("request_id", reqId);
    });

    // 3. Centralized Post-Handling Advice: CORS, Security Headers, Request ID & Structured Logging
    drogon::app().registerPostHandlingAdvice([](const drogon::HttpRequestPtr &req, const drogon::HttpResponsePtr &resp) {
        std::string reqId = req->attributes()->get("request_id");
        if (reqId.empty()) reqId = req->getHeader("X-Request-Id");
        if (!reqId.empty()) {
            resp->addHeader("X-Request-Id", reqId);
        }

        // CORS: only an allowlisted Origin gets CORS headers. Requests without an Origin header
        // (same-origin pages, curl, health checks) need none.
        resp->addHeader("Vary", "Origin");
        const std::string origin = req->getHeader("Origin");
        if (isAllowedOrigin(origin)) {
            resp->addHeader("Access-Control-Allow-Origin", origin);
            resp->addHeader("Access-Control-Allow-Credentials", "true");
            resp->addHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD");
            resp->addHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, X-Request-Id, X-CSRF-Token, X-XSRF-Token, Accept, Origin");
            resp->addHeader("Access-Control-Expose-Headers", "X-Request-Id");
        }
        resp->addHeader("X-Content-Type-Options", "nosniff");

        // Structured JSON Logging
        auto durationMs = std::chrono::duration<double, std::milli>(
            std::chrono::system_clock::now() - req->startTime_
        ).count();

        std::string methodStr = "GET";
        if (req->method() == drogon::Post) methodStr = "POST";
        else if (req->method() == drogon::Put) methodStr = "PUT";
        else if (req->method() == drogon::Delete) methodStr = "DELETE";
        else if (req->method() == drogon::Options) methodStr = "OPTIONS";
        else if (req->method() == drogon::Patch) methodStr = "PATCH";
        else if (req->method() == drogon::Head) methodStr = "HEAD";

        std::cout << "{\"timestamp\":\"" << trantor::Date::now().toFormattedString(false) << "\""
                  << ",\"level\":\"INFO\""
                  << ",\"request_id\":\"" << jsonEscapeForLog(reqId) << "\""
                  << ",\"method\":\"" << methodStr << "\""
                  << ",\"path\":\"" << jsonEscapeForLog(req->path()) << "\""
                  << ",\"status\":" << static_cast<int>(resp->statusCode())
                  << ",\"duration_ms\":" << std::fixed << std::setprecision(2) << durationMs
                  << ",\"ip\":\"" << jsonEscapeForLog(Security::resolveClientIp(req->peerAddr().toIp(), req->getHeader("X-Real-IP"), req->getHeader("X-Forwarded-For"))) << "\"}"
                  << std::endl;
    });

    // 4. Centralized Error Handling: JSON 404 Handler
    drogon::app().setCustom404Page([](const drogon::HttpRequestPtr &req, std::function<void(const drogon::HttpResponsePtr &)> &&callback) {
        std::string reqId = req->attributes()->get("request_id");
        if (reqId.empty()) reqId = req->getHeader("X-Request-Id");

        Json::Value err;
        err["error"] = "Endpoint not found";
        err["code"] = "NOT_FOUND";
        err["path"] = req->path();
        if (!reqId.empty()) err["request_id"] = reqId;

        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k404NotFound);
        callback(resp);
    });

    std::cout << "[MarsNova] Drogon Server listening on http://0.0.0.0:8080" << std::endl;
    drogon::app().run();
    return 0;
}
