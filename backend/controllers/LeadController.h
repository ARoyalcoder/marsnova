#pragma once
#include <drogon/HttpController.h>
#include <string>
#include <vector>

class LeadController : public drogon::HttpController<LeadController> {
public:
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(LeadController::createLead, "/api/v1/leads", drogon::Post, drogon::Options);
    ADD_METHOD_TO(LeadController::listLeads, "/api/v1/leads", drogon::Get, drogon::Options);
    ADD_METHOD_TO(LeadController::getLeadDetails, "/api/v1/leads/:id", drogon::Get, drogon::Options);
    ADD_METHOD_TO(LeadController::addLeadNote, "/api/v1/leads/:id/notes", drogon::Post, drogon::Options);
    ADD_METHOD_TO(LeadController::updateLeadStatus, "/api/v1/leads/:id/status", drogon::Patch, drogon::Put, drogon::Options);
    METHOD_LIST_END

    void createLead(const drogon::HttpRequestPtr &req,
                    std::function<void(const drogon::HttpResponsePtr &)> &&callback);

    void listLeads(const drogon::HttpRequestPtr &req,
                   std::function<void(const drogon::HttpResponsePtr &)> &&callback);

    void getLeadDetails(const drogon::HttpRequestPtr &req,
                        std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                        const std::string &leadId);

    void addLeadNote(const drogon::HttpRequestPtr &req,
                     std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                     const std::string &leadId);

    void updateLeadStatus(const drogon::HttpRequestPtr &req,
                          std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                          const std::string &leadId);

    // Diagnostics, testing, and seeding helpers
    static void resetRateLimits();
    static void clearDuplicates();
    static void resetStore();
    static void seedLead(const std::string &id,
                         const std::string &name,
                         const std::string &email,
                         const std::string &phone,
                         const std::string &service,
                         const std::string &status,
                         int version = 1,
                         const std::string &notes = "");
};
