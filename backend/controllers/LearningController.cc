#include "LearningController.h"
#include "../utils/Security.h"
#include <mutex>
#include <unordered_map>
#include <vector>
#include <chrono>
#include <iomanip>
#include <sstream>
#include <algorithm>
#include <regex>

namespace marsnova {

namespace {

struct InternalStudent {
    std::string id;
    std::string email;
    std::string fullName;
    std::string passwordHash;
    std::string passwordSalt;
    std::string status{"active"}; // active, suspended, pending_verification
    std::string avatarUrl;
    std::string createdAt;
};

struct InternalStudentSession {
    std::string id;
    std::string studentId;
    std::string sessionToken;
    std::string csrfToken;
    std::chrono::system_clock::time_point expiresAt;
    std::string createdAt;
};

struct InternalEnrolment {
    std::string id;
    std::string studentId;
    std::string courseSlug;
    std::string status{"active"}; // active, completed, dropped, suspended
    std::string enrolledAt;
    std::string completedAt;
};

struct InternalLessonProgress {
    std::string id;
    std::string studentId;
    std::string lessonId;
    std::string courseSlug;
    bool isCompleted{false};
    int lastPositionSeconds{0};
    std::string completedAt;
    std::string updatedAt;
};

struct InternalLesson {
    std::string id;
    std::string courseSlug;
    std::string moduleTitle;
    std::string title;
    int lessonOrder{1};
    std::string contentMarkdown;
    std::string videoUrl;
    int durationMinutes{0};
    bool isFreePreview{false};
};

static std::recursive_mutex s_labMutex;
static std::unordered_map<std::string, InternalStudent> s_studentsById;
static std::unordered_map<std::string, std::string> s_studentsEmailToId;
static std::unordered_map<std::string, InternalStudentSession> s_studentSessionsByToken;
static std::vector<InternalEnrolment> s_enrolments;
static std::vector<InternalLessonProgress> s_progressRecords;
static std::unordered_map<std::string, InternalLesson> s_lessonsById;
static std::unordered_map<std::string, std::vector<std::string>> s_courseToLessons;
static bool s_labSeeded = false;

static std::string getIsoTimestamp() {
    auto now = std::chrono::system_clock::now();
    auto tt = std::chrono::system_clock::to_time_t(now);
    std::tm tm{};
#if defined(_WIN32)
    gmtime_s(&tm, &tt);
#else
    gmtime_r(&tt, &tm);
#endif
    std::ostringstream ss;
    ss << std::put_time(&tm, "%Y-%m-%dT%H:%M:%SZ");
    return ss.str();
}

static bool isValidEmail(const std::string &email) {
    const std::regex pattern(R"((\w+)(\.{1}\w+)*@(\w+)(\.{1}\w+)+)");
    return std::regex_match(email, pattern);
}

static void ensureLabCatalogSeeded() {
    if (s_labSeeded) return;
    s_labSeeded = true;

    // Seed Lessons for Course: advanced-video-production
    InternalLesson l1;
    l1.id = "les-avp-01";
    l1.courseSlug = "advanced-video-production";
    l1.moduleTitle = "Module 1: Production Pipeline";
    l1.title = "Studio Workflow & Equipment Selection";
    l1.lessonOrder = 1;
    l1.contentMarkdown = "# Introduction to Advanced Video Production\nOverview of camera packages, lighting grids, and sound stages.";
    l1.videoUrl = "https://cdn.marsnova.in/lab/preview-avp-01.mp4";
    l1.durationMinutes = 15;
    l1.isFreePreview = true;
    s_lessonsById[l1.id] = l1;
    s_courseToLessons[l1.courseSlug].push_back(l1.id);

    InternalLesson l2;
    l2.id = "les-avp-02";
    l2.courseSlug = "advanced-video-production";
    l2.moduleTitle = "Module 1: Production Pipeline";
    l2.title = "4K RAW Ingestion and Proxy Generation";
    l2.lessonOrder = 2;
    l2.contentMarkdown = "# 4K Ingestion & Color Management\nMastering ACEScc and high-bandwidth proxy offline workflows.";
    l2.videoUrl = "https://cdn.marsnova.in/lab/enrolled-avp-02.mp4";
    l2.durationMinutes = 45;
    l2.isFreePreview = false;
    s_lessonsById[l2.id] = l2;
    s_courseToLessons[l2.courseSlug].push_back(l2.id);

    InternalLesson l3;
    l3.id = "les-avp-03";
    l3.courseSlug = "advanced-video-production";
    l3.moduleTitle = "Module 2: Post-Production";
    l3.title = "High-End Motion Graphics & Sound Mastering";
    l3.lessonOrder = 3;
    l3.contentMarkdown = "# Advanced Motion Graphics\nKinetic typography and multi-track audio mastering.";
    l3.videoUrl = "https://cdn.marsnova.in/lab/enrolled-avp-03.mp4";
    l3.durationMinutes = 60;
    l3.isFreePreview = false;
    s_lessonsById[l3.id] = l3;
    s_courseToLessons[l3.courseSlug].push_back(l3.id);

    // Seed Lessons for Course: ai-powered-creative-editing
    InternalLesson l4;
    l4.id = "les-ai-01";
    l4.courseSlug = "ai-powered-creative-editing";
    l4.moduleTitle = "Module 1: AI Toolchain";
    l4.title = "Overview of Generative Media & Scripting";
    l4.lessonOrder = 1;
    l4.contentMarkdown = "# Generative AI for Editors\nAutomating speech isolation and transcript-based rough cuts.";
    l4.videoUrl = "https://cdn.marsnova.in/lab/preview-ai-01.mp4";
    l4.durationMinutes = 20;
    l4.isFreePreview = true;
    s_lessonsById[l4.id] = l4;
    s_courseToLessons[l4.courseSlug].push_back(l4.id);

    InternalLesson l5;
    l5.id = "les-ai-02";
    l5.courseSlug = "ai-powered-creative-editing";
    l5.moduleTitle = "Module 1: AI Toolchain";
    l5.title = "Neural Video Upscaling & Frame Interpolation";
    l5.lessonOrder = 2;
    l5.contentMarkdown = "# Neural Upscaling Deep Dive\nRestoring legacy archival footage with tensor models.";
    l5.videoUrl = "https://cdn.marsnova.in/lab/enrolled-ai-02.mp4";
    l5.durationMinutes = 40;
    l5.isFreePreview = false;
    s_lessonsById[l5.id] = l5;
    s_courseToLessons[l5.courseSlug].push_back(l5.id);
}

static std::string extractCookie(const drogon::HttpRequestPtr &req, const std::string &name) {
    std::string cookieHeader = req->getHeader("Cookie");
    if (cookieHeader.empty()) return "";

    std::string needle = name + "=";
    size_t start = cookieHeader.find(needle);
    if (start == std::string::npos) return "";

    start += needle.length();
    size_t end = cookieHeader.find(';', start);
    if (end == std::string::npos) {
        return cookieHeader.substr(start);
    }
    return cookieHeader.substr(start, end - start);
}

} // namespace

void LearningController::resetStore() {
    std::lock_guard<std::recursive_mutex> lock(s_labMutex);
    s_studentsById.clear();
    s_studentsEmailToId.clear();
    s_studentSessionsByToken.clear();
    s_enrolments.clear();
    s_progressRecords.clear();
    s_lessonsById.clear();
    s_courseToLessons.clear();
    s_labSeeded = false;
}

void LearningController::seedStudent(const std::string &id, const std::string &email, const std::string &name, const std::string &password, const std::string &status) {
    std::lock_guard<std::recursive_mutex> lock(s_labMutex);
    ensureLabCatalogSeeded();

    std::string salt = Security::randomHex(16);
    std::string hash = Security::sha256(password + ":" + salt);

    InternalStudent s;
    s.id = id;
    s.email = email;
    s.fullName = name;
    s.passwordSalt = salt;
    s.passwordHash = hash;
    s.status = status;
    s.createdAt = getIsoTimestamp();

    s_studentsById[id] = s;
    s_studentsEmailToId[email] = id;
}

StudentSessionAuth LearningController::verifyStudentSession(const drogon::HttpRequestPtr &req) {
    StudentSessionAuth auth;

    // Prevent staff session tokens from masquerading as student tokens
    std::string staffCookie = extractCookie(req, "marsnova_session");
    std::string studentCookie = extractCookie(req, "marsnova_student_session");

    if (studentCookie.empty()) {
        auth.authenticated = false;
        auth.errorCode = "UNAUTHORIZED_STUDENT_SESSION";
        auth.errorMessage = "Student authentication required. Please log in to your MarsNova Lab account.";
        auth.statusCode = drogon::k401Unauthorized;
        return auth;
    }

    std::lock_guard<std::recursive_mutex> lock(s_labMutex);
    ensureLabCatalogSeeded();

    auto it = s_studentSessionsByToken.find(studentCookie);
    if (it == s_studentSessionsByToken.end()) {
        auth.authenticated = false;
        auth.errorCode = "INVALID_STUDENT_SESSION";
        auth.errorMessage = "Session invalid or expired. Please re-authenticate.";
        auth.statusCode = drogon::k401Unauthorized;
        return auth;
    }

    if (std::chrono::system_clock::now() > it->second.expiresAt) {
        auth.authenticated = false;
        auth.errorCode = "STUDENT_SESSION_EXPIRED";
        auth.errorMessage = "Student session expired. Please log in again.";
        auth.statusCode = drogon::k401Unauthorized;
        return auth;
    }

    auto sIt = s_studentsById.find(it->second.studentId);
    if (sIt == s_studentsById.end()) {
        auth.authenticated = false;
        auth.errorCode = "STUDENT_NOT_FOUND";
        auth.errorMessage = "Associated student account could not be found.";
        auth.statusCode = drogon::k401Unauthorized;
        return auth;
    }

    if (sIt->second.status == "suspended") {
        auth.authenticated = false;
        auth.errorCode = "STUDENT_ACCOUNT_SUSPENDED";
        auth.errorMessage = "Your MarsNova Lab student account is currently suspended. Please contact lab support.";
        auth.statusCode = drogon::k403Forbidden;
        return auth;
    }

    auth.authenticated = true;
    auth.studentId = sIt->second.id;
    auth.email = sIt->second.email;
    auth.fullName = sIt->second.fullName;
    auth.role = "student";
    auth.csrfToken = it->second.csrfToken;
    return auth;
}

// -----------------------------------------------------------------------------
// POST /api/v1/lab/auth/register (Student Account Registration)
// -----------------------------------------------------------------------------
void LearningController::registerStudent(const drogon::HttpRequestPtr &req,
                                         std::function<void(const drogon::HttpResponsePtr &)> &&callback) {
    if (req->method() == drogon::Options) {
        callback(drogon::HttpResponse::newHttpResponse());
        return;
    }

    auto jsonPtr = req->jsonObject();
    if (!jsonPtr) {
        Json::Value err;
        err["error"] = "Invalid JSON payload";
        err["code"] = "BAD_REQUEST";
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    std::string email = jsonPtr->get("email", "").asString();
    std::string password = jsonPtr->get("password", "").asString();
    std::string fullName = jsonPtr->get("full_name", "").asString();

    std::transform(email.begin(), email.end(), email.begin(), ::tolower);

    if (!isValidEmail(email)) {
        Json::Value err;
        err["error"] = "A valid email address is required for student registration";
        err["code"] = "INVALID_EMAIL";
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    if (password.length() < 8) {
        Json::Value err;
        err["error"] = "Password must be at least 8 characters long";
        err["code"] = "WEAK_PASSWORD";
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    if (fullName.length() < 2) {
        Json::Value err;
        err["error"] = "Full name must be at least 2 characters long";
        err["code"] = "VALIDATION_FAILED";
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    std::lock_guard<std::recursive_mutex> lock(s_labMutex);
    ensureLabCatalogSeeded();

    if (s_studentsEmailToId.find(email) != s_studentsEmailToId.end()) {
        Json::Value err;
        err["error"] = "A student account with this email address already exists";
        err["code"] = "STUDENT_ALREADY_EXISTS";
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k409Conflict);
        callback(resp);
        return;
    }

    std::string studentId = "std-" + Security::randomHex(8);
    std::string salt = Security::randomHex(16);
    std::string hash = Security::sha256(password + ":" + salt);

    InternalStudent s;
    s.id = studentId;
    s.email = email;
    s.fullName = fullName;
    s.passwordSalt = salt;
    s.passwordHash = hash;
    s.status = "active";
    s.createdAt = getIsoTimestamp();

    s_studentsById[studentId] = s;
    s_studentsEmailToId[email] = studentId;

    // Create immediate active session
    std::string sessionToken = Security::randomHex(32);
    std::string csrfToken = Security::randomHex(16);

    InternalStudentSession sess;
    sess.id = "sess-" + Security::randomHex(8);
    sess.studentId = studentId;
    sess.sessionToken = sessionToken;
    sess.csrfToken = csrfToken;
    sess.expiresAt = std::chrono::system_clock::now() + std::chrono::hours(48);
    sess.createdAt = s.createdAt;
    s_studentSessionsByToken[sessionToken] = sess;

    Json::Value res;
    res["status"] = "ok";
    res["message"] = "Student account registered successfully";
    res["student"]["id"] = s.id;
    res["student"]["email"] = s.email;
    res["student"]["full_name"] = s.fullName;
    res["student"]["role"] = "student";
    res["csrf_token"] = csrfToken;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    resp->setStatusCode(drogon::k201Created);
    resp->addHeader("Set-Cookie", "marsnova_student_session=" + sessionToken + "; Path=/; HttpOnly; SameSite=Strict");
    callback(resp);
}

// -----------------------------------------------------------------------------
// POST /api/v1/lab/auth/login (Student Login)
// -----------------------------------------------------------------------------
void LearningController::loginStudent(const drogon::HttpRequestPtr &req,
                                      std::function<void(const drogon::HttpResponsePtr &)> &&callback) {
    if (req->method() == drogon::Options) {
        callback(drogon::HttpResponse::newHttpResponse());
        return;
    }

    auto jsonPtr = req->jsonObject();
    if (!jsonPtr) {
        Json::Value err;
        err["error"] = "Invalid JSON payload";
        err["code"] = "BAD_REQUEST";
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    std::string email = jsonPtr->get("email", "").asString();
    std::string password = jsonPtr->get("password", "").asString();
    std::transform(email.begin(), email.end(), email.begin(), ::tolower);

    std::lock_guard<std::recursive_mutex> lock(s_labMutex);
    ensureLabCatalogSeeded();

    auto itEmail = s_studentsEmailToId.find(email);
    if (itEmail == s_studentsEmailToId.end()) {
        Json::Value err;
        err["error"] = "Invalid email or password";
        err["code"] = "INVALID_CREDENTIALS";
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k401Unauthorized);
        callback(resp);
        return;
    }

    const auto &s = s_studentsById[itEmail->second];
    std::string computedHash = Security::sha256(password + ":" + s.passwordSalt);

    if (!Security::constantTimeEquals(computedHash, s.passwordHash)) {
        Json::Value err;
        err["error"] = "Invalid email or password";
        err["code"] = "INVALID_CREDENTIALS";
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k401Unauthorized);
        callback(resp);
        return;
    }

    if (s.status == "suspended") {
        Json::Value err;
        err["error"] = "Student account is suspended. Access denied.";
        err["code"] = "STUDENT_ACCOUNT_SUSPENDED";
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k403Forbidden);
        callback(resp);
        return;
    }

    std::string sessionToken = Security::randomHex(32);
    std::string csrfToken = Security::randomHex(16);

    InternalStudentSession sess;
    sess.id = "sess-" + Security::randomHex(8);
    sess.studentId = s.id;
    sess.sessionToken = sessionToken;
    sess.csrfToken = csrfToken;
    sess.expiresAt = std::chrono::system_clock::now() + std::chrono::hours(48);
    sess.createdAt = getIsoTimestamp();
    s_studentSessionsByToken[sessionToken] = sess;

    Json::Value res;
    res["status"] = "ok";
    res["message"] = "Login successful";
    res["student"]["id"] = s.id;
    res["student"]["email"] = s.email;
    res["student"]["full_name"] = s.fullName;
    res["student"]["role"] = "student";
    res["csrf_token"] = csrfToken;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    resp->setStatusCode(drogon::k200OK);
    resp->addHeader("Set-Cookie", "marsnova_student_session=" + sessionToken + "; Path=/; HttpOnly; SameSite=Strict");
    callback(resp);
}

// -----------------------------------------------------------------------------
// POST /api/v1/lab/auth/logout (Student Logout)
// -----------------------------------------------------------------------------
void LearningController::logoutStudent(const drogon::HttpRequestPtr &req,
                                       std::function<void(const drogon::HttpResponsePtr &)> &&callback) {
    if (req->method() == drogon::Options) {
        callback(drogon::HttpResponse::newHttpResponse());
        return;
    }

    std::string studentCookie = extractCookie(req, "marsnova_student_session");
    if (!studentCookie.empty()) {
        std::lock_guard<std::recursive_mutex> lock(s_labMutex);
        s_studentSessionsByToken.erase(studentCookie);
    }

    Json::Value res;
    res["status"] = "ok";
    res["message"] = "Logged out successfully";

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    resp->addHeader("Set-Cookie", "marsnova_student_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0");
    callback(resp);
}

// -----------------------------------------------------------------------------
// GET /api/v1/lab/auth/me (Student Profile)
// -----------------------------------------------------------------------------
void LearningController::getStudentProfile(const drogon::HttpRequestPtr &req,
                                          std::function<void(const drogon::HttpResponsePtr &)> &&callback) {
    auto auth = verifyStudentSession(req);
    if (!auth.authenticated) {
        Json::Value err;
        err["error"] = auth.errorMessage;
        err["code"] = auth.errorCode;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(auth.statusCode);
        callback(resp);
        return;
    }

    Json::Value res;
    res["status"] = "ok";
    res["student"]["id"] = auth.studentId;
    res["student"]["email"] = auth.email;
    res["student"]["full_name"] = auth.fullName;
    res["student"]["role"] = "student";

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    resp->setStatusCode(drogon::k200OK);
    callback(resp);
}

// -----------------------------------------------------------------------------
// POST /api/v1/lab/courses/:slug/enroll (Enrol in Course with Strict Rules)
// -----------------------------------------------------------------------------
void LearningController::enrollInCourse(const drogon::HttpRequestPtr &req,
                                        std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                                        const std::string &slug) {
    if (req->method() == drogon::Options) {
        callback(drogon::HttpResponse::newHttpResponse());
        return;
    }

    auto auth = verifyStudentSession(req);
    if (!auth.authenticated) {
        Json::Value err;
        err["error"] = auth.errorMessage;
        err["code"] = auth.errorCode;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(auth.statusCode);
        callback(resp);
        return;
    }

    std::lock_guard<std::recursive_mutex> lock(s_labMutex);
    ensureLabCatalogSeeded();

    if (s_courseToLessons.find(slug) == s_courseToLessons.end()) {
        Json::Value err;
        err["error"] = "Course not found: " + slug;
        err["code"] = "COURSE_NOT_FOUND";
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k404NotFound);
        callback(resp);
        return;
    }

    // Check duplicate enrolment
    for (const auto &enr : s_enrolments) {
        if (enr.studentId == auth.studentId && enr.courseSlug == slug && enr.status == "active") {
            Json::Value err;
            err["error"] = "Student is already actively enrolled in this course";
            err["code"] = "ALREADY_ENROLLED";
            auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
            resp->setStatusCode(drogon::k409Conflict);
            callback(resp);
            return;
        }
    }

    // Create verified enrolment (No payment gateway: direct MarsNova Lab studio enrolment)
    InternalEnrolment enr;
    enr.id = "enr-" + Security::randomHex(8);
    enr.studentId = auth.studentId;
    enr.courseSlug = slug;
    enr.status = "active";
    enr.enrolledAt = getIsoTimestamp();
    s_enrolments.push_back(enr);

    Json::Value res;
    res["status"] = "ok";
    res["message"] = "Enrolled successfully in " + slug;
    res["enrolment"]["id"] = enr.id;
    res["enrolment"]["student_id"] = enr.studentId;
    res["enrolment"]["course_slug"] = enr.courseSlug;
    res["enrolment"]["status"] = enr.status;
    res["enrolment"]["enrolled_at"] = enr.enrolledAt;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    resp->setStatusCode(drogon::k201Created);
    callback(resp);
}

// -----------------------------------------------------------------------------
// GET /api/v1/lab/my-enrolments (Cross-Student Data Isolation & Progress)
// -----------------------------------------------------------------------------
void LearningController::getMyEnrolments(const drogon::HttpRequestPtr &req,
                                        std::function<void(const drogon::HttpResponsePtr &)> &&callback) {
    auto auth = verifyStudentSession(req);
    if (!auth.authenticated) {
        Json::Value err;
        err["error"] = auth.errorMessage;
        err["code"] = auth.errorCode;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(auth.statusCode);
        callback(resp);
        return;
    }

    std::lock_guard<std::recursive_mutex> lock(s_labMutex);
    ensureLabCatalogSeeded();

    Json::Value list(Json::arrayValue);

    // Strictly filter by auth.studentId (enforcing cross-student data isolation)
    for (const auto &enr : s_enrolments) {
        if (enr.studentId != auth.studentId) {
            continue; // STRICT ISOLATION
        }

        Json::Value item;
        item["id"] = enr.id;
        item["course_slug"] = enr.courseSlug;
        item["status"] = enr.status;
        item["enrolled_at"] = enr.enrolledAt;

        // Calculate progress percentage
        int totalLessons = static_cast<int>(s_courseToLessons[enr.courseSlug].size());
        int completedCount = 0;

        for (const auto &prog : s_progressRecords) {
            if (prog.studentId == auth.studentId && prog.courseSlug == enr.courseSlug && prog.isCompleted) {
                completedCount++;
            }
        }

        item["total_lessons"] = totalLessons;
        item["completed_lessons"] = completedCount;
        item["progress_percentage"] = (totalLessons > 0) ? (completedCount * 100 / totalLessons) : 0;

        list.append(item);
    }

    Json::Value res;
    res["status"] = "ok";
    res["student_id"] = auth.studentId;
    res["data"] = list;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    resp->setStatusCode(drogon::k200OK);
    callback(resp);
}

// -----------------------------------------------------------------------------
// GET /api/v1/lab/courses/:slug/lessons/:lessonId (Curriculum Delivery & Gating)
// -----------------------------------------------------------------------------
void LearningController::getLessonContent(const drogon::HttpRequestPtr &req,
                                         std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                                         const std::string &slug,
                                         const std::string &lessonId) {
    std::lock_guard<std::recursive_mutex> lock(s_labMutex);
    ensureLabCatalogSeeded();

    auto it = s_lessonsById.find(lessonId);
    if (it == s_lessonsById.end() || it->second.courseSlug != slug) {
        Json::Value err;
        err["error"] = "Lesson not found in course: " + slug;
        err["code"] = "LESSON_NOT_FOUND";
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k404NotFound);
        callback(resp);
        return;
    }

