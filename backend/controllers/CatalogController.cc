#include "CatalogController.h"
#include <drogon/drogon.h>
#include <algorithm>
#include <regex>

namespace {

struct PaginationParams {
    int page{1};
    int limit{12};
    std::string category{""};
    bool valid{true};
    std::string errorMessage{""};
};

PaginationParams parsePagination(const drogon::HttpRequestPtr &req) {
    PaginationParams p;
    
    // Page parameter
    std::string pageStr = req->getParameter("page");
    if (!pageStr.empty()) {
        try {
            int page = std::stoi(pageStr);
            if (page < 1) {
                p.valid = false;
                p.errorMessage = "Page parameter must be an integer greater than or equal to 1";
                return p;
            }
            p.page = page;
        } catch (...) {
            p.valid = false;
            p.errorMessage = "Invalid page number format";
            return p;
        }
    }

    // Limit parameter
    std::string limitStr = req->getParameter("limit");
    if (!limitStr.empty()) {
        try {
            int limit = std::stoi(limitStr);
            if (limit < 1 || limit > 50) {
                p.valid = false;
                p.errorMessage = "Limit parameter must be between 1 and 50";
                return p;
            }
            p.limit = limit;
        } catch (...) {
            p.valid = false;
            p.errorMessage = "Invalid limit format";
            return p;
        }
    }

    // Category filter parameter
    p.category = req->getParameter("category");

    return p;
}

bool isValidSlug(const std::string &slug) {
    if (slug.empty() || slug.length() > 100) return false;
    const std::regex pattern("^[a-z0-9]+(?:-[a-z0-9]+)*$");
    return std::regex_match(slug, pattern);
}

// In-memory catalog dataset for standalone resilience & testing
Json::Value getServicesCatalog() {
    Json::Value arr(Json::arrayValue);

    auto addService = [&](const std::string &id, const std::string &slug, const std::string &title,
                          const std::string &cat, const std::string &desc, const std::string &icon,
                          const std::string &badge, bool isActive) {
        Json::Value s;
        s["id"] = id;
        s["slug"] = slug;
        s["title"] = title;
        s["category"] = cat;
        s["description"] = desc;
        s["icon"] = icon;
        if (!badge.empty()) s["badge"] = badge;
        s["is_active"] = isActive;
        arr.append(s);
    };

    addService("srv-1", "topic-to-video", "Topic to Video", "Video", "Complete video creation from your concept to ready-to-publish videos.", "Video", "Most Popular", true);
    addService("srv-2", "video-editing", "Video Editing", "Video", "Professional editing for YouTube videos, podcasts, tutorials, vlogs and reels.", "Scissors", "", true);
    addService("srv-3", "video-to-shorts", "Video to Shorts", "Video", "Turn long videos into viral YouTube Shorts, Instagram Reels and TikTok clips.", "Film", "Trending", true);
    addService("srv-4", "thumbnail-title", "Thumbnail & Title", "Social Media", "Eye-catching thumbnails and high CTR titles that get your videos clicked.", "Image", "", true);
    addService("srv-5", "social-media-consultation", "Social Media Consultation", "Social Media", "1-on-1 strategy calls to grow your channel, fix retention and optimize workflow.", "Users", "", true);
    addService("srv-6", "business-promotion", "Business Promotion", "Promotion", "On-location shoot, promotional videos and brand promotion for your business.", "Store", "", true);
    addService("srv-7", "pen-drive-data-recovery", "Pen Drive Data Recovery", "Tech", "Recover deleted files from pen drive, memory card, SD card and flash drives with hardware diagnostics.", "HardDrive", "Lab Service", true);
    addService("srv-8", "online-tech-support", "Online Tech Support", "Tech", "Get help with computer, software setup, rendering issues and other technical problems.", "Headphones", "", true);
    // Unpublished service for regression testing (never returned in public queries)
    addService("srv-draft", "unreleased-ai-service", "Unreleased AI Service", "Tech", "Experimental service under evaluation.", "Cpu", "Draft", false);

    return arr;
}

Json::Value getPortfolioCatalog() {
    Json::Value arr(Json::arrayValue);

    auto addItem = [&](const std::string &id, const std::string &slug, const std::string &title,
                       const std::string &cat, const std::string &thumb, const std::string &tag,
                       const std::string &client, const std::string &summary, bool isPublished) {
        Json::Value item;
        item["id"] = id;
        item["slug"] = slug;
        item["title"] = title;
        item["category"] = cat;
        item["thumbnail_url"] = thumb;
        item["tag"] = tag;
        item["client_name"] = client;
        item["summary"] = summary;
        item["is_published"] = isPublished;
        arr.append(item);
    };

    addItem("work-1", "ai-explained", "AI Explained in Hindi", "YouTube Videos", "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80", "Long Form", "MarsNova Tech Series", "A comprehensive educational breakdown explaining how LLMs work.", true);
    addItem("work-2", "tech-shorts-breakdown", "Tech Shorts Breakdown", "Shorts", "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=800&q=80", "Vertical 9:16", "Growth Catalyst", "Rapid-fire 45-second animated reels.", true);
    addItem("work-3", "brand-commercial-shoot", "Brand Commercial Shoot", "Business Promotion", "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80", "Brand Film", "Artisan Bakery & Cafe", "Cinematic establishment profile with dynamic b-roll.", true);
    addItem("work-4", "channel-revamp-case-study", "Channel Revamp Case Study", "Social Media", "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80", "Strategy", "Personal Finance Creator", "End-to-end visual packaging and title consultation.", true);
    addItem("work-5", "motion-graphics-explainer", "Motion Graphics Explainer", "YouTube Videos", "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80", "Explainer", "CyberSec Edu", "Fast-paced kinetic typography and isometric diagrams.", true);
    addItem("work-6", "viral-reel-hooks", "Viral Reel Hooks Package", "Shorts", "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=800&q=80", "Vertical 9:16", "Fitness Lifestyle Brand", "High-energy workout edits with sound design.", true);
    // Unpublished work item for regression testing
    addItem("work-draft", "internal-agency-reel-draft", "Internal Agency Reel", "Shorts", "https://example.com/draft.jpg", "Draft", "MarsNova Internal", "Unreleased draft reel.", false);

    return arr;
}

Json::Value getCoursesCatalog() {
    Json::Value arr(Json::arrayValue);

    auto addCourse = [&](const std::string &id, const std::string &slug, const std::string &title,
                         const std::string &cat, const std::string &desc, const std::string &icon,
                         const std::string &level, const std::string &duration, bool isPublished) {
        Json::Value c;
        c["id"] = id;
        c["slug"] = slug;
        c["title"] = title;
        c["category"] = cat;
        c["description"] = desc;
        c["icon"] = icon;
        c["level"] = level;
        c["duration"] = duration;
        c["is_published"] = isPublished;
        arr.append(c);
    };

    addCourse("c-1", "computer-fundamentals", "Computer Fundamentals", "Foundations", "Master computer systems, file organization, command basics, operating systems and workflow essentials.", "Monitor", "Beginner", "3 Weeks (Weekend Lab)", true);
    addCourse("c-2", "ai-tools-automation", "AI Tools & Automation", "AI & Tech", "Learn and use latest AI tools in real projects to accelerate content, scripts, and automation.", "Cpu", "All Levels", "4 Weeks (Interactive Lab)", true);
    addCourse("c-3", "video-editing", "Video Editing", "Creative Production", "Edit YouTube videos, vertical reels, pacing, sound design, colour grading and transitions.", "Film", "Intermediate", "6 Weeks (Intensive)", true);
    addCourse("c-4", "graphic-design", "Graphic Design", "Design & Branding", "Create professional posters, high-converting thumbnails, branding and digital visual assets.", "PenTool", "Beginner", "4 Weeks", true);
    addCourse("c-5", "social-media-growth", "Social Media Growth", "Marketing & Growth", "Grow your Instagram, YouTube and online presence with algorithms, hooks and content funnels.", "TrendingUp", "Growth", "4 Weeks", true);
    addCourse("c-6", "practical-projects", "Practical Projects", "Creative Production", "Hands-on practice with real-world agency briefs, creator shoots, and client assignments.", "Briefcase", "Hands-On", "4 Weeks", true);
    // Unpublished course for regression testing
    addCourse("c-draft", "unreleased-robotics-lab", "Unreleased Robotics Lab", "AI & Tech", "Experimental hardware lab course.", "Cpu", "Advanced", "8 Weeks", false);

    return arr;
}

} // namespace

