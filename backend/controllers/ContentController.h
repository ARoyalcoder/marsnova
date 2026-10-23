#pragma once
#include <drogon/HttpController.h>
#include <string>
#include <memory>
#include <vector>
#include <unordered_map>
#include <mutex>

class ContentController : public drogon::HttpController<ContentController> {
public:
    METHOD_LIST_BEGIN
    // Services Management
    ADD_METHOD_TO(ContentController::listServicesAdmin, "/api/v1/admin/services", drogon::Get, drogon::Options);
    ADD_METHOD_TO(ContentController::createService, "/api/v1/admin/services", drogon::Post, drogon::Options);
    ADD_METHOD_TO(ContentController::updateService, "/api/v1/admin/services/:id", drogon::Put, drogon::Options);
    ADD_METHOD_TO(ContentController::publishService, "/api/v1/admin/services/:id/publish", drogon::Post, drogon::Options);
    ADD_METHOD_TO(ContentController::archiveService, "/api/v1/admin/services/:id/archive", drogon::Post, drogon::Options);
    ADD_METHOD_TO(ContentController::deleteService, "/api/v1/admin/services/:id", drogon::Delete, drogon::Options);

    // Portfolio Management
    ADD_METHOD_TO(ContentController::listPortfolioAdmin, "/api/v1/admin/portfolio", drogon::Get, drogon::Options);
    ADD_METHOD_TO(ContentController::createPortfolio, "/api/v1/admin/portfolio", drogon::Post, drogon::Options);
    ADD_METHOD_TO(ContentController::updatePortfolio, "/api/v1/admin/portfolio/:id", drogon::Put, drogon::Options);
    ADD_METHOD_TO(ContentController::publishPortfolio, "/api/v1/admin/portfolio/:id/publish", drogon::Post, drogon::Options);
    ADD_METHOD_TO(ContentController::archivePortfolio, "/api/v1/admin/portfolio/:id/archive", drogon::Post, drogon::Options);
    ADD_METHOD_TO(ContentController::deletePortfolio, "/api/v1/admin/portfolio/:id", drogon::Delete, drogon::Options);

    // Courses Management
    ADD_METHOD_TO(ContentController::listCoursesAdmin, "/api/v1/admin/courses", drogon::Get, drogon::Options);
    ADD_METHOD_TO(ContentController::createCourse, "/api/v1/admin/courses", drogon::Post, drogon::Options);
    ADD_METHOD_TO(ContentController::updateCourse, "/api/v1/admin/courses/:id", drogon::Put, drogon::Options);
    ADD_METHOD_TO(ContentController::publishCourse, "/api/v1/admin/courses/:id/publish", drogon::Post, drogon::Options);
    ADD_METHOD_TO(ContentController::archiveCourse, "/api/v1/admin/courses/:id/archive", drogon::Post, drogon::Options);
    ADD_METHOD_TO(ContentController::deleteCourse, "/api/v1/admin/courses/:id", drogon::Delete, drogon::Options);

    // Lessons Management & Private Protection
    ADD_METHOD_TO(ContentController::listLessonsAdmin, "/api/v1/admin/courses/:courseId/lessons", drogon::Get, drogon::Options);
    ADD_METHOD_TO(ContentController::createLesson, "/api/v1/admin/courses/:courseId/lessons", drogon::Post, drogon::Options);
    ADD_METHOD_TO(ContentController::updateLesson, "/api/v1/admin/lessons/:id", drogon::Put, drogon::Options);
    ADD_METHOD_TO(ContentController::publishLesson, "/api/v1/admin/lessons/:id/publish", drogon::Post, drogon::Options);
    ADD_METHOD_TO(ContentController::archiveLesson, "/api/v1/admin/lessons/:id/archive", drogon::Post, drogon::Options);
    ADD_METHOD_TO(ContentController::deleteLesson, "/api/v1/admin/lessons/:id", drogon::Delete, drogon::Options);
    ADD_METHOD_TO(ContentController::getPublicLesson, "/api/v1/courses/:courseSlug/lessons/:lessonSlug", drogon::Get, drogon::Options);