    const auto &lesson = it->second;

    // Check if free preview
    if (!lesson.isFreePreview) {
        // Enforce enrolment verification
        auto auth = verifyStudentSession(req);
        if (!auth.authenticated) {
            Json::Value err;
            err["error"] = "Enrolment required to access full lesson curriculum and video master.";
            err["code"] = "ENROLMENT_REQUIRED";
            auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
            resp->setStatusCode(drogon::k403Forbidden);
            callback(resp);
            return;
        }

        // Verify that student is actively enrolled in this specific course
        bool isEnrolled = false;
        for (const auto &enr : s_enrolments) {
            if (enr.studentId == auth.studentId && enr.courseSlug == slug && enr.status == "active") {
                isEnrolled = true;
                break;
            }
        }

        if (!isEnrolled) {
            Json::Value err;
            err["error"] = "You must be enrolled in '" + slug + "' to view this lesson.";
            err["code"] = "ENROLMENT_REQUIRED";
            auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
            resp->setStatusCode(drogon::k403Forbidden);
            callback(resp);
            return;
        }
    }

    Json::Value res;
    res["status"] = "ok";
    res["data"]["id"] = lesson.id;
    res["data"]["course_slug"] = lesson.courseSlug;
    res["data"]["module_title"] = lesson.moduleTitle;
    res["data"]["title"] = lesson.title;
    res["data"]["lesson_order"] = lesson.lessonOrder;
    res["data"]["duration_minutes"] = lesson.durationMinutes;
    res["data"]["is_free_preview"] = lesson.isFreePreview;
    res["data"]["content_markdown"] = lesson.contentMarkdown;
    res["data"]["video_url"] = lesson.videoUrl;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    resp->setStatusCode(drogon::k200OK);
    callback(resp);
}

