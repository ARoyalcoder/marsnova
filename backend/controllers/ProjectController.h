#pragma once
#include <drogon/HttpController.h>
#include <string>
#include <vector>

class ProjectController : public drogon::HttpController<ProjectController> {
public:
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(ProjectController::createProject, "/api/v1/projects", drogon::Post, drogon::Options);
    ADD_METHOD_TO(ProjectController::listProjects, "/api/v1/projects", drogon::Get, drogon::Options);
    ADD_METHOD_TO(ProjectController::getProjectDetails, "/api/v1/projects/:id", drogon::Get, drogon::Options);
    ADD_METHOD_TO(ProjectController::updateProjectStatus, "/api/v1/projects/:id/status", drogon::Post, drogon::Patch, drogon::Put, drogon::Options);
    ADD_METHOD_TO(ProjectController::assignStaff, "/api/v1/projects/:id/assignments", drogon::Post, drogon::Options);
    ADD_METHOD_TO(ProjectController::removeStaff, "/api/v1/projects/:id/assignments/:userId", drogon::Delete, drogon::Options);
    ADD_METHOD_TO(ProjectController::updateDeliverables, "/api/v1/projects/:id/deliverables", drogon::Post, drogon::Put, drogon::Options);
    METHOD_LIST_END

    void createProject(const drogon::HttpRequestPtr &req,
                       std::function<void(const drogon::HttpResponsePtr &)> &&callback);

    void listProjects(const drogon::HttpRequestPtr &req,
                      std::function<void(const drogon::HttpResponsePtr &)> &&callback);

    void getProjectDetails(const drogon::HttpRequestPtr &req,
                          std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                          const std::string &idOrCode);

    void updateProjectStatus(const drogon::HttpRequestPtr &req,
                            std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                            const std::string &idOrCode);

    void assignStaff(const drogon::HttpRequestPtr &req,
                     std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                     const std::string &idOrCode);

    void removeStaff(const drogon::HttpRequestPtr &req,
                     std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                     const std::string &idOrCode,
                     const std::string &userId);

    void updateDeliverables(const drogon::HttpRequestPtr &req,
                            std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                            const std::string &idOrCode);

    // Diagnostics, testing, and seeding helpers
    static void resetStore();
    static void seedProject(const std::string &id,
                            const std::string &projectCode,
                            const std::string &title,
                            const std::string &clientName,
                            const std::string &clientEmail,
                            const std::string &vertical,
                            const std::string &scope,
                            const std::string &status,
                            const std::string &priority,
                            int progressPercentage = 0,
                            const std::string &startDate = "",
                            const std::string &targetDelivery = "",
                            const std::string &leadId = "",
                            const std::string &quotationId = "");
};
