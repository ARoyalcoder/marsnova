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

    // Protected Admin routes
    ADD_METHOD_TO(RecoveryController::listCasesAdmin, "/api/v1/admin/recovery/cases", drogon::Get, drogon::Options);
    ADD_METHOD_TO(RecoveryController::getCaseAdmin, "/api/v1/admin/recovery/cases/:id", drogon::Get, drogon::Options);
    ADD_METHOD_TO(RecoveryController::confirmPhysicalReceipt, "/api/v1/admin/recovery/cases/:id/physical-receipt", drogon::Post, drogon::Options);
    ADD_METHOD_TO(RecoveryController::recordDiagnosis, "/api/v1/admin/recovery/cases/:id/diagnosis", drogon::Post, drogon::Options);
    ADD_METHOD_TO(RecoveryController::issueQuotation, "/api/v1/admin/recovery/cases/:id/quotation", drogon::Post, drogon::Options);
    ADD_METHOD_TO(RecoveryController::decideQuotation, "/api/v1/admin/recovery/cases/:id/quotation-decision", drogon::Post, drogon::Options);
    ADD_METHOD_TO(RecoveryController::transitionStatus, "/api/v1/admin/recovery/cases/:id/transition", drogon::Post, drogon::Options);
    ADD_METHOD_TO(RecoveryController::transferCustody, "/api/v1/admin/recovery/cases/:id/custody", drogon::Post, drogon::Options);
    ADD_METHOD_TO(RecoveryController::returnDevice, "/api/v1/admin/recovery/cases/:id/return", drogon::Post, drogon::Options);
    METHOD_LIST_END

    // Public methods
    void createCase(const drogon::HttpRequestPtr &req,
                    std::function<void(const drogon::HttpResponsePtr &)> &&callback);
    void trackCase(const drogon::HttpRequestPtr &req,
                   std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                   const std::string &caseId);

    // Protected Admin methods
    void listCasesAdmin(const drogon::HttpRequestPtr &req,
                        std::function<void(const drogon::HttpResponsePtr &)> &&callback);
    void getCaseAdmin(const drogon::HttpRequestPtr &req,
                      std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                      const std::string &id);
    void confirmPhysicalReceipt(const drogon::HttpRequestPtr &req,
                                std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                                const std::string &id);
    void recordDiagnosis(const drogon::HttpRequestPtr &req,
                         std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                         const std::string &id);
    void issueQuotation(const drogon::HttpRequestPtr &req,
                        std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                        const std::string &id);
    void decideQuotation(const drogon::HttpRequestPtr &req,
                         std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                         const std::string &id);
    void transitionStatus(const drogon::HttpRequestPtr &req,
                          std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                          const std::string &id);
    void transferCustody(const drogon::HttpRequestPtr &req,
                         std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                         const std::string &id);
    void returnDevice(const drogon::HttpRequestPtr &req,
                      std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                      const std::string &id);

    static void resetSeedStore();
};
