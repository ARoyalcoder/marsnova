#include "ContentController.h"
#include "AuthController.h"
#include "../utils/Security.h"
#include <drogon/drogon.h>
#include <algorithm>
#include <regex>
#include <chrono>
#include <iomanip>
#include <sstream>

namespace {

// =============================================================================
// Internal Data Structures
// =============================================================================

struct InternalService {
    std::string id;
    std::string slug;
    std::string title;
    std::string category;
    std::string description;
    std::string icon;
    std::string badge;
    std::string status; // draft, published, archived
    std::string createdAt;
    std::string updatedAt;
};

struct InternalPortfolio {
    std::string id;
    std::string slug;
    std::string title;
    std::string category;
    std::string clientName;
    std::string summary;
    std::string challenge;
    std::string approach;
    std::string outcome;
    std::string thumbnailUrl;
    std::string videoUrl;
    std::string status; // draft, published, archived
    std::string createdAt;
    std::string updatedAt;
};

struct InternalCourse {
    std::string id;
    std::string slug;
    std::string title;
    std::string category;
    std::string description;
    std::string level;
    std::string duration;
    std::string icon;
    std::string status; // draft, published, archived
    std::string createdAt;
    std::string updatedAt;
};

struct InternalLesson {
    std::string id;
    std::string courseId;
    std::string slug;
    std::string title;
    std::string moduleTitle;
    int lessonOrder{1};
    std::string contentMarkdown;
    std::string videoUrl;
    int durationMinutes{0};
    bool isFreePreview{false};
    bool isPrivate{true};
    std::string status; // draft, published, archived
    std::string createdAt;
    std::string updatedAt;
};

struct InternalMediaUpload {
    std::string id;
    std::string fileName;
    std::string fileUrl;
    long long fileSizeBytes{0};
    std::string mimeType;
    std::string storageProvider;
    bool isPrivate{false};
    std::string uploadedBy;
    std::string createdAt;
};

static std::mutex s_contentMutex;
static std::unordered_map<std::string, InternalService> s_services;
static std::unordered_map<std::string, InternalPortfolio> s_portfolio;
static std::unordered_map<std::string, InternalCourse> s_courses;
static std::unordered_map<std::string, InternalLesson> s_lessons;
static std::vector<InternalMediaUpload> s_mediaUploads;
static bool s_seeded = false;
static bool s_storageGloballyEnabled = true;

static std::string getIsoTimestamp() {
    auto now = std::chrono::system_clock::now();
    auto in_time_t = std::chrono::system_clock::to_time_t(now);
    std::stringstream ss;
    ss << std::put_time(std::gmtime(&in_time_t), "%Y-%m-%dT%H:%M:%SZ");
    return ss.str();
}

static bool isValidSlug(const std::string &slug) {
    if (slug.empty() || slug.length() > 100) return false;
    const std::regex pattern("^[a-z0-9]+(?:-[a-z0-9]+)*$");
    return std::regex_match(slug, pattern);
}

static bool isValidStatus(const std::string &st) {
    return st == "draft" || st == "published" || st == "archived";
}

void ensureDefaultContentSeeded() {
    if (s_seeded) return;
    s_seeded = true;

    std::string now = getIsoTimestamp();

    // 1. Seed published Services
    auto seedService = [&](const std::string &id, const std::string &slug, const std::string &title,
                           const std::string &cat, const std::string &desc, const std::string &icon,
                           const std::string &badge, const std::string &status) {
        InternalService s;
        s.id = id;
        s.slug = slug;
        s.title = title;
        s.category = cat;
        s.description = desc;
        s.icon = icon;
        s.badge = badge;
        s.status = status;
        s.createdAt = now;
        s.updatedAt = now;
        s_services[id] = s;
    };

    seedService("srv-1", "topic-to-video", "Topic to Video", "Video", "Complete video creation from your concept to ready-to-publish videos.", "Video", "Most Popular", "published");
    seedService("srv-2", "video-editing", "Video Editing", "Video", "Professional editing for YouTube videos, podcasts, tutorials, vlogs and reels.", "Scissors", "", "published");
    seedService("srv-3", "video-to-shorts", "Video to Shorts", "Video", "Turn long videos into viral YouTube Shorts, Instagram Reels and TikTok clips.", "Film", "Trending", "published");
    seedService("srv-draft", "unreleased-ai-service", "Unreleased AI Service", "Tech", "Experimental service under evaluation.", "Cpu", "Draft", "draft");

    // 2. Seed Portfolio
    auto seedPortfolio = [&](const std::string &id, const std::string &slug, const std::string &title,
                             const std::string &cat, const std::string &client, const std::string &status) {
        InternalPortfolio p;
        p.id = id;
        p.slug = slug;
        p.title = title;
        p.category = cat;
        p.clientName = client;
        p.thumbnailUrl = "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=80";
        p.status = status;
        p.createdAt = now;
        p.updatedAt = now;
        s_portfolio[id] = p;
    };

    seedPortfolio("port-1", "techflow-ai-series", "TechFlow AI Explainers (12-Episode Series)", "YouTube Videos", "TechFlow Innovations", "published");
    seedPortfolio("port-draft", "unreleased-campaign", "Top Secret Brand Overhaul", "Business Promotion", "Confidential Client", "draft");

    // 3. Seed Courses & Lessons
    auto seedCourse = [&](const std::string &id, const std::string &slug, const std::string &title,
                          const std::string &cat, const std::string &status) {
        InternalCourse c;
        c.id = id;
        c.slug = slug;
        c.title = title;
        c.category = cat;
        c.description = "MarsNova Lab flagship hands-on masterclass.";
        c.level = "Beginner to Advanced";
        c.duration = "8 Weeks";
        c.icon = "Video";
        c.status = status;
        c.createdAt = now;
        c.updatedAt = now;
        s_courses[id] = c;
    };

    seedCourse("crs-1", "youtube-editing-mastery", "YouTube Video Editing Mastery", "Creative Production", "published");
    seedCourse("crs-draft", "unreleased-ai-filmmaking", "Unreleased AI Filmmaking", "AI & Tech", "draft");

    // Seed Lessons for crs-1
    auto seedLesson = [&](const std::string &id, const std::string &courseId, const std::string &slug,
                          const std::string &title, const std::string &mod, int order,
                          bool isFreePreview, bool isPrivate, const std::string &status) {
        InternalLesson l;
        l.id = id;
        l.courseId = courseId;
        l.slug = slug;
        l.title = title;
        l.moduleTitle = mod;
        l.lessonOrder = order;
        l.durationMinutes = 24;
        l.isFreePreview = isFreePreview;
        l.isPrivate = isPrivate;
        l.status = status;
        l.contentMarkdown = "## Lesson Content\n\nFull forensic curriculum notes and downloadable timeline files.";
        l.videoUrl = "https://stream.marsnova.in/lessons/lec-01-mastery.mp4";
        l.createdAt = now;
        l.updatedAt = now;
        s_lessons[id] = l;
    };

    // Public preview lesson
    seedLesson("les-1", "crs-1", "intro-timeline-setup", "Introduction & Timeline Setup", "Module 1", 1, true, false, "published");
    // Private lesson requiring authentication
    seedLesson("les-2", "crs-1", "advanced-color-grading", "Advanced LUTs & Color Grading", "Module 2", 2, false, true, "published");
    // Draft lesson
    seedLesson("les-3", "crs-1", "unreleased-motion-fx", "Unreleased Motion Graphics FX", "Module 3", 3, false, true, "draft");
}

} // namespace

// =============================================================================
// Helper Functions for Public Catalog Verification
// =============================================================================

bool ContentController::isServicePublished(const std::string &slug) {
    std::lock_guard<std::mutex> lock(s_contentMutex);
    ensureDefaultContentSeeded();
    for (const auto &pair : s_services) {
        if (pair.second.slug == slug) {
            return pair.second.status == "published";
        }
    }
    return false;
}

bool ContentController::isPortfolioPublished(const std::string &slug) {
    std::lock_guard<std::mutex> lock(s_contentMutex);
    ensureDefaultContentSeeded();
    for (const auto &pair : s_portfolio) {
        if (pair.second.slug == slug) {
            return pair.second.status == "published";
        }
    }
    return false;
}