// -----------------------------------------------------------------------------
// POST /api/v1/lab/lessons/:lessonId/progress (Progress Tracking & Ownership)
// -----------------------------------------------------------------------------
void LearningController::updateLessonProgress(const drogon::HttpRequestPtr &req,
                                             std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                                             const std::string &lessonId) {
    if (req->method() == drogon::Options) {
        callback(drogon::HttpResponse::newHttpResponse());
        return;
    }

    // Ownership enforced: student ID is derived strictly from verified session
    auto auth = verifyStudentSession(req);
    if (!auth.authenticated) {
        Json::Value err;
        err["error"] = auth.errorMessage;
        err["code"] = auth.errorCode;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(auth.statusCode);
        callback(resp);
        return;
    }

    auto jsonPtr = req->jsonObject();
    bool completed = jsonPtr ? jsonPtr->get("completed", true).asBool() : true;
    int positionSeconds = jsonPtr ? jsonPtr->get("position_seconds", 0).asInt() : 0;

    std::lock_guard<std::recursive_mutex> lock(s_labMutex);
    ensureLabCatalogSeeded();

    auto it = s_lessonsById.find(lessonId);
    if (it == s_lessonsById.end()) {
        Json::Value err;
        err["error"] = "Lesson not found: " + lessonId;
        err["code"] = "LESSON_NOT_FOUND";
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k404NotFound);
        callback(resp);
        return;
    }

    const std::string courseSlug = it->second.courseSlug;

    // Student MUST be actively enrolled in the course to record progress
    bool isEnrolled = false;
    for (const auto &enr : s_enrolments) {
        if (enr.studentId == auth.studentId && enr.courseSlug == courseSlug && enr.status == "active") {
            isEnrolled = true;
            break;
        }
    }

    if (!isEnrolled) {
        Json::Value err;
        err["error"] = "Cannot update progress: student is not enrolled in course '" + courseSlug + "'";
        err["code"] = "NOT_ENROLLED_IN_COURSE";
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k403Forbidden);
        callback(resp);
        return;
    }

    std::string nowStr = getIsoTimestamp();
    bool found = false;

    for (auto &prog : s_progressRecords) {
        // Enforce ownership: only matching studentId AND lessonId
        if (prog.studentId == auth.studentId && prog.lessonId == lessonId) {
            prog.isCompleted = completed;
            prog.lastPositionSeconds = positionSeconds;
            prog.updatedAt = nowStr;
            if (completed && prog.completedAt.empty()) {
                prog.completedAt = nowStr;
            }
            found = true;
            break;
        }
    }

    if (!found) {
        InternalLessonProgress prog;
        prog.id = "prog-" + Security::randomHex(8);
        prog.studentId = auth.studentId;
        prog.lessonId = lessonId;
        prog.courseSlug = courseSlug;
        prog.isCompleted = completed;
        prog.lastPositionSeconds = positionSeconds;
        prog.completedAt = completed ? nowStr : "";
        prog.updatedAt = nowStr;
        s_progressRecords.push_back(prog);
    }

    Json::Value res;
    res["status"] = "ok";
    res["message"] = "Lesson progress recorded successfully";
    res["progress"]["student_id"] = auth.studentId;
    res["progress"]["lesson_id"] = lessonId;
    res["progress"]["completed"] = completed;
    res["progress"]["position_seconds"] = positionSeconds;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    resp->setStatusCode(drogon::k200OK);
    callback(resp);
}

} // namespace marsnova
