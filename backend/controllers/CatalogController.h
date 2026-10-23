#pragma once
#include <drogon/HttpController.h>
#include <string>

class CatalogController : public drogon::HttpController<CatalogController> {
public:
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(CatalogController::getServices, "/api/v1/services", drogon::Get, drogon::Options);
    ADD_METHOD_TO(CatalogController::getServiceBySlug, "/api/v1/services/:slug", drogon::Get, drogon::Options);
    ADD_METHOD_TO(CatalogController::getPortfolio, "/api/v1/portfolio", drogon::Get, drogon::Options);
    ADD_METHOD_TO(CatalogController::getCourses, "/api/v1/courses", drogon::Get, drogon::Options);
    ADD_METHOD_TO(CatalogController::getCourseBySlug, "/api/v1/courses/:slug", drogon::Get, drogon::Options);
    METHOD_LIST_END

    void getServices(const drogon::HttpRequestPtr &req,
                     std::function<void(const drogon::HttpResponsePtr &)> &&callback);

    void getServiceBySlug(const drogon::HttpRequestPtr &req,
                          std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                          const std::string &slug);

    void getPortfolio(const drogon::HttpRequestPtr &req,
                      std::function<void(const drogon::HttpResponsePtr &)> &&callback);

    void getCourses(const drogon::HttpRequestPtr &req,
                    std::function<void(const drogon::HttpResponsePtr &)> &&callback);

    void getCourseBySlug(const drogon::HttpRequestPtr &req,
                         std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                         const std::string &slug);
};