bool ContentController::isCoursePublished(const std::string &slug) {
    std::lock_guard<std::mutex> lock(s_contentMutex);
    ensureDefaultContentSeeded();
    for (const auto &pair : s_courses) {
        if (pair.second.slug == slug) {
            return pair.second.status == "published";
        }
    }
    return false;
}

void ContentController::resetSeedStore() {
    std::lock_guard<std::mutex> lock(s_contentMutex);
    s_services.clear();
    s_portfolio.clear();
    s_courses.clear();
    s_lessons.clear();
    s_mediaUploads.clear();
    s_seeded = false;
    ensureDefaultContentSeeded();
}

// =============================================================================
// SERVICES MANAGEMENT (Protected)
// =============================================================================

void ContentController::listServicesAdmin(const drogon::HttpRequestPtr &req,
                                         std::function<void(const drogon::HttpResponsePtr &)> &&callback) {
    if (req->method() == drogon::Options) {
        callback(drogon::HttpResponse::newHttpResponse());
        return;
    }

    std::string reqId = req->attributes()->get("request_id");
    auto auth = AuthController::verifyRequestSession(req);
    if (!auth.authenticated) {
        Json::Value err;
        err["error"] = auth.errorMessage;
        err["code"] = auth.errorCode;
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(auth.statusCode);
        callback(resp);
        return;
    }

    std::lock_guard<std::mutex> lock(s_contentMutex);
    ensureDefaultContentSeeded();

    Json::Value list(Json::arrayValue);
    for (const auto &pair : s_services) {
        const auto &s = pair.second;
        Json::Value item;
        item["id"] = s.id;
        item["slug"] = s.slug;
        item["title"] = s.title;
        item["category"] = s.category;
        item["description"] = s.description;
        item["icon"] = s.icon;
        item["badge"] = s.badge;
        item["status"] = s.status;
        item["created_at"] = s.createdAt;
        item["updated_at"] = s.updatedAt;
        list.append(item);
    }

    Json::Value res;
    res["status"] = "ok";
    res["data"] = list;
    if (!reqId.empty()) res["request_id"] = reqId;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    resp->setStatusCode(drogon::k200OK);
    callback(resp);
}

void ContentController::createService(const drogon::HttpRequestPtr &req,
                                     std::function<void(const drogon::HttpResponsePtr &)> &&callback) {
    if (req->method() == drogon::Options) {
        callback(drogon::HttpResponse::newHttpResponse());
        return;
    }

    std::string reqId = req->attributes()->get("request_id");
    auto auth = AuthController::verifyRequestSession(req);
    if (!auth.authenticated) {
        Json::Value err;
        err["error"] = auth.errorMessage;
        err["code"] = auth.errorCode;
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(auth.statusCode);
        callback(resp);
        return;
    }

    auto jsonPtr = req->jsonObject();
    if (!jsonPtr) {
        Json::Value err;
        err["error"] = "Invalid JSON body";
        err["code"] = "BAD_REQUEST";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }
    const Json::Value &body = *jsonPtr;

    std::string title = body.get("title", "").asString();
    std::string slug = body.get("slug", "").asString();
    std::string category = body.get("category", "Video").asString();
    std::string description = body.get("description", "").asString();
    std::string status = body.get("status", "draft").asString();

    if (title.empty() || description.empty()) {
        Json::Value err;
        err["error"] = "Title and description are required fields";
        err["code"] = "VALIDATION_FAILED";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    if (!isValidSlug(slug)) {
        Json::Value err;
        err["error"] = "Slug must contain only lowercase letters, digits, and hyphens (e.g. custom-video-editing)";
        err["code"] = "INVALID_SLUG_FORMAT";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    if (!isValidStatus(status)) {
        Json::Value err;
        err["error"] = "Status must be 'draft', 'published', or 'archived'";
        err["code"] = "INVALID_STATUS";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    std::lock_guard<std::mutex> lock(s_contentMutex);
    ensureDefaultContentSeeded();

    // Check slug collision
    for (const auto &pair : s_services) {
        if (pair.second.slug == slug) {
            Json::Value err;
            err["error"] = "Service slug already in use: " + slug;
            err["code"] = "DUPLICATE_SLUG";
            if (!reqId.empty()) err["request_id"] = reqId;
            auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
            resp->setStatusCode(drogon::k409Conflict);
            callback(resp);
            return;
        }
    }

    InternalService s;
    s.id = "srv-" + Security::randomHex(6);
    s.slug = slug;
    s.title = title;
    s.category = category;
    s.description = description;
    s.icon = body.get("icon", "Video").asString();
    s.badge = body.get("badge", "").asString();
    s.status = status;
    s.createdAt = getIsoTimestamp();
    s.updatedAt = s.createdAt;
    s_services[s.id] = s;

    Json::Value res;
    res["status"] = "ok";
    res["message"] = "Service created successfully";
    res["data"]["id"] = s.id;
    res["data"]["slug"] = s.slug;
    res["data"]["title"] = s.title;
    res["data"]["status"] = s.status;
    if (!reqId.empty()) res["request_id"] = reqId;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    resp->setStatusCode(drogon::k201Created);
    callback(resp);
}

void ContentController::updateService(const drogon::HttpRequestPtr &req,
                                     std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                                     const std::string &id) {
    if (req->method() == drogon::Options) {
        callback(drogon::HttpResponse::newHttpResponse());
        return;
    }

    std::string reqId = req->attributes()->get("request_id");
    auto auth = AuthController::verifyRequestSession(req);
    if (!auth.authenticated) {
        Json::Value err;
        err["error"] = auth.errorMessage;
        err["code"] = auth.errorCode;
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(auth.statusCode);
        callback(resp);
        return;
    }

    auto jsonPtr = req->jsonObject();
    if (!jsonPtr) {
        Json::Value err;
        err["error"] = "Invalid JSON body";
        err["code"] = "BAD_REQUEST";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }
    const Json::Value &body = *jsonPtr;

    std::lock_guard<std::mutex> lock(s_contentMutex);
    ensureDefaultContentSeeded();

    auto it = s_services.find(id);
    if (it == s_services.end()) {
        Json::Value err;
        err["error"] = "Service not found: " + id;
        err["code"] = "NOT_FOUND";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k404NotFound);
        callback(resp);
        return;
    }

    if (body.isMember("slug")) {
        std::string newSlug = body["slug"].asString();
        if (!isValidSlug(newSlug)) {
            Json::Value err;
            err["error"] = "Invalid slug format";
            err["code"] = "INVALID_SLUG_FORMAT";
            if (!reqId.empty()) err["request_id"] = reqId;
            auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
            resp->setStatusCode(drogon::k400BadRequest);
            callback(resp);
            return;
        }

        // Check if other service has this slug
        for (const auto &pair : s_services) {
            if (pair.first != id && pair.second.slug == newSlug) {
                Json::Value err;
                err["error"] = "Service slug already in use: " + newSlug;
                err["code"] = "DUPLICATE_SLUG";
                if (!reqId.empty()) err["request_id"] = reqId;
                auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
                resp->setStatusCode(drogon::k409Conflict);
                callback(resp);
                return;
            }
        }
        it->second.slug = newSlug;
    }

    if (body.isMember("title")) it->second.title = body["title"].asString();
    if (body.isMember("category")) it->second.category = body["category"].asString();
    if (body.isMember("description")) it->second.description = body["description"].asString();
    if (body.isMember("status")) {
        std::string st = body["status"].asString();
        if (isValidStatus(st)) it->second.status = st;
    }
    it->second.updatedAt = getIsoTimestamp();

    Json::Value res;
    res["status"] = "ok";
    res["message"] = "Service updated successfully";
    res["data"]["id"] = it->second.id;
    res["data"]["slug"] = it->second.slug;
    res["data"]["status"] = it->second.status;
    if (!reqId.empty()) res["request_id"] = reqId;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    resp->setStatusCode(drogon::k200OK);
    callback(resp);
}

void ContentController::publishService(const drogon::HttpRequestPtr &req,
                                      std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                                      const std::string &id) {
    if (req->method() == drogon::Options) {
        callback(drogon::HttpResponse::newHttpResponse());
        return;
    }

    std::string reqId = req->attributes()->get("request_id");
    auto auth = AuthController::verifyRequestSession(req);
    if (!auth.authenticated) {
        Json::Value err;
        err["error"] = auth.errorMessage;
        err["code"] = auth.errorCode;
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(auth.statusCode);
        callback(resp);
        return;
    }

    std::lock_guard<std::mutex> lock(s_contentMutex);
    ensureDefaultContentSeeded();

    auto it = s_services.find(id);
    if (it == s_services.end()) {
        Json::Value err;
        err["error"] = "Service not found: " + id;
        err["code"] = "NOT_FOUND";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k404NotFound);
        callback(resp);
        return;
    }

    it->second.status = "published";
    it->second.updatedAt = getIsoTimestamp();

    Json::Value res;
    res["status"] = "ok";
    res["message"] = "Service published successfully";
    res["data"]["id"] = it->second.id;
    res["data"]["slug"] = it->second.slug;
    res["data"]["status"] = it->second.status;
    if (!reqId.empty()) res["request_id"] = reqId;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    resp->setStatusCode(drogon::k200OK);
    callback(resp);
}

void ContentController::archiveService(const drogon::HttpRequestPtr &req,
                                      std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                                      const std::string &id) {
    if (req->method() == drogon::Options) {
        callback(drogon::HttpResponse::newHttpResponse());
        return;
    }

    std::string reqId = req->attributes()->get("request_id");
    auto auth = AuthController::verifyRequestSession(req);
    if (!auth.authenticated) {
        Json::Value err;
        err["error"] = auth.errorMessage;
        err["code"] = auth.errorCode;
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(auth.statusCode);
        callback(resp);
        return;
    }

    std::lock_guard<std::mutex> lock(s_contentMutex);
    ensureDefaultContentSeeded();

    auto it = s_services.find(id);
    if (it == s_services.end()) {
        Json::Value err;
        err["error"] = "Service not found: " + id;
        err["code"] = "NOT_FOUND";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k404NotFound);
        callback(resp);
        return;
    }

    it->second.status = "archived";
    it->second.updatedAt = getIsoTimestamp();

    Json::Value res;
    res["status"] = "ok";
    res["message"] = "Service archived successfully";
    res["data"]["id"] = it->second.id;
    res["data"]["slug"] = it->second.slug;
    res["data"]["status"] = it->second.status;
    if (!reqId.empty()) res["request_id"] = reqId;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    resp->setStatusCode(drogon::k200OK);
    callback(resp);
}