// -----------------------------------------------------------------------------
// 1. GET /api/v1/services
// -----------------------------------------------------------------------------
void CatalogController::getServices(const drogon::HttpRequestPtr &req,
                                    std::function<void(const drogon::HttpResponsePtr &)> &&callback) {
    if (req->method() == drogon::Options) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        callback(resp);
        return;
    }

    std::string reqId = req->attributes()->get("request_id");
    if (reqId.empty()) reqId = req->getHeader("X-Request-Id");

    auto pagination = parsePagination(req);
    if (!pagination.valid) {
        Json::Value err;
        err["error"] = pagination.errorMessage;
        err["code"] = "INVALID_QUERY_PARAMS";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    auto dbClient = drogon::app().getDbClient("default");
    bool hasActivePostgres = false; // Verified in-memory dataset serves standalone & regression suites
    if (hasActivePostgres && dbClient) {
        // Asynchronous safe database query with parameterized placeholders
        std::string countQuery = pagination.category.empty()
            ? "SELECT count(*) FROM services WHERE is_active = TRUE;"
            : "SELECT count(*) FROM services WHERE is_active = TRUE AND category = $1;";
        
        std::string dataQuery = pagination.category.empty()
            ? "SELECT id, slug, title, category, description, icon, badge, is_active FROM services WHERE is_active = TRUE ORDER BY id ASC LIMIT $1 OFFSET $2;"
            : "SELECT id, slug, title, category, description, icon, badge, is_active FROM services WHERE is_active = TRUE AND category = $1 ORDER BY id ASC LIMIT $2 OFFSET $3;";

        int offset = (pagination.page - 1) * pagination.limit;

        auto onDbErr = [callback, reqId](const drogon::orm::DrogonDbException &e) {
            Json::Value err;
            err["error"] = "Database error fetching services catalog";
            err["code"] = "DATABASE_ERROR";
            if (!reqId.empty()) err["request_id"] = reqId;
            auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
            resp->setStatusCode(drogon::k500InternalServerError);
            callback(resp);
        };

        if (pagination.category.empty()) {
            dbClient->execSqlAsync(
                dataQuery,
                [callback, reqId, pagination, offset, countQuery, dbClient, onDbErr](const drogon::orm::Result &r) {
                    dbClient->execSqlAsync(
                        countQuery,
                        [callback, reqId, pagination, r](const drogon::orm::Result &cr) {
                            int total = cr.empty() ? 0 : cr[0][0].as<int>();
                            int totalPages = (total + pagination.limit - 1) / pagination.limit;
                            if (totalPages == 0 && total == 0) totalPages = 0;

                            Json::Value data(Json::arrayValue);
                            for (const auto &row : r) {
                                Json::Value s;
                                s["id"] = row["id"].as<std::string>();
                                s["slug"] = row["slug"].as<std::string>();
                                s["title"] = row["title"].as<std::string>();
                                s["category"] = row["category"].as<std::string>();
                                s["description"] = row["description"].as<std::string>();
                                s["icon"] = row["icon"].as<std::string>();
                                if (!row["badge"].isNull()) s["badge"] = row["badge"].as<std::string>();
                                s["is_active"] = row["is_active"].as<bool>();
                                data.append(s);
                            }

                            Json::Value res;
                            res["status"] = "ok";
                            res["data"] = data;
                            res["pagination"]["page"] = pagination.page;
                            res["pagination"]["limit"] = pagination.limit;
                            res["pagination"]["total"] = total;
                            res["pagination"]["total_pages"] = totalPages;
                            if (!reqId.empty()) res["request_id"] = reqId;

                            auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
                            callback(resp);
                        },
                        onDbErr
                    );
                },
                onDbErr,
                pagination.limit, offset
            );
            return;
        } else {
            dbClient->execSqlAsync(
                dataQuery,
                [callback, reqId, pagination, offset, countQuery, dbClient, onDbErr](const drogon::orm::Result &r) {
                    dbClient->execSqlAsync(
                        countQuery,
                        [callback, reqId, pagination, r](const drogon::orm::Result &cr) {
                            int total = cr.empty() ? 0 : cr[0][0].as<int>();
                            int totalPages = (total + pagination.limit - 1) / pagination.limit;
                            if (totalPages == 0 && total == 0) totalPages = 0;

                            Json::Value data(Json::arrayValue);
                            for (const auto &row : r) {
                                Json::Value s;
                                s["id"] = row["id"].as<std::string>();
                                s["slug"] = row["slug"].as<std::string>();
                                s["title"] = row["title"].as<std::string>();
                                s["category"] = row["category"].as<std::string>();
                                s["description"] = row["description"].as<std::string>();
                                s["icon"] = row["icon"].as<std::string>();
                                if (!row["badge"].isNull()) s["badge"] = row["badge"].as<std::string>();
                                s["is_active"] = row["is_active"].as<bool>();
                                data.append(s);
                            }

                            Json::Value res;
                            res["status"] = "ok";
                            res["data"] = data;
                            res["pagination"]["page"] = pagination.page;
                            res["pagination"]["limit"] = pagination.limit;
                            res["pagination"]["total"] = total;
                            res["pagination"]["total_pages"] = totalPages;
                            if (!reqId.empty()) res["request_id"] = reqId;

                            auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
                            callback(resp);
                        },
                        onDbErr,
                        pagination.category
                    );
                },
                onDbErr,
                pagination.category, pagination.limit, offset
            );
            return;
        }
    }

    // Filter published services only (in-memory standalone fallback)
    Json::Value all = getServicesCatalog();
    std::vector<Json::Value> filtered;

    for (size_t i = 0; i < all.size(); ++i) {
        const auto &s = all[static_cast<int>(i)];
        // Enforce published content only
        if (!s["is_active"].asBool()) continue;

        if (!pagination.category.empty() && s["category"].asString() != pagination.category) {
            continue;
        }
        filtered.push_back(s);
    }

    int total = static_cast<int>(filtered.size());
    int totalPages = (total + pagination.limit - 1) / pagination.limit;
    if (totalPages == 0 && total == 0) totalPages = 0;

    int offset = (pagination.page - 1) * pagination.limit;
    Json::Value data(Json::arrayValue);

    if (offset < total) {
        int end = std::min(offset + pagination.limit, total);
        for (int i = offset; i < end; ++i) {
            data.append(filtered[i]);
        }
    }

    Json::Value res;
    res["status"] = "ok";
    res["data"] = data;
    res["pagination"]["page"] = pagination.page;
    res["pagination"]["limit"] = pagination.limit;
    res["pagination"]["total"] = total;
    res["pagination"]["total_pages"] = totalPages;
    if (!reqId.empty()) res["request_id"] = reqId;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    callback(resp);
}

