#pragma once

#include <drogon/HttpController.h>
#include <string>

namespace marsnova {

struct StudentSessionAuth {
    bool authenticated{false};
    std::string studentId;
    std::string email;
    std::string fullName;
    std::string role{"student"};
    std::string csrfToken;
    std::string errorCode;
    std::string errorMessage;
    drogon::HttpStatusCode statusCode{drogon::k200OK};
};

class LearningController : public drogon::HttpController<LearningController> {
public:
    METHOD_LIST_BEGIN
    // Student Authentication
    ADD_METHOD_TO(LearningController::registerStudent, "/api/v1/lab/auth/register", drogon::Post, drogon::Options);
    ADD_METHOD_TO(LearningController::loginStudent, "/api/v1/lab/auth/login", drogon::Post, drogon::Options);
    ADD_METHOD_TO(LearningController::logoutStudent, "/api/v1/lab/auth/logout", drogon::Post, drogon::Options);
    ADD_METHOD_TO(LearningController::getStudentProfile, "/api/v1/lab/auth/me", drogon::Get, drogon::Options);

    // Course Enrolment & Student Curriculum
    ADD_METHOD_TO(LearningController::enrollInCourse, "/api/v1/lab/courses/{slug}/enroll", drogon::Post, drogon::Options);
    ADD_METHOD_TO(LearningController::getMyEnrolments, "/api/v1/lab/my-enrolments", drogon::Get, drogon::Options);

    // Lesson Access & Progress Tracking
    ADD_METHOD_TO(LearningController::getLessonContent, "/api/v1/lab/courses/{slug}/lessons/{lessonId}", drogon::Get, drogon::Options);
    ADD_METHOD_TO(LearningController::updateLessonProgress, "/api/v1/lab/lessons/{lessonId}/progress", drogon::Post, drogon::Options);
    METHOD_LIST_END

    // Auth verification helper
    static StudentSessionAuth verifyStudentSession(const drogon::HttpRequestPtr &req);

    // Endpoint handlers
    void registerStudent(const drogon::HttpRequestPtr &req,
                         std::function<void(const drogon::HttpResponsePtr &)> &&callback);

    void loginStudent(const drogon::HttpRequestPtr &req,
                      std::function<void(const drogon::HttpResponsePtr &)> &&callback);

    void logoutStudent(const drogon::HttpRequestPtr &req,
                       std::function<void(const drogon::HttpResponsePtr &)> &&callback);

    void getStudentProfile(const drogon::HttpRequestPtr &req,
                           std::function<void(const drogon::HttpResponsePtr &)> &&callback);

    void enrollInCourse(const drogon::HttpRequestPtr &req,
                        std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                        const std::string &slug);

    void getMyEnrolments(const drogon::HttpRequestPtr &req,
                         std::function<void(const drogon::HttpResponsePtr &)> &&callback);

    void getLessonContent(const drogon::HttpRequestPtr &req,
                          std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                          const std::string &slug,
                          const std::string &lessonId);

    void updateLessonProgress(const drogon::HttpRequestPtr &req,
                              std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                              const std::string &lessonId);

    // Test harness helper functions
    static void resetStore();
    static void seedStudent(const std::string &id, const std::string &email, const std::string &name, const std::string &password, const std::string &status = "active");
};

} // namespace marsnova