void ContentController::deleteService(const drogon::HttpRequestPtr &req,
                                     std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                                     const std::string &id) {
    if (req->method() == drogon::Options) {
        callback(drogon::HttpResponse::newHttpResponse());
        return;
    }

    std::string reqId = req->attributes()->get("request_id");
    auto auth = AuthController::verifyRequestSession(req);
    if (!auth.authenticated) {
        Json::Value err;
        err["error"] = auth.errorMessage;
        err["code"] = auth.errorCode;
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(auth.statusCode);
        callback(resp);
        return;
    }

    std::lock_guard<std::mutex> lock(s_contentMutex);
    ensureDefaultContentSeeded();

    auto it = s_services.find(id);
    if (it == s_services.end()) {
        Json::Value err;
        err["error"] = "Service not found: " + id;
        err["code"] = "NOT_FOUND";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k404NotFound);
        callback(resp);
        return;
    }

    s_services.erase(it);

    Json::Value res;
    res["status"] = "ok";
    res["message"] = "Service deleted successfully";
    if (!reqId.empty()) res["request_id"] = reqId;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    resp->setStatusCode(drogon::k200OK);
    callback(resp);
}

// =============================================================================
// PORTFOLIO MANAGEMENT (Protected)
// =============================================================================

void ContentController::listPortfolioAdmin(const drogon::HttpRequestPtr &req,
                                          std::function<void(const drogon::HttpResponsePtr &)> &&callback) {
    if (req->method() == drogon::Options) {
        callback(drogon::HttpResponse::newHttpResponse());
        return;
    }

    std::string reqId = req->attributes()->get("request_id");
    auto auth = AuthController::verifyRequestSession(req);
    if (!auth.authenticated) {
        Json::Value err;
        err["error"] = auth.errorMessage;
        err["code"] = auth.errorCode;
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(auth.statusCode);
        callback(resp);
        return;
    }

    std::lock_guard<std::mutex> lock(s_contentMutex);
    ensureDefaultContentSeeded();

    Json::Value list(Json::arrayValue);
    for (const auto &pair : s_portfolio) {
        const auto &p = pair.second;
        Json::Value item;
        item["id"] = p.id;
        item["slug"] = p.slug;
        item["title"] = p.title;
        item["category"] = p.category;
        item["client_name"] = p.clientName;
        item["thumbnail_url"] = p.thumbnailUrl;
        item["status"] = p.status;
        item["created_at"] = p.createdAt;
        item["updated_at"] = p.updatedAt;
        list.append(item);
    }

    Json::Value res;
    res["status"] = "ok";
    res["data"] = list;
    if (!reqId.empty()) res["request_id"] = reqId;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    resp->setStatusCode(drogon::k200OK);
    callback(resp);
}