    // Media Storage & Upload
    ADD_METHOD_TO(ContentController::uploadMedia, "/api/v1/admin/media/upload", drogon::Post, drogon::Options);
    ADD_METHOD_TO(ContentController::listMediaAdmin, "/api/v1/admin/media", drogon::Get, drogon::Options);
    METHOD_LIST_END

    // Services methods
    void listServicesAdmin(const drogon::HttpRequestPtr &req,
                           std::function<void(const drogon::HttpResponsePtr &)> &&callback);
    void createService(const drogon::HttpRequestPtr &req,
                       std::function<void(const drogon::HttpResponsePtr &)> &&callback);
    void updateService(const drogon::HttpRequestPtr &req,
                       std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                       const std::string &id);
    void publishService(const drogon::HttpRequestPtr &req,
                        std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                        const std::string &id);
    void archiveService(const drogon::HttpRequestPtr &req,
                        std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                        const std::string &id);
    void deleteService(const drogon::HttpRequestPtr &req,
                       std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                       const std::string &id);

    // Portfolio methods
    void listPortfolioAdmin(const drogon::HttpRequestPtr &req,
                            std::function<void(const drogon::HttpResponsePtr &)> &&callback);
    void createPortfolio(const drogon::HttpRequestPtr &req,
                         std::function<void(const drogon::HttpResponsePtr &)> &&callback);
    void updatePortfolio(const drogon::HttpRequestPtr &req,
                         std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                         const std::string &id);
    void publishPortfolio(const drogon::HttpRequestPtr &req,
                          std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                          const std::string &id);
    void archivePortfolio(const drogon::HttpRequestPtr &req,
                          std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                          const std::string &id);
    void deletePortfolio(const drogon::HttpRequestPtr &req,
                         std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                         const std::string &id);

    // Courses methods
    void listCoursesAdmin(const drogon::HttpRequestPtr &req,
                          std::function<void(const drogon::HttpResponsePtr &)> &&callback);
    void createCourse(const drogon::HttpRequestPtr &req,
                      std::function<void(const drogon::HttpResponsePtr &)> &&callback);
    void updateCourse(const drogon::HttpRequestPtr &req,
                      std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                      const std::string &id);
    void publishCourse(const drogon::HttpRequestPtr &req,
                       std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                       const std::string &id);
    void archiveCourse(const drogon::HttpRequestPtr &req,
                       std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                       const std::string &id);
    void deleteCourse(const drogon::HttpRequestPtr &req,
                      std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                      const std::string &id);

    // Lessons methods
    void listLessonsAdmin(const drogon::HttpRequestPtr &req,
                          std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                          const std::string &courseId);
    void createLesson(const drogon::HttpRequestPtr &req,
                      std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                      const std::string &courseId);
    void updateLesson(const drogon::HttpRequestPtr &req,
                      std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                      const std::string &id);
    void publishLesson(const drogon::HttpRequestPtr &req,
                       std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                       const std::string &id);
    void archiveLesson(const drogon::HttpRequestPtr &req,
                       std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                       const std::string &id);
    void deleteLesson(const drogon::HttpRequestPtr &req,
                      std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                      const std::string &id);
    void getPublicLesson(const drogon::HttpRequestPtr &req,
                         std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                         const std::string &courseSlug,
                         const std::string &lessonSlug);

    // Media methods
    void uploadMedia(const drogon::HttpRequestPtr &req,
                     std::function<void(const drogon::HttpResponsePtr &)> &&callback);
    void listMediaAdmin(const drogon::HttpRequestPtr &req,
                        std::function<void(const drogon::HttpResponsePtr &)> &&callback);

    // Public lookup & testing helpers
    static bool isServicePublished(const std::string &slug);
    static bool isPortfolioPublished(const std::string &slug);
    static bool isCoursePublished(const std::string &slug);
    static void resetSeedStore();
};
