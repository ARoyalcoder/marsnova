#pragma once
#include <drogon/HttpController.h>
#include <string>
#include <memory>
#include <vector>
#include <unordered_map>
#include <mutex>

class RecoveryController : public drogon::HttpController<RecoveryController> {
public:
    METHOD_LIST_BEGIN
    // Public routes
    ADD_METHOD_TO(RecoveryController::createCase, "/api/v1/recovery/intake", drogon::Post, drogon::Options);
    ADD_METHOD_TO(RecoveryController::trackCase, "/api/v1/recovery/track/:caseId", drogon::Get, drogon::Options);
    ADD_METHOD_TO(RecoveryController::trackCase, "/api/v1/recovery/:caseId", drogon::Get, drogon::Options);

    METHOD_LIST_END

    // Public methods
    void createCase(const drogon::HttpRequestPtr &req,
                    std::function<void(const drogon::HttpResponsePtr &)> &&callback);
    void trackCase(const drogon::HttpRequestPtr &req,
                   std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                   const std::string &caseId);

    static void resetSeedStore();
};