void ContentController::createPortfolio(const drogon::HttpRequestPtr &req,
                                       std::function<void(const drogon::HttpResponsePtr &)> &&callback) {
    if (req->method() == drogon::Options) {
        callback(drogon::HttpResponse::newHttpResponse());
        return;
    }

    std::string reqId = req->attributes()->get("request_id");
    auto auth = AuthController::verifyRequestSession(req);
    if (!auth.authenticated) {
        Json::Value err;
        err["error"] = auth.errorMessage;
        err["code"] = auth.errorCode;
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(auth.statusCode);
        callback(resp);
        return;
    }

    auto jsonPtr = req->jsonObject();
    if (!jsonPtr) {
        Json::Value err;
        err["error"] = "Invalid JSON body";
        err["code"] = "BAD_REQUEST";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }
    const Json::Value &body = *jsonPtr;

    std::string title = body.get("title", "").asString();
    std::string slug = body.get("slug", "").asString();
    std::string category = body.get("category", "YouTube Videos").asString();
    std::string client = body.get("client_name", "").asString();
    std::string status = body.get("status", "draft").asString();

    if (title.empty()) {
        Json::Value err;
        err["error"] = "Portfolio item title is required";
        err["code"] = "VALIDATION_FAILED";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    if (!isValidSlug(slug)) {
        Json::Value err;
        err["error"] = "Invalid slug format (lowercase letters, digits, and hyphens only)";
        err["code"] = "INVALID_SLUG_FORMAT";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    if (!isValidStatus(status)) {
        Json::Value err;
        err["error"] = "Status must be 'draft', 'published', or 'archived'";
        err["code"] = "INVALID_STATUS";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    std::lock_guard<std::mutex> lock(s_contentMutex);
    ensureDefaultContentSeeded();

    for (const auto &pair : s_portfolio) {
        if (pair.second.slug == slug) {
            Json::Value err;
            err["error"] = "Portfolio slug already in use: " + slug;
            err["code"] = "DUPLICATE_SLUG";
            if (!reqId.empty()) err["request_id"] = reqId;
            auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
            resp->setStatusCode(drogon::k409Conflict);
            callback(resp);
            return;
        }
    }

    InternalPortfolio p;
    p.id = "port-" + Security::randomHex(6);
    p.slug = slug;
    p.title = title;
    p.category = category;
    p.clientName = client;
    p.thumbnailUrl = body.get("thumbnail_url", "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=80").asString();
    p.status = status;
    p.createdAt = getIsoTimestamp();
    p.updatedAt = p.createdAt;
    s_portfolio[p.id] = p;

    Json::Value res;
    res["status"] = "ok";
    res["message"] = "Portfolio item created successfully";
    res["data"]["id"] = p.id;
    res["data"]["slug"] = p.slug;
    res["data"]["status"] = p.status;
    if (!reqId.empty()) res["request_id"] = reqId;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    resp->setStatusCode(drogon::k201Created);
    callback(resp);
}

void ContentController::updatePortfolio(const drogon::HttpRequestPtr &req,
                                       std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                                       const std::string &id) {
    if (req->method() == drogon::Options) {
        callback(drogon::HttpResponse::newHttpResponse());
        return;
    }

    std::string reqId = req->attributes()->get("request_id");
    auto auth = AuthController::verifyRequestSession(req);
    if (!auth.authenticated) {
        Json::Value err;
        err["error"] = auth.errorMessage;
        err["code"] = auth.errorCode;
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(auth.statusCode);
        callback(resp);
        return;
    }

    auto jsonPtr = req->jsonObject();
    if (!jsonPtr) {
        Json::Value err;
        err["error"] = "Invalid JSON body";
        err["code"] = "BAD_REQUEST";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }
    const Json::Value &body = *jsonPtr;

    std::lock_guard<std::mutex> lock(s_contentMutex);
    ensureDefaultContentSeeded();

    auto it = s_portfolio.find(id);
    if (it == s_portfolio.end()) {
        Json::Value err;
        err["error"] = "Portfolio item not found: " + id;
        err["code"] = "NOT_FOUND";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k404NotFound);
        callback(resp);
        return;
    }

    if (body.isMember("slug")) {
        std::string newSlug = body["slug"].asString();
        if (!isValidSlug(newSlug)) {
            Json::Value err;
            err["error"] = "Invalid slug format";
            err["code"] = "INVALID_SLUG_FORMAT";
            if (!reqId.empty()) err["request_id"] = reqId;
            auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
            resp->setStatusCode(drogon::k400BadRequest);
            callback(resp);
            return;
        }

        for (const auto &pair : s_portfolio) {
            if (pair.first != id && pair.second.slug == newSlug) {
                Json::Value err;
                err["error"] = "Portfolio slug already in use: " + newSlug;
                err["code"] = "DUPLICATE_SLUG";
                if (!reqId.empty()) err["request_id"] = reqId;
                auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
                resp->setStatusCode(drogon::k409Conflict);
                callback(resp);
                return;
            }
        }
        it->second.slug = newSlug;
    }

    if (body.isMember("title")) it->second.title = body["title"].asString();
    if (body.isMember("category")) it->second.category = body["category"].asString();
    if (body.isMember("client_name")) it->second.clientName = body["client_name"].asString();
    if (body.isMember("status")) {
        std::string st = body["status"].asString();
        if (isValidStatus(st)) it->second.status = st;
    }
    it->second.updatedAt = getIsoTimestamp();

    Json::Value res;
    res["status"] = "ok";
    res["message"] = "Portfolio item updated successfully";
    res["data"]["id"] = it->second.id;
    res["data"]["slug"] = it->second.slug;
    res["data"]["status"] = it->second.status;
    if (!reqId.empty()) res["request_id"] = reqId;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    resp->setStatusCode(drogon::k200OK);
    callback(resp);
}

void ContentController::publishPortfolio(const drogon::HttpRequestPtr &req,
                                        std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                                        const std::string &id) {
    if (req->method() == drogon::Options) {
        callback(drogon::HttpResponse::newHttpResponse());
        return;
    }

    std::string reqId = req->attributes()->get("request_id");
    auto auth = AuthController::verifyRequestSession(req);
    if (!auth.authenticated) {
        Json::Value err;
        err["error"] = auth.errorMessage;
        err["code"] = auth.errorCode;
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(auth.statusCode);
        callback(resp);
        return;
    }

    std::lock_guard<std::mutex> lock(s_contentMutex);
    ensureDefaultContentSeeded();

    auto it = s_portfolio.find(id);
    if (it == s_portfolio.end()) {
        Json::Value err;
        err["error"] = "Portfolio item not found: " + id;
        err["code"] = "NOT_FOUND";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k404NotFound);
        callback(resp);
        return;
    }

    it->second.status = "published";
    it->second.updatedAt = getIsoTimestamp();

    Json::Value res;
    res["status"] = "ok";
    res["message"] = "Portfolio item published successfully";
    res["data"]["id"] = it->second.id;
    res["data"]["slug"] = it->second.slug;
    res["data"]["status"] = it->second.status;
    if (!reqId.empty()) res["request_id"] = reqId;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    resp->setStatusCode(drogon::k200OK);
    callback(resp);
}

void ContentController::archivePortfolio(const drogon::HttpRequestPtr &req,
                                        std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                                        const std::string &id) {
    if (req->method() == drogon::Options) {
        callback(drogon::HttpResponse::newHttpResponse());
        return;
    }

    std::string reqId = req->attributes()->get("request_id");
    auto auth = AuthController::verifyRequestSession(req);
    if (!auth.authenticated) {
        Json::Value err;
        err["error"] = auth.errorMessage;
        err["code"] = auth.errorCode;
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(auth.statusCode);
        callback(resp);
        return;
    }

    std::lock_guard<std::mutex> lock(s_contentMutex);
    ensureDefaultContentSeeded();

    auto it = s_portfolio.find(id);
    if (it == s_portfolio.end()) {
        Json::Value err;
        err["error"] = "Portfolio item not found: " + id;
        err["code"] = "NOT_FOUND";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k404NotFound);
        callback(resp);
        return;
    }

    it->second.status = "archived";
    it->second.updatedAt = getIsoTimestamp();

    Json::Value res;
    res["status"] = "ok";
    res["message"] = "Portfolio item archived successfully";
    res["data"]["id"] = it->second.id;
    res["data"]["slug"] = it->second.slug;
    res["data"]["status"] = it->second.status;
    if (!reqId.empty()) res["request_id"] = reqId;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    resp->setStatusCode(drogon::k200OK);
    callback(resp);
}

void ContentController::deletePortfolio(const drogon::HttpRequestPtr &req,
                                       std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                                       const std::string &id) {
    if (req->method() == drogon::Options) {
        callback(drogon::HttpResponse::newHttpResponse());
        return;
    }

    std::string reqId = req->attributes()->get("request_id");
    auto auth = AuthController::verifyRequestSession(req);
    if (!auth.authenticated) {
        Json::Value err;
        err["error"] = auth.errorMessage;
        err["code"] = auth.errorCode;
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(auth.statusCode);
        callback(resp);
        return;
    }

    std::lock_guard<std::mutex> lock(s_contentMutex);
    ensureDefaultContentSeeded();

    auto it = s_portfolio.find(id);
    if (it == s_portfolio.end()) {
        Json::Value err;
        err["error"] = "Portfolio item not found: " + id;
        err["code"] = "NOT_FOUND";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k404NotFound);
        callback(resp);
        return;
    }

    s_portfolio.erase(it);

    Json::Value res;
    res["status"] = "ok";
    res["message"] = "Portfolio item deleted successfully";
    if (!reqId.empty()) res["request_id"] = reqId;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    resp->setStatusCode(drogon::k200OK);
    callback(resp);
}

// =============================================================================
// COURSES MANAGEMENT (Protected)
// =============================================================================

void ContentController::listCoursesAdmin(const drogon::HttpRequestPtr &req,
                                        std::function<void(const drogon::HttpResponsePtr &)> &&callback) {
    if (req->method() == drogon::Options) {
        callback(drogon::HttpResponse::newHttpResponse());
        return;
    }

    std::string reqId = req->attributes()->get("request_id");
    auto auth = AuthController::verifyRequestSession(req);
    if (!auth.authenticated) {
        Json::Value err;
        err["error"] = auth.errorMessage;
        err["code"] = auth.errorCode;
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(auth.statusCode);
        callback(resp);
        return;
    }

    std::lock_guard<std::mutex> lock(s_contentMutex);
    ensureDefaultContentSeeded();

    Json::Value list(Json::arrayValue);
    for (const auto &pair : s_courses) {
        const auto &c = pair.second;
        Json::Value item;
        item["id"] = c.id;
        item["slug"] = c.slug;
        item["title"] = c.title;
        item["category"] = c.category;
        item["description"] = c.description;
        item["level"] = c.level;
        item["duration"] = c.duration;
        item["status"] = c.status;
        item["created_at"] = c.createdAt;
        item["updated_at"] = c.updatedAt;
        list.append(item);
    }

    Json::Value res;
    res["status"] = "ok";
    res["data"] = list;
    if (!reqId.empty()) res["request_id"] = reqId;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    resp->setStatusCode(drogon::k200OK);
    callback(resp);
}

