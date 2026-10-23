#pragma once
#include <drogon/HttpController.h>
#include <string>
#include <vector>

class QuotationController : public drogon::HttpController<QuotationController> {
public:
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(QuotationController::createQuotation, "/api/v1/quotations", drogon::Post, drogon::Options);
    ADD_METHOD_TO(QuotationController::listQuotations, "/api/v1/quotations", drogon::Get, drogon::Options);
    ADD_METHOD_TO(QuotationController::getQuotationDetails, "/api/v1/quotations/:id", drogon::Get, drogon::Options);
    ADD_METHOD_TO(QuotationController::updateQuotationStatus, "/api/v1/quotations/:id/status", drogon::Post, drogon::Patch, drogon::Put, drogon::Options);
    ADD_METHOD_TO(QuotationController::createQuotationRevision, "/api/v1/quotations/:id/revisions", drogon::Post, drogon::Options);
    METHOD_LIST_END

    void createQuotation(const drogon::HttpRequestPtr &req,
                         std::function<void(const drogon::HttpResponsePtr &)> &&callback);

    void listQuotations(const drogon::HttpRequestPtr &req,
                        std::function<void(const drogon::HttpResponsePtr &)> &&callback);

    void getQuotationDetails(const drogon::HttpRequestPtr &req,
                            std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                            const std::string &idOrRef);

    void updateQuotationStatus(const drogon::HttpRequestPtr &req,
                              std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                              const std::string &idOrRef);

    void createQuotationRevision(const drogon::HttpRequestPtr &req,
                                std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                                const std::string &idOrRef);

    // Diagnostics, test, and seeding helpers
    static void resetStore();
    static void seedQuotation(const std::string &id,
                              const std::string &reference,
                              const std::string &clientName,
                              const std::string &clientEmail,
                              const std::string &serviceType,
                              const std::string &scope,
                              const std::string &amountStr,
                              const std::string &currency,
                              const std::string &validUntil,
                              const std::string &status,
                              int revisionNumber = 1,
                              const std::string &leadId = "");
};