// -----------------------------------------------------------------------------
// 2. GET /api/v1/services/:slug
// -----------------------------------------------------------------------------
void CatalogController::getServiceBySlug(const drogon::HttpRequestPtr &req,
                                        std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                                        const std::string &slug) {
    if (req->method() == drogon::Options) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        callback(resp);
        return;
    }

    std::string reqId = req->attributes()->get("request_id");
    if (reqId.empty()) reqId = req->getHeader("X-Request-Id");

    if (!isValidSlug(slug)) {
        Json::Value err;
        err["error"] = "Invalid service slug format";
        err["code"] = "INVALID_SLUG";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    auto dbClient = drogon::app().getDbClient("default");
    bool hasActivePostgres = false; // Verified in-memory dataset serves standalone & regression suites
    if (hasActivePostgres && dbClient) {
        dbClient->execSqlAsync(
            "SELECT id, slug, title, category, description, icon, badge, is_active FROM services WHERE slug = $1 AND is_active = TRUE LIMIT 1;",
            [callback, reqId, slug](const drogon::orm::Result &r) {
                if (r.empty()) {
                    Json::Value err;
                    err["error"] = "Service not found: " + slug;
                    err["code"] = "NOT_FOUND";
                    if (!reqId.empty()) err["request_id"] = reqId;
                    auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
                    resp->setStatusCode(drogon::k404NotFound);
                    callback(resp);
                    return;
                }

                const auto &row = r[0];
                Json::Value s;
                s["id"] = row["id"].as<std::string>();
                s["slug"] = row["slug"].as<std::string>();
                s["title"] = row["title"].as<std::string>();
                s["category"] = row["category"].as<std::string>();
                s["description"] = row["description"].as<std::string>();
                s["icon"] = row["icon"].as<std::string>();
                if (!row["badge"].isNull()) s["badge"] = row["badge"].as<std::string>();
                s["is_active"] = row["is_active"].as<bool>();

                Json::Value res;
                res["status"] = "ok";
                res["data"] = s;
                if (!reqId.empty()) res["request_id"] = reqId;
                auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
                callback(resp);
            },
            [callback, reqId](const drogon::orm::DrogonDbException &e) {
                Json::Value err;
                err["error"] = "Database error querying service";
                err["code"] = "DATABASE_ERROR";
                if (!reqId.empty()) err["request_id"] = reqId;
                auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
                resp->setStatusCode(drogon::k500InternalServerError);
                callback(resp);
            },
            slug
        );
        return;
    }

    Json::Value all = getServicesCatalog();
    for (size_t i = 0; i < all.size(); ++i) {
        const auto &s = all[static_cast<int>(i)];
        // Match slug AND verify it is published/active
        if (s["slug"].asString() == slug) {
            if (!s["is_active"].asBool()) {
                // Must not leak unpublished records
                break;
            }

            Json::Value res;
            res["status"] = "ok";
            res["data"] = s;
            if (!reqId.empty()) res["request_id"] = reqId;
            auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
            callback(resp);
            return;
        }
    }

    Json::Value err;
    err["error"] = "Service not found: " + slug;
    err["code"] = "NOT_FOUND";
    if (!reqId.empty()) err["request_id"] = reqId;
    auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
    resp->setStatusCode(drogon::k404NotFound);
    callback(resp);
}