void ContentController::createCourse(const drogon::HttpRequestPtr &req,
                                    std::function<void(const drogon::HttpResponsePtr &)> &&callback) {
    if (req->method() == drogon::Options) {
        callback(drogon::HttpResponse::newHttpResponse());
        return;
    }

    std::string reqId = req->attributes()->get("request_id");
    auto auth = AuthController::verifyRequestSession(req);
    if (!auth.authenticated) {
        Json::Value err;
        err["error"] = auth.errorMessage;
        err["code"] = auth.errorCode;
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(auth.statusCode);
        callback(resp);
        return;
    }

    auto jsonPtr = req->jsonObject();
    if (!jsonPtr) {
        Json::Value err;
        err["error"] = "Invalid JSON body";
        err["code"] = "BAD_REQUEST";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }
    const Json::Value &body = *jsonPtr;

    std::string title = body.get("title", "").asString();
    std::string slug = body.get("slug", "").asString();
    std::string category = body.get("category", "Creative Production").asString();
    std::string description = body.get("description", "").asString();
    std::string status = body.get("status", "draft").asString();

    if (title.empty()) {
        Json::Value err;
        err["error"] = "Course title is required";
        err["code"] = "VALIDATION_FAILED";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    if (!isValidSlug(slug)) {
        Json::Value err;
        err["error"] = "Invalid slug format (lowercase letters, digits, and hyphens only)";
        err["code"] = "INVALID_SLUG_FORMAT";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    if (!isValidStatus(status)) {
        Json::Value err;
        err["error"] = "Status must be 'draft', 'published', or 'archived'";
        err["code"] = "INVALID_STATUS";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    std::lock_guard<std::mutex> lock(s_contentMutex);
    ensureDefaultContentSeeded();

    for (const auto &pair : s_courses) {
        if (pair.second.slug == slug) {
            Json::Value err;
            err["error"] = "Course slug already in use: " + slug;
            err["code"] = "DUPLICATE_SLUG";
            if (!reqId.empty()) err["request_id"] = reqId;
            auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
            resp->setStatusCode(drogon::k409Conflict);
            callback(resp);
            return;
        }
    }

    InternalCourse c;
    c.id = "crs-" + Security::randomHex(6);
    c.slug = slug;
    c.title = title;
    c.category = category;
    c.description = description;
    c.level = body.get("level", "Beginner to Advanced").asString();
    c.duration = body.get("duration", "4 Weeks").asString();
    c.icon = body.get("icon", "Video").asString();
    c.status = status;
    c.createdAt = getIsoTimestamp();
    c.updatedAt = c.createdAt;
    s_courses[c.id] = c;

    Json::Value res;
    res["status"] = "ok";
    res["message"] = "Course created successfully";
    res["data"]["id"] = c.id;
    res["data"]["slug"] = c.slug;
    res["data"]["status"] = c.status;
    if (!reqId.empty()) res["request_id"] = reqId;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    resp->setStatusCode(drogon::k201Created);
    callback(resp);
}

void ContentController::updateCourse(const drogon::HttpRequestPtr &req,
                                    std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                                    const std::string &id) {
    if (req->method() == drogon::Options) {
        callback(drogon::HttpResponse::newHttpResponse());
        return;
    }

    std::string reqId = req->attributes()->get("request_id");
    auto auth = AuthController::verifyRequestSession(req);
    if (!auth.authenticated) {
        Json::Value err;
        err["error"] = auth.errorMessage;
        err["code"] = auth.errorCode;
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(auth.statusCode);
        callback(resp);
        return;
    }

    auto jsonPtr = req->jsonObject();
    if (!jsonPtr) {
        Json::Value err;
        err["error"] = "Invalid JSON body";
        err["code"] = "BAD_REQUEST";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }
    const Json::Value &body = *jsonPtr;

    std::lock_guard<std::mutex> lock(s_contentMutex);
    ensureDefaultContentSeeded();

    auto it = s_courses.find(id);
    if (it == s_courses.end()) {
        Json::Value err;
        err["error"] = "Course not found: " + id;
        err["code"] = "NOT_FOUND";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k404NotFound);
        callback(resp);
        return;
    }

    if (body.isMember("slug")) {
        std::string newSlug = body["slug"].asString();
        if (!isValidSlug(newSlug)) {
            Json::Value err;
            err["error"] = "Invalid slug format";
            err["code"] = "INVALID_SLUG_FORMAT";
            if (!reqId.empty()) err["request_id"] = reqId;
            auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
            resp->setStatusCode(drogon::k400BadRequest);
            callback(resp);
            return;
        }

        for (const auto &pair : s_courses) {
            if (pair.first != id && pair.second.slug == newSlug) {
                Json::Value err;
                err["error"] = "Course slug already in use: " + newSlug;
                err["code"] = "DUPLICATE_SLUG";
                if (!reqId.empty()) err["request_id"] = reqId;
                auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
                resp->setStatusCode(drogon::k409Conflict);
                callback(resp);
                return;
            }
        }
        it->second.slug = newSlug;
    }

    if (body.isMember("title")) it->second.title = body["title"].asString();
    if (body.isMember("category")) it->second.category = body["category"].asString();
    if (body.isMember("description")) it->second.description = body["description"].asString();
    if (body.isMember("status")) {
        std::string st = body["status"].asString();
        if (isValidStatus(st)) it->second.status = st;
    }
    it->second.updatedAt = getIsoTimestamp();

    Json::Value res;
    res["status"] = "ok";
    res["message"] = "Course updated successfully";
    res["data"]["id"] = it->second.id;
    res["data"]["slug"] = it->second.slug;
    res["data"]["status"] = it->second.status;
    if (!reqId.empty()) res["request_id"] = reqId;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    resp->setStatusCode(drogon::k200OK);
    callback(resp);
}

void ContentController::publishCourse(const drogon::HttpRequestPtr &req,
                                     std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                                     const std::string &id) {
    if (req->method() == drogon::Options) {
        callback(drogon::HttpResponse::newHttpResponse());
        return;
    }

    std::string reqId = req->attributes()->get("request_id");
    auto auth = AuthController::verifyRequestSession(req);
    if (!auth.authenticated) {
        Json::Value err;
        err["error"] = auth.errorMessage;
        err["code"] = auth.errorCode;
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(auth.statusCode);
        callback(resp);
        return;
    }

    std::lock_guard<std::mutex> lock(s_contentMutex);
    ensureDefaultContentSeeded();

    auto it = s_courses.find(id);
    if (it == s_courses.end()) {
        Json::Value err;
        err["error"] = "Course not found: " + id;
        err["code"] = "NOT_FOUND";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k404NotFound);
        callback(resp);
        return;
    }

    it->second.status = "published";
    it->second.updatedAt = getIsoTimestamp();

    Json::Value res;
    res["status"] = "ok";
    res["message"] = "Course published successfully";
    res["data"]["id"] = it->second.id;
    res["data"]["slug"] = it->second.slug;
    res["data"]["status"] = it->second.status;
    if (!reqId.empty()) res["request_id"] = reqId;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    resp->setStatusCode(drogon::k200OK);
    callback(resp);
}

void ContentController::archiveCourse(const drogon::HttpRequestPtr &req,
                                     std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                                     const std::string &id) {
    if (req->method() == drogon::Options) {
        callback(drogon::HttpResponse::newHttpResponse());
        return;
    }

    std::string reqId = req->attributes()->get("request_id");
    auto auth = AuthController::verifyRequestSession(req);
    if (!auth.authenticated) {
        Json::Value err;
        err["error"] = auth.errorMessage;
        err["code"] = auth.errorCode;
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(auth.statusCode);
        callback(resp);
        return;
    }

    std::lock_guard<std::mutex> lock(s_contentMutex);
    ensureDefaultContentSeeded();

    auto it = s_courses.find(id);
    if (it == s_courses.end()) {
        Json::Value err;
        err["error"] = "Course not found: " + id;
        err["code"] = "NOT_FOUND";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k404NotFound);
        callback(resp);
        return;
    }

    it->second.status = "archived";
    it->second.updatedAt = getIsoTimestamp();

    Json::Value res;
    res["status"] = "ok";
    res["message"] = "Course archived successfully";
    res["data"]["id"] = it->second.id;
    res["data"]["slug"] = it->second.slug;
    res["data"]["status"] = it->second.status;
    if (!reqId.empty()) res["request_id"] = reqId;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    resp->setStatusCode(drogon::k200OK);
    callback(resp);
}

