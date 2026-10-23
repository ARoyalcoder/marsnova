#pragma once
#include <drogon/HttpController.h>
#include <string>
#include <memory>

class AuthController : public drogon::HttpController<AuthController> {
public:
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(AuthController::login, "/api/v1/auth/login", drogon::Post, drogon::Options);
    ADD_METHOD_TO(AuthController::logout, "/api/v1/auth/logout", drogon::Post, drogon::Options);
    ADD_METHOD_TO(AuthController::getSession, "/api/v1/auth/session", drogon::Get, drogon::Options);
    ADD_METHOD_TO(AuthController::getSession, "/api/v1/auth/me", drogon::Get, drogon::Options);

    // Protected Role-Based Admin Operations
    ADD_METHOD_TO(AuthController::getAdminOverview, "/api/v1/admin/overview", drogon::Get, drogon::Options);
    ADD_METHOD_TO(AuthController::getAdminQuotes, "/api/v1/admin/quotes", drogon::Get, drogon::Options);
    ADD_METHOD_TO(AuthController::createStaffUser, "/api/v1/admin/users", drogon::Post, drogon::Options);
    METHOD_LIST_END

    void login(const drogon::HttpRequestPtr &req,
               std::function<void(const drogon::HttpResponsePtr &)> &&callback);

    void logout(const drogon::HttpRequestPtr &req,
                std::function<void(const drogon::HttpResponsePtr &)> &&callback);

    void getSession(const drogon::HttpRequestPtr &req,
                    std::function<void(const drogon::HttpResponsePtr &)> &&callback);

    // RBAC Endpoints
    void getAdminOverview(const drogon::HttpRequestPtr &req,
                          std::function<void(const drogon::HttpResponsePtr &)> &&callback);

    void getAdminQuotes(const drogon::HttpRequestPtr &req,
                        std::function<void(const drogon::HttpResponsePtr &)> &&callback);

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

    static void seedTestUser(const std::string &email,
                             const std::string &password,
                             const std::string &role,
                             const std::string &status = "active",
                             const std::string &fullName = "Staff User");
    static void clearSessions();
    static void clearUsers();
    static void expireSession(const std::string &sessionId);
};