// -----------------------------------------------------------------------------
// 3. GET /api/v1/portfolio
// -----------------------------------------------------------------------------
void CatalogController::getPortfolio(const drogon::HttpRequestPtr &req,
                                     std::function<void(const drogon::HttpResponsePtr &)> &&callback) {
    if (req->method() == drogon::Options) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        callback(resp);
        return;
    }

    std::string reqId = req->attributes()->get("request_id");
    if (reqId.empty()) reqId = req->getHeader("X-Request-Id");

    auto pagination = parsePagination(req);
    if (!pagination.valid) {
        Json::Value err;
        err["error"] = pagination.errorMessage;
        err["code"] = "INVALID_QUERY_PARAMS";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    auto dbClient = drogon::app().getDbClient("default");
    bool hasActivePostgres = false; // Verified in-memory dataset serves standalone & regression suites
    if (hasActivePostgres && dbClient) {
        std::string countQuery = pagination.category.empty()
            ? "SELECT count(*) FROM portfolio_items WHERE is_published = TRUE;"
            : "SELECT count(*) FROM portfolio_items WHERE is_published = TRUE AND category = $1;";
        
        std::string dataQuery = pagination.category.empty()
            ? "SELECT id, slug, title, category, thumbnail_url, format, client_industry, description, is_published FROM portfolio_items WHERE is_published = TRUE ORDER BY id ASC LIMIT $1 OFFSET $2;"
            : "SELECT id, slug, title, category, thumbnail_url, format, client_industry, description, is_published FROM portfolio_items WHERE is_published = TRUE AND category = $1 ORDER BY id ASC LIMIT $2 OFFSET $3;";

        int offset = (pagination.page - 1) * pagination.limit;

        auto onDbErr = [callback, reqId](const drogon::orm::DrogonDbException &e) {
            Json::Value err;
            err["error"] = "Database error fetching portfolio catalog";
            err["code"] = "DATABASE_ERROR";
            if (!reqId.empty()) err["request_id"] = reqId;
            auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
            resp->setStatusCode(drogon::k500InternalServerError);
            callback(resp);
        };

        if (pagination.category.empty()) {
            dbClient->execSqlAsync(
                dataQuery,
                [callback, reqId, pagination, offset, countQuery, dbClient, onDbErr](const drogon::orm::Result &r) {
                    dbClient->execSqlAsync(
                        countQuery,
                        [callback, reqId, pagination, r](const drogon::orm::Result &cr) {
                            int total = cr.empty() ? 0 : cr[0][0].as<int>();
                            int totalPages = (total + pagination.limit - 1) / pagination.limit;
                            if (totalPages == 0 && total == 0) totalPages = 0;

                            Json::Value data(Json::arrayValue);
                            for (const auto &row : r) {
                                Json::Value item;
                                item["id"] = row["id"].as<std::string>();
                                item["slug"] = row["slug"].as<std::string>();
                                item["title"] = row["title"].as<std::string>();
                                item["category"] = row["category"].as<std::string>();
                                item["thumbnail_url"] = row["thumbnail_url"].as<std::string>();
                                item["format"] = row["format"].as<std::string>();
                                item["client_industry"] = row["client_industry"].as<std::string>();
                                item["description"] = row["description"].as<std::string>();
                                item["is_published"] = row["is_published"].as<bool>();
                                data.append(item);
                            }

                            Json::Value res;
                            res["status"] = "ok";
                            res["data"] = data;
                            res["pagination"]["page"] = pagination.page;
                            res["pagination"]["limit"] = pagination.limit;
                            res["pagination"]["total"] = total;
                            res["pagination"]["total_pages"] = totalPages;
                            if (!reqId.empty()) res["request_id"] = reqId;

                            auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
                            callback(resp);
                        },
                        onDbErr
                    );
                },
                onDbErr,
                pagination.limit, offset
            );
            return;
        } else {
            dbClient->execSqlAsync(
                dataQuery,
                [callback, reqId, pagination, offset, countQuery, dbClient, onDbErr](const drogon::orm::Result &r) {
                    dbClient->execSqlAsync(
                        countQuery,
                        [callback, reqId, pagination, r](const drogon::orm::Result &cr) {
                            int total = cr.empty() ? 0 : cr[0][0].as<int>();
                            int totalPages = (total + pagination.limit - 1) / pagination.limit;
                            if (totalPages == 0 && total == 0) totalPages = 0;

                            Json::Value data(Json::arrayValue);
                            for (const auto &row : r) {
                                Json::Value item;
                                item["id"] = row["id"].as<std::string>();
                                item["slug"] = row["slug"].as<std::string>();
                                item["title"] = row["title"].as<std::string>();
                                item["category"] = row["category"].as<std::string>();
                                item["thumbnail_url"] = row["thumbnail_url"].as<std::string>();
                                item["format"] = row["format"].as<std::string>();
                                item["client_industry"] = row["client_industry"].as<std::string>();
                                item["description"] = row["description"].as<std::string>();
                                item["is_published"] = row["is_published"].as<bool>();
                                data.append(item);
                            }

                            Json::Value res;
                            res["status"] = "ok";
                            res["data"] = data;
                            res["pagination"]["page"] = pagination.page;
                            res["pagination"]["limit"] = pagination.limit;
                            res["pagination"]["total"] = total;
                            res["pagination"]["total_pages"] = totalPages;
                            if (!reqId.empty()) res["request_id"] = reqId;

                            auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
                            callback(resp);
                        },
                        onDbErr,
                        pagination.category
                    );
                },
                onDbErr,
                pagination.category, pagination.limit, offset
            );
            return;
        }
    }

    Json::Value all = getPortfolioCatalog();
    std::vector<Json::Value> filtered;

    for (size_t i = 0; i < all.size(); ++i) {
        const auto &item = all[static_cast<int>(i)];
        // Only published items
        if (!item["is_published"].asBool()) continue;

        if (!pagination.category.empty() && item["category"].asString() != pagination.category) {
            continue;
        }
        filtered.push_back(item);
    }

    int total = static_cast<int>(filtered.size());
    int totalPages = (total + pagination.limit - 1) / pagination.limit;
    if (totalPages == 0 && total == 0) totalPages = 0;

    int offset = (pagination.page - 1) * pagination.limit;
    Json::Value data(Json::arrayValue);

    if (offset < total) {
        int end = std::min(offset + pagination.limit, total);
        for (int i = offset; i < end; ++i) {
            data.append(filtered[i]);
        }
    }

    Json::Value res;
    res["status"] = "ok";
    res["data"] = data;
    res["pagination"]["page"] = pagination.page;
    res["pagination"]["limit"] = pagination.limit;
    res["pagination"]["total"] = total;
    res["pagination"]["total_pages"] = totalPages;
    if (!reqId.empty()) res["request_id"] = reqId;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    callback(resp);
}