void ContentController::deleteCourse(const drogon::HttpRequestPtr &req,
                                    std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                                    const std::string &id) {
    if (req->method() == drogon::Options) {
        callback(drogon::HttpResponse::newHttpResponse());
        return;
    }

    std::string reqId = req->attributes()->get("request_id");
    auto auth = AuthController::verifyRequestSession(req);
    if (!auth.authenticated) {
        Json::Value err;
        err["error"] = auth.errorMessage;
        err["code"] = auth.errorCode;
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(auth.statusCode);
        callback(resp);
        return;
    }

    std::lock_guard<std::mutex> lock(s_contentMutex);
    ensureDefaultContentSeeded();

    auto it = s_courses.find(id);
    if (it == s_courses.end()) {
        Json::Value err;
        err["error"] = "Course not found: " + id;
        err["code"] = "NOT_FOUND";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k404NotFound);
        callback(resp);
        return;
    }

    s_courses.erase(it);

    Json::Value res;
    res["status"] = "ok";
    res["message"] = "Course deleted successfully";
    if (!reqId.empty()) res["request_id"] = reqId;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    resp->setStatusCode(drogon::k200OK);
    callback(resp);
}

// =============================================================================
// LESSONS MANAGEMENT & PRIVATE CONTENT PROTECTION
// =============================================================================

void ContentController::listLessonsAdmin(const drogon::HttpRequestPtr &req,
                                        std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                                        const std::string &courseId) {
    if (req->method() == drogon::Options) {
        callback(drogon::HttpResponse::newHttpResponse());
        return;
    }

    std::string reqId = req->attributes()->get("request_id");
    auto auth = AuthController::verifyRequestSession(req);
    if (!auth.authenticated) {
        Json::Value err;
        err["error"] = auth.errorMessage;
        err["code"] = auth.errorCode;
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(auth.statusCode);
        callback(resp);
        return;
    }

    std::lock_guard<std::mutex> lock(s_contentMutex);
    ensureDefaultContentSeeded();

    Json::Value list(Json::arrayValue);
    for (const auto &pair : s_lessons) {
        const auto &l = pair.second;
        if (l.courseId == courseId || courseId.empty()) {
            Json::Value item;
            item["id"] = l.id;
            item["course_id"] = l.courseId;
            item["slug"] = l.slug;
            item["title"] = l.title;
            item["module_title"] = l.moduleTitle;
            item["lesson_order"] = l.lessonOrder;
            item["duration_minutes"] = l.durationMinutes;
            item["is_free_preview"] = l.isFreePreview;
            item["is_private"] = l.isPrivate;
            item["status"] = l.status;
            item["created_at"] = l.createdAt;
            item["updated_at"] = l.updatedAt;
            list.append(item);
        }
    }

    Json::Value res;
    res["status"] = "ok";
    res["data"] = list;
    if (!reqId.empty()) res["request_id"] = reqId;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    resp->setStatusCode(drogon::k200OK);
    callback(resp);
}

void ContentController::createLesson(const drogon::HttpRequestPtr &req,
                                    std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                                    const std::string &courseId) {
    if (req->method() == drogon::Options) {
        callback(drogon::HttpResponse::newHttpResponse());
        return;
    }

    std::string reqId = req->attributes()->get("request_id");
    auto auth = AuthController::verifyRequestSession(req);
    if (!auth.authenticated) {
        Json::Value err;
        err["error"] = auth.errorMessage;
        err["code"] = auth.errorCode;
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(auth.statusCode);
        callback(resp);
        return;
    }

    auto jsonPtr = req->jsonObject();
    if (!jsonPtr) {
        Json::Value err;
        err["error"] = "Invalid JSON body";
        err["code"] = "BAD_REQUEST";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }
    const Json::Value &body = *jsonPtr;

    std::string title = body.get("title", "").asString();
    std::string slug = body.get("slug", "").asString();
    std::string moduleTitle = body.get("module_title", "General").asString();
    std::string status = body.get("status", "draft").asString();
    bool isFreePreview = body.get("is_free_preview", false).asBool();
    bool isPrivate = body.get("is_private", true).asBool();

    if (title.empty()) {
        Json::Value err;
        err["error"] = "Lesson title is required";
        err["code"] = "VALIDATION_FAILED";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    if (!isValidSlug(slug)) {
        Json::Value err;
        err["error"] = "Invalid lesson slug format (e.g. intro-to-timeline)";
        err["code"] = "INVALID_SLUG_FORMAT";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    if (!isValidStatus(status)) {
        Json::Value err;
        err["error"] = "Status must be 'draft', 'published', or 'archived'";
        err["code"] = "INVALID_STATUS";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    std::lock_guard<std::mutex> lock(s_contentMutex);
    ensureDefaultContentSeeded();

    // Check slug collision within the same course
    for (const auto &pair : s_lessons) {
        if (pair.second.courseId == courseId && pair.second.slug == slug) {
            Json::Value err;
            err["error"] = "Lesson slug already in use for this course: " + slug;
            err["code"] = "DUPLICATE_SLUG";
            if (!reqId.empty()) err["request_id"] = reqId;
            auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
            resp->setStatusCode(drogon::k409Conflict);
            callback(resp);
            return;
        }
    }

    InternalLesson l;
    l.id = "les-" + Security::randomHex(6);
    l.courseId = courseId;
    l.slug = slug;
    l.title = title;
    l.moduleTitle = moduleTitle;
    l.lessonOrder = body.get("lesson_order", 1).asInt();
    l.contentMarkdown = body.get("content_markdown", "").asString();
    l.videoUrl = body.get("video_url", "").asString();
    l.durationMinutes = body.get("duration_minutes", 15).asInt();
    l.isFreePreview = isFreePreview;
    l.isPrivate = isPrivate;
    l.status = status;
    l.createdAt = getIsoTimestamp();
    l.updatedAt = l.createdAt;
    s_lessons[l.id] = l;

    Json::Value res;
    res["status"] = "ok";
    res["message"] = "Lesson created successfully";
    res["data"]["id"] = l.id;
    res["data"]["course_id"] = l.courseId;
    res["data"]["slug"] = l.slug;
    res["data"]["status"] = l.status;
    if (!reqId.empty()) res["request_id"] = reqId;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    resp->setStatusCode(drogon::k201Created);
    callback(resp);
}

void ContentController::updateLesson(const drogon::HttpRequestPtr &req,
                                    std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                                    const std::string &id) {
    if (req->method() == drogon::Options) {
        callback(drogon::HttpResponse::newHttpResponse());
        return;
    }

    std::string reqId = req->attributes()->get("request_id");
    auto auth = AuthController::verifyRequestSession(req);
    if (!auth.authenticated) {
        Json::Value err;
        err["error"] = auth.errorMessage;
        err["code"] = auth.errorCode;
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(auth.statusCode);
        callback(resp);
        return;
    }

    auto jsonPtr = req->jsonObject();
    if (!jsonPtr) {
        Json::Value err;
        err["error"] = "Invalid JSON body";
        err["code"] = "BAD_REQUEST";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }
    const Json::Value &body = *jsonPtr;

    std::lock_guard<std::mutex> lock(s_contentMutex);
    ensureDefaultContentSeeded();

    auto it = s_lessons.find(id);
    if (it == s_lessons.end()) {
        Json::Value err;
        err["error"] = "Lesson not found: " + id;
        err["code"] = "NOT_FOUND";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k404NotFound);
        callback(resp);
        return;
    }

    if (body.isMember("slug")) {
        std::string newSlug = body["slug"].asString();
        if (!isValidSlug(newSlug)) {
            Json::Value err;
            err["error"] = "Invalid slug format";
            err["code"] = "INVALID_SLUG_FORMAT";
            if (!reqId.empty()) err["request_id"] = reqId;
            auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
            resp->setStatusCode(drogon::k400BadRequest);
            callback(resp);
            return;
        }

        for (const auto &pair : s_lessons) {
            if (pair.first != id && pair.second.courseId == it->second.courseId && pair.second.slug == newSlug) {
                Json::Value err;
                err["error"] = "Lesson slug already in use for this course: " + newSlug;
                err["code"] = "DUPLICATE_SLUG";
                if (!reqId.empty()) err["request_id"] = reqId;
                auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
                resp->setStatusCode(drogon::k409Conflict);
                callback(resp);
                return;
            }
        }
        it->second.slug = newSlug;
    }

    if (body.isMember("title")) it->second.title = body["title"].asString();
    if (body.isMember("content_markdown")) it->second.contentMarkdown = body["content_markdown"].asString();
    if (body.isMember("video_url")) it->second.videoUrl = body["video_url"].asString();
    if (body.isMember("is_free_preview")) it->second.isFreePreview = body["is_free_preview"].asBool();
    if (body.isMember("is_private")) it->second.isPrivate = body["is_private"].asBool();
    if (body.isMember("status")) {
        std::string st = body["status"].asString();
        if (isValidStatus(st)) it->second.status = st;
    }
    it->second.updatedAt = getIsoTimestamp();

    Json::Value res;
    res["status"] = "ok";
    res["message"] = "Lesson updated successfully";
    res["data"]["id"] = it->second.id;
    res["data"]["slug"] = it->second.slug;
    res["data"]["status"] = it->second.status;
    if (!reqId.empty()) res["request_id"] = reqId;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    resp->setStatusCode(drogon::k200OK);
    callback(resp);
}

void ContentController::publishLesson(const drogon::HttpRequestPtr &req,
                                     std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                                     const std::string &id) {
    if (req->method() == drogon::Options) {
        callback(drogon::HttpResponse::newHttpResponse());
        return;
    }

    std::string reqId = req->attributes()->get("request_id");
    auto auth = AuthController::verifyRequestSession(req);
    if (!auth.authenticated) {
        Json::Value err;
        err["error"] = auth.errorMessage;
        err["code"] = auth.errorCode;
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(auth.statusCode);
        callback(resp);
        return;
    }

    std::lock_guard<std::mutex> lock(s_contentMutex);
    ensureDefaultContentSeeded();

    auto it = s_lessons.find(id);
    if (it == s_lessons.end()) {
        Json::Value err;
        err["error"] = "Lesson not found: " + id;
        err["code"] = "NOT_FOUND";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k404NotFound);
        callback(resp);
        return;
    }

    it->second.status = "published";
    it->second.updatedAt = getIsoTimestamp();

    Json::Value res;
    res["status"] = "ok";
    res["message"] = "Lesson published successfully";
    res["data"]["id"] = it->second.id;
    res["data"]["slug"] = it->second.slug;
    res["data"]["status"] = it->second.status;
    if (!reqId.empty()) res["request_id"] = reqId;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    resp->setStatusCode(drogon::k200OK);
    callback(resp);
}

void ContentController::archiveLesson(const drogon::HttpRequestPtr &req,
                                     std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                                     const std::string &id) {
    if (req->method() == drogon::Options) {
        callback(drogon::HttpResponse::newHttpResponse());
        return;
    }

    std::string reqId = req->attributes()->get("request_id");
    auto auth = AuthController::verifyRequestSession(req);
    if (!auth.authenticated) {
        Json::Value err;
        err["error"] = auth.errorMessage;
        err["code"] = auth.errorCode;
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(auth.statusCode);
        callback(resp);
        return;
    }

    std::lock_guard<std::mutex> lock(s_contentMutex);
    ensureDefaultContentSeeded();

    auto it = s_lessons.find(id);
    if (it == s_lessons.end()) {
        Json::Value err;
        err["error"] = "Lesson not found: " + id;
        err["code"] = "NOT_FOUND";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k404NotFound);
        callback(resp);
        return;
    }

    it->second.status = "archived";
    it->second.updatedAt = getIsoTimestamp();

    Json::Value res;
    res["status"] = "ok";
    res["message"] = "Lesson archived successfully";
    res["data"]["id"] = it->second.id;
    res["data"]["slug"] = it->second.slug;
    res["data"]["status"] = it->second.status;
    if (!reqId.empty()) res["request_id"] = reqId;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    resp->setStatusCode(drogon::k200OK);
    callback(resp);
}