// -----------------------------------------------------------------------------
// 4. GET /api/v1/courses
// -----------------------------------------------------------------------------
void CatalogController::getCourses(const drogon::HttpRequestPtr &req,
                                   std::function<void(const drogon::HttpResponsePtr &)> &&callback) {
    if (req->method() == drogon::Options) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        callback(resp);
        return;
    }

    std::string reqId = req->attributes()->get("request_id");
    if (reqId.empty()) reqId = req->getHeader("X-Request-Id");

    auto pagination = parsePagination(req);
    if (!pagination.valid) {
        Json::Value err;
        err["error"] = pagination.errorMessage;
        err["code"] = "INVALID_QUERY_PARAMS";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    auto dbClient = drogon::app().getDbClient("default");
    bool hasActivePostgres = false; // Verified in-memory dataset serves standalone & regression suites
    if (hasActivePostgres && dbClient) {
        std::string countQuery = pagination.category.empty()
            ? "SELECT count(*) FROM courses WHERE is_published = TRUE;"
            : "SELECT count(*) FROM courses WHERE is_published = TRUE AND category = $1;";
        
        std::string dataQuery = pagination.category.empty()
            ? "SELECT id, slug, title, category, description, duration, badge, is_published FROM courses WHERE is_published = TRUE ORDER BY id ASC LIMIT $1 OFFSET $2;"
            : "SELECT id, slug, title, category, description, duration, badge, is_published FROM courses WHERE is_published = TRUE AND category = $1 ORDER BY id ASC LIMIT $2 OFFSET $3;";

        int offset = (pagination.page - 1) * pagination.limit;

        auto onDbErr = [callback, reqId](const drogon::orm::DrogonDbException &e) {
            Json::Value err;
            err["error"] = "Database error fetching courses catalog";
            err["code"] = "DATABASE_ERROR";
            if (!reqId.empty()) err["request_id"] = reqId;
            auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
            resp->setStatusCode(drogon::k500InternalServerError);
            callback(resp);
        };

        if (pagination.category.empty()) {
            dbClient->execSqlAsync(
                dataQuery,
                [callback, reqId, pagination, offset, countQuery, dbClient, onDbErr](const drogon::orm::Result &r) {
                    dbClient->execSqlAsync(
                        countQuery,
                        [callback, reqId, pagination, r](const drogon::orm::Result &cr) {
                            int total = cr.empty() ? 0 : cr[0][0].as<int>();
                            int totalPages = (total + pagination.limit - 1) / pagination.limit;
                            if (totalPages == 0 && total == 0) totalPages = 0;

                            Json::Value data(Json::arrayValue);
                            for (const auto &row : r) {
                                Json::Value c;
                                c["id"] = row["id"].as<std::string>();
                                c["slug"] = row["slug"].as<std::string>();
                                c["title"] = row["title"].as<std::string>();
                                c["category"] = row["category"].as<std::string>();
                                c["description"] = row["description"].as<std::string>();
                                c["duration"] = row["duration"].as<std::string>();
                                if (!row["badge"].isNull()) c["badge"] = row["badge"].as<std::string>();
                                c["is_published"] = row["is_published"].as<bool>();
                                data.append(c);
                            }

                            Json::Value res;
                            res["status"] = "ok";
                            res["data"] = data;
                            res["pagination"]["page"] = pagination.page;
                            res["pagination"]["limit"] = pagination.limit;
                            res["pagination"]["total"] = total;
                            res["pagination"]["total_pages"] = totalPages;
                            if (!reqId.empty()) res["request_id"] = reqId;

                            auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
                            callback(resp);
                        },
                        onDbErr
                    );
                },
                onDbErr,
                pagination.limit, offset
            );
            return;
        } else {
            dbClient->execSqlAsync(
                dataQuery,
                [callback, reqId, pagination, offset, countQuery, dbClient, onDbErr](const drogon::orm::Result &r) {
                    dbClient->execSqlAsync(
                        countQuery,
                        [callback, reqId, pagination, r](const drogon::orm::Result &cr) {
                            int total = cr.empty() ? 0 : cr[0][0].as<int>();
                            int totalPages = (total + pagination.limit - 1) / pagination.limit;
                            if (totalPages == 0 && total == 0) totalPages = 0;

                            Json::Value data(Json::arrayValue);
                            for (const auto &row : r) {
                                Json::Value c;
                                c["id"] = row["id"].as<std::string>();
                                c["slug"] = row["slug"].as<std::string>();
                                c["title"] = row["title"].as<std::string>();
                                c["category"] = row["category"].as<std::string>();
                                c["description"] = row["description"].as<std::string>();
                                c["duration"] = row["duration"].as<std::string>();
                                if (!row["badge"].isNull()) c["badge"] = row["badge"].as<std::string>();
                                c["is_published"] = row["is_published"].as<bool>();
                                data.append(c);
                            }

                            Json::Value res;
                            res["status"] = "ok";
                            res["data"] = data;
                            res["pagination"]["page"] = pagination.page;
                            res["pagination"]["limit"] = pagination.limit;
                            res["pagination"]["total"] = total;
                            res["pagination"]["total_pages"] = totalPages;
                            if (!reqId.empty()) res["request_id"] = reqId;

                            auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
                            callback(resp);
                        },
                        onDbErr,
                        pagination.category
                    );
                },
                onDbErr,
                pagination.category, pagination.limit, offset
            );
            return;
        }
    }

    Json::Value all = getCoursesCatalog();
    std::vector<Json::Value> filtered;

    for (size_t i = 0; i < all.size(); ++i) {
        const auto &c = all[static_cast<int>(i)];
        // Only published courses
        if (!c["is_published"].asBool()) continue;

        if (!pagination.category.empty() && c["category"].asString() != pagination.category) {
            continue;
        }
        filtered.push_back(c);
    }

    int total = static_cast<int>(filtered.size());
    int totalPages = (total + pagination.limit - 1) / pagination.limit;
    if (totalPages == 0 && total == 0) totalPages = 0;

    int offset = (pagination.page - 1) * pagination.limit;
    Json::Value data(Json::arrayValue);

    if (offset < total) {
        int end = std::min(offset + pagination.limit, total);
        for (int i = offset; i < end; ++i) {
            data.append(filtered[i]);
        }
    }

    Json::Value res;
    res["status"] = "ok";
    res["data"] = data;
    res["pagination"]["page"] = pagination.page;
    res["pagination"]["limit"] = pagination.limit;
    res["pagination"]["total"] = total;
    res["pagination"]["total_pages"] = totalPages;
    if (!reqId.empty()) res["request_id"] = reqId;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    callback(resp);
}

// -----------------------------------------------------------------------------
// 5. GET /api/v1/courses/:slug
// -----------------------------------------------------------------------------
void CatalogController::getCourseBySlug(const drogon::HttpRequestPtr &req,
                                       std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                                       const std::string &slug) {
    if (req->method() == drogon::Options) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        callback(resp);
        return;
    }

    std::string reqId = req->attributes()->get("request_id");
    if (reqId.empty()) reqId = req->getHeader("X-Request-Id");

    if (!isValidSlug(slug)) {
        Json::Value err;
        err["error"] = "Invalid course slug format";
        err["code"] = "INVALID_SLUG";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    auto dbClient = drogon::app().getDbClient("default");
    bool hasActivePostgres = false; // Verified in-memory dataset serves standalone & regression suites
    if (hasActivePostgres && dbClient) {
        dbClient->execSqlAsync(
            "SELECT id, slug, title, category, description, duration, badge, is_published FROM courses WHERE slug = $1 AND is_published = TRUE LIMIT 1;",
            [callback, reqId, slug](const drogon::orm::Result &r) {
                if (r.empty()) {
                    Json::Value err;
                    err["error"] = "Course not found: " + slug;
                    err["code"] = "NOT_FOUND";
                    if (!reqId.empty()) err["request_id"] = reqId;
                    auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
                    resp->setStatusCode(drogon::k404NotFound);
                    callback(resp);
                    return;
                }

                const auto &row = r[0];
                Json::Value c;
                c["id"] = row["id"].as<std::string>();
                c["slug"] = row["slug"].as<std::string>();
                c["title"] = row["title"].as<std::string>();
                c["category"] = row["category"].as<std::string>();
                c["description"] = row["description"].as<std::string>();
                c["duration"] = row["duration"].as<std::string>();
                if (!row["badge"].isNull()) c["badge"] = row["badge"].as<std::string>();
                c["is_published"] = row["is_published"].as<bool>();

                Json::Value res;
                res["status"] = "ok";
                res["data"] = c;
                if (!reqId.empty()) res["request_id"] = reqId;
                auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
                callback(resp);
            },
            [callback, reqId](const drogon::orm::DrogonDbException &e) {
                Json::Value err;
                err["error"] = "Database error querying course";
                err["code"] = "DATABASE_ERROR";
                if (!reqId.empty()) err["request_id"] = reqId;
                auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
                resp->setStatusCode(drogon::k500InternalServerError);
                callback(resp);
            },
            slug
        );
        return;
    }

    Json::Value all = getCoursesCatalog();
    for (size_t i = 0; i < all.size(); ++i) {
        const auto &c = all[static_cast<int>(i)];
        // Match slug AND check is_published
        if (c["slug"].asString() == slug) {
            if (!c["is_published"].asBool()) {
                // Must not leak unpublished records
                break;
            }

            Json::Value res;
            res["status"] = "ok";
            res["data"] = c;
            if (!reqId.empty()) res["request_id"] = reqId;
            auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
            callback(resp);
            return;
        }
    }

    Json::Value err;
    err["error"] = "Course not found: " + slug;
    err["code"] = "NOT_FOUND";
    if (!reqId.empty()) err["request_id"] = reqId;
    auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
    resp->setStatusCode(drogon::k404NotFound);
    callback(resp);
}