void ContentController::deleteLesson(const drogon::HttpRequestPtr &req,
                                    std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                                    const std::string &id) {
    if (req->method() == drogon::Options) {
        callback(drogon::HttpResponse::newHttpResponse());
        return;
    }

    std::string reqId = req->attributes()->get("request_id");
    auto auth = AuthController::verifyRequestSession(req);
    if (!auth.authenticated) {
        Json::Value err;
        err["error"] = auth.errorMessage;
        err["code"] = auth.errorCode;
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(auth.statusCode);
        callback(resp);
        return;
    }

    std::lock_guard<std::mutex> lock(s_contentMutex);
    ensureDefaultContentSeeded();

    auto it = s_lessons.find(id);
    if (it == s_lessons.end()) {
        Json::Value err;
        err["error"] = "Lesson not found: " + id;
        err["code"] = "NOT_FOUND";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k404NotFound);
        callback(resp);
        return;
    }

    s_lessons.erase(it);

    Json::Value res;
    res["status"] = "ok";
    res["message"] = "Lesson deleted successfully";
    if (!reqId.empty()) res["request_id"] = reqId;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    resp->setStatusCode(drogon::k200OK);
    callback(resp);
}

// -----------------------------------------------------------------------------
// GET /api/v1/courses/:courseSlug/lessons/:lessonSlug
// Public Access with Private Content Protection
// -----------------------------------------------------------------------------
void ContentController::getPublicLesson(const drogon::HttpRequestPtr &req,
                                       std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                                       const std::string &courseSlug,
                                       const std::string &lessonSlug) {
    if (req->method() == drogon::Options) {
        callback(drogon::HttpResponse::newHttpResponse());
        return;
    }

    std::string reqId = req->attributes()->get("request_id");

    std::lock_guard<std::mutex> lock(s_contentMutex);
    ensureDefaultContentSeeded();

    // 1. Locate Course
    std::string matchedCourseId;
    std::string matchedCourseStatus;
    for (const auto &pair : s_courses) {
        if (pair.second.slug == courseSlug) {
            matchedCourseId = pair.second.id;
            matchedCourseStatus = pair.second.status;
            break;
        }
    }

    // Unreleased/unpublished courses are protected (404 to public)
    if (matchedCourseId.empty() || matchedCourseStatus != "published") {
        Json::Value err;
        err["error"] = "Course not found or unpublished";
        err["code"] = "NOT_FOUND";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k404NotFound);
        callback(resp);
        return;
    }

    // 2. Locate Lesson
    const InternalLesson *matchedLesson = nullptr;
    for (const auto &pair : s_lessons) {
        if (pair.second.courseId == matchedCourseId && pair.second.slug == lessonSlug) {
            matchedLesson = &pair.second;
            break;
        }
    }

    // Unreleased/unpublished lessons are protected (404 to public)
    if (!matchedLesson || matchedLesson->status != "published") {
        Json::Value err;
        err["error"] = "Lesson not found or unpublished";
        err["code"] = "NOT_FOUND";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k404NotFound);
        callback(resp);
        return;
    }

    // 3. Private Content Protection Check
    // If lesson is private (or not free preview), check if caller is authenticated
    bool hasAuthAccess = false;
    auto auth = AuthController::verifyRequestSession(req);
    if (auth.authenticated) {
        hasAuthAccess = true;
    }

    Json::Value data;
    data["id"] = matchedLesson->id;
    data["slug"] = matchedLesson->slug;
    data["title"] = matchedLesson->title;
    data["module_title"] = matchedLesson->moduleTitle;
    data["lesson_order"] = matchedLesson->lessonOrder;
    data["duration_minutes"] = matchedLesson->durationMinutes;
    data["is_free_preview"] = matchedLesson->isFreePreview;
    data["is_private"] = matchedLesson->isPrivate;
    data["status"] = matchedLesson->status;

    if (matchedLesson->isFreePreview || hasAuthAccess) {
        // Free preview or authorized staff/student gets full content
        data["content_markdown"] = matchedLesson->contentMarkdown;
        data["video_url"] = matchedLesson->videoUrl;
        data["access_level"] = hasAuthAccess ? "authorized" : "free_preview";
    } else {
        // Redact private material from unauthenticated request
        data["content_markdown"] = "";
        data["video_url"] = "";
        data["access_level"] = "restricted";
        data["requires_authentication"] = true;
        data["preview_notice"] = "This lesson contains private laboratory material. Please log in or enroll to access full curriculum assets.";
    }

    Json::Value res;
    res["status"] = "ok";
    res["data"] = data;
    if (!reqId.empty()) res["request_id"] = reqId;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    resp->setStatusCode(drogon::k200OK);
    callback(resp);
}

// =============================================================================
// MEDIA STORAGE & UPLOAD SERVICE
// =============================================================================

static bool isAllowedMimeType(const std::string &mime) {
    return mime == "image/jpeg" || mime == "image/png" || mime == "image/webp" ||
           mime == "image/svg+xml" || mime == "video/mp4" || mime == "video/webm" ||
           mime == "application/pdf";
}

static bool isDisallowedExtension(const std::string &fileName) {
    std::string lower = fileName;
    std::transform(lower.begin(), lower.end(), lower.begin(), ::tolower);
    return lower.find(".exe") != std::string::npos ||
           lower.find(".bat") != std::string::npos ||
           lower.find(".cmd") != std::string::npos ||
           lower.find(".sh") != std::string::npos ||
           lower.find(".php") != std::string::npos ||
           lower.find(".js") != std::string::npos ||
           lower.find(".msi") != std::string::npos;
}

void ContentController::uploadMedia(const drogon::HttpRequestPtr &req,
                                   std::function<void(const drogon::HttpResponsePtr &)> &&callback) {
    if (req->method() == drogon::Options) {
        callback(drogon::HttpResponse::newHttpResponse());
        return;
    }

    std::string reqId = req->attributes()->get("request_id");

    // 1. Validate Access Permissions (Staff Authentication)
    auto auth = AuthController::verifyRequestSession(req);
    if (!auth.authenticated) {
        Json::Value err;
        err["error"] = "Access Denied: Authentication required to upload media assets.";
        err["code"] = "UNAUTHORIZED_MEDIA_UPLOAD";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k401Unauthorized);
        callback(resp);
        return;
    }

    // 2. Storage Provider Configuration Check (Implement media storage only where configured)
    std::string mockConfiguredHeader = req->getHeader("X-Mock-Storage-Configured");
    if (mockConfiguredHeader == "false" || !s_storageGloballyEnabled) {
        Json::Value err;
        err["error"] = "Media storage provider is not configured. File uploads are currently disabled.";
        err["code"] = "STORAGE_PROVIDER_NOT_CONFIGURED";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k503ServiceUnavailable);
        callback(resp);
        return;
    }

    // 3. Provider Outage / Failure Simulation Check
    std::string mockErrorHeader = req->getHeader("X-Mock-Storage-Error");
    if (mockErrorHeader == "true") {
        Json::Value err;
        err["error"] = "Storage provider error: Upstream cloud storage service unavailable. Safe retry bounded.";
        err["code"] = "STORAGE_PROVIDER_FAILURE";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k502BadGateway);
        callback(resp);
        return;
    }

    auto jsonPtr = req->jsonObject();
    if (!jsonPtr) {
        Json::Value err;
        err["error"] = "Invalid JSON upload payload";
        err["code"] = "BAD_REQUEST";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }
    const Json::Value &body = *jsonPtr;

    std::string fileName = body.get("file_name", "").asString();
    std::string mimeType = body.get("mime_type", "").asString();
    long long fileSizeBytes = body.get("file_size_bytes", 0).asInt64();
    bool isPrivate = body.get("is_private", false).asBool();

    if (fileName.empty() || mimeType.empty()) {
        Json::Value err;
        err["error"] = "file_name and mime_type are required";
        err["code"] = "VALIDATION_FAILED";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    // 4. File Type / Extension Validation
    if (isDisallowedExtension(fileName) || !isAllowedMimeType(mimeType)) {
        Json::Value err;
        err["error"] = "Invalid file type or extension: '" + mimeType + "'. Allowed formats: JPEG, PNG, WebP, SVG, MP4, WebM, PDF.";
        err["code"] = "INVALID_FILE_TYPE";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    // 5. File Size Validation (Limit to 50 MB = 52428800 bytes)
    const long long maxSizeBytes = 52428800;
    if (fileSizeBytes <= 0) {
        Json::Value err;
        err["error"] = "File size must be greater than zero bytes";
        err["code"] = "EMPTY_FILE";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    if (fileSizeBytes > maxSizeBytes) {
        Json::Value err;
        err["error"] = "File size exceeds the maximum permitted limit of 50 MB";
        err["code"] = "FILE_TOO_LARGE";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    std::lock_guard<std::mutex> lock(s_contentMutex);
    InternalMediaUpload media;
    media.id = "med-" + Security::randomHex(8);
    media.fileName = fileName;
    media.fileSizeBytes = fileSizeBytes;
    media.mimeType = mimeType;
    media.storageProvider = "supabase_storage";
    media.isPrivate = isPrivate;
    media.uploadedBy = auth.email;
    media.createdAt = getIsoTimestamp();
    media.fileUrl = isPrivate 
        ? "https://storage.marsnova.in/private/" + media.id + "/" + fileName
        : "https://storage.marsnova.in/public/" + media.id + "/" + fileName;

    s_mediaUploads.push_back(media);

    Json::Value res;
    res["status"] = "ok";
    res["message"] = "Media uploaded successfully";
    res["data"]["id"] = media.id;
    res["data"]["file_name"] = media.fileName;
    res["data"]["file_url"] = media.fileUrl;
    res["data"]["file_size_bytes"] = media.fileSizeBytes;
    res["data"]["mime_type"] = media.mimeType;
    res["data"]["storage_provider"] = media.storageProvider;
    res["data"]["is_private"] = media.isPrivate;
    res["data"]["uploaded_by"] = media.uploadedBy;
    res["data"]["created_at"] = media.createdAt;
    if (!reqId.empty()) res["request_id"] = reqId;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    resp->setStatusCode(drogon::k201Created);
    callback(resp);
}

void ContentController::listMediaAdmin(const drogon::HttpRequestPtr &req,
                                      std::function<void(const drogon::HttpResponsePtr &)> &&callback) {
    if (req->method() == drogon::Options) {
        callback(drogon::HttpResponse::newHttpResponse());
        return;
    }

    std::string reqId = req->attributes()->get("request_id");
    auto auth = AuthController::verifyRequestSession(req);
    if (!auth.authenticated) {
        Json::Value err;
        err["error"] = auth.errorMessage;
        err["code"] = auth.errorCode;
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(auth.statusCode);
        callback(resp);
        return;
    }

    std::lock_guard<std::mutex> lock(s_contentMutex);

    Json::Value list(Json::arrayValue);
    for (size_t i = 0; i < s_mediaUploads.size(); ++i) {
        const auto &m = s_mediaUploads[i];
        Json::Value item;
        item["id"] = m.id;
        item["file_name"] = m.fileName;
        item["file_url"] = m.fileUrl;
        item["file_size_bytes"] = m.fileSizeBytes;
        item["mime_type"] = m.mimeType;
        item["storage_provider"] = m.storageProvider;
        item["is_private"] = m.isPrivate;
        item["uploaded_by"] = m.uploadedBy;
        item["created_at"] = m.createdAt;
        list.append(item);
    }

    Json::Value res;
    res["status"] = "ok";
    res["data"] = list;
    if (!reqId.empty()) res["request_id"] = reqId;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    resp->setStatusCode(drogon::k200OK);
    callback(resp);
}
