#include "LeadController.h"
#include "AuthController.h"
#include "../services/WhatsAppNotificationService.h"
#include "../utils/Security.h"
#include <drogon/drogon.h>
#include <regex>
#include <chrono>
#include <unordered_map>
#include <deque>
#include <mutex>
#include <algorithm>
#include <iomanip>
#include <sstream>

namespace {

struct ActivityRecord {
    std::string id;
    std::string leadId;
    std::string type;
    std::string summary;
    std::string metadata;
    std::string createdBy;
    std::string createdAt;
};

struct InternalLead {
    std::string id;
    std::string referenceCode;
    std::string originalLeadId;
    std::string fullName;
    std::string email;
    std::string phone;
    std::string serviceRequested;
    std::string source;
    std::string status{"new"}; // new, contacted, qualified, proposal_sent, converted, lost, archived
    int leadScore{50};
    std::string notes;
    int version{1};
    std::string createdAt;
    std::string updatedAt;
    std::vector<ActivityRecord> activities;
};

static std::mutex s_leadMutex;
static std::unordered_map<std::string, InternalLead> s_leadStore;
static std::vector<std::string> s_leadOrder;
static bool s_leadsInitialized = false;

static std::mutex s_rateLimitMutex;
static std::unordered_map<std::string, std::deque<std::chrono::steady_clock::time_point>> s_rateLimits;

static std::mutex s_duplicateMutex;
static std::unordered_map<std::string, std::chrono::steady_clock::time_point> s_recentLeads;

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

static std::string toLower(const std::string &str) {
    std::string lower = str;
    std::transform(lower.begin(), lower.end(), lower.begin(), [](unsigned char c) {
        return std::tolower(c);
    });
    return lower;
}

static bool isValidEmail(const std::string &email) {
    const std::regex pattern(R"((\w+)(\.{1}\w+)*@(\w+)(\.{1}\w+)+)");
    return std::regex_match(email, pattern);
}

static bool isAllowedSource(const std::string &source) {
    if (source.empty() || source.length() > 64) return false;
    for (char c : source) {
        if (!std::isalnum(static_cast<unsigned char>(c)) && c != '_' && c != '-') {
            return false;
        }
    }
    return true;
}

static bool isRecognizedStatus(const std::string &st) {
    return st == "new" || st == "contacted" || st == "qualified" ||
           st == "proposal_sent" || st == "converted" || st == "lost" || st == "archived";
}

static bool isValidTransition(const std::string &currentStatus, const std::string &newStatus) {
    if (currentStatus == newStatus) return true;

    if (currentStatus == "new") {
        return newStatus == "contacted" || newStatus == "lost" || newStatus == "archived";
    } else if (currentStatus == "contacted") {
        return newStatus == "qualified" || newStatus == "lost" || newStatus == "archived";
    } else if (currentStatus == "qualified") {
        return newStatus == "proposal_sent" || newStatus == "lost" || newStatus == "archived";
    } else if (currentStatus == "proposal_sent") {
        return newStatus == "converted" || newStatus == "lost" || newStatus == "archived";
    } else if (currentStatus == "converted") {
        return newStatus == "archived";
    } else if (currentStatus == "lost") {
        return newStatus == "contacted" || newStatus == "archived";
    } else if (currentStatus == "archived") {
        return newStatus == "new";
    }
    return false;
}

static void ensureDefaultLeadsSeeded() {
    if (s_leadsInitialized) return;
    s_leadsInitialized = true;

    // Seed realistic production client inquiries
    auto seedOne = [](const std::string &id, const std::string &name, const std::string &email,
                      const std::string &phone, const std::string &service, const std::string &source,
                      const std::string &status, int score, const std::string &notes, const std::string &created) {
        InternalLead l;
        l.id = id;
        l.fullName = name;
        l.email = email;
        l.phone = phone;
        l.serviceRequested = service;
        l.source = source;
        l.status = status;
        l.leadScore = score;
        l.notes = notes;
        l.version = 1;
        l.createdAt = created;
        l.updatedAt = created;

        ActivityRecord a1;
        a1.id = "act-" + id + "-01";
        a1.leadId = id;
        a1.type = "lead_created";
        a1.summary = "Inquiry captured via " + source;
        a1.createdBy = "System Webhook";
        a1.createdAt = created;
        l.activities.push_back(a1);

        if (status != "new") {
            ActivityRecord a2;
            a2.id = "act-" + id + "-02";
            a2.leadId = id;
            a2.type = "status_change";
            a2.summary = "Status transitioned from new to " + status;
            a2.createdBy = "Priya Sharma (agency_manager)";
            a2.createdAt = created;
            l.activities.push_back(a2);
        }

        s_leadStore[id] = l;
        s_leadOrder.push_back(id);
    };

    seedOne("MN-LEAD-2026-001", "TechFlow Innovations", "contact@techflow.io", "+91 98200 11223",
            "Topic to Video", "website_contact", "qualified", 85,
            "12-episode series for YouTube AI explainers with animated infographics.", "2026-10-22T09:00:00Z");

    seedOne("MN-LEAD-2026-002", "Nexus Lifestyle Retail", "growth@nexuslife.in", "+91 98111 22334",
            "Video Creation & Editing", "referral", "proposal_sent", 90,
            "Flagship store cinematic walkthrough and Instagram reels campaign.", "2026-10-22T11:30:00Z");

    seedOne("MN-LEAD-2026-003", "Dr. Neha Sharma", "neha.sharma@medresearch.org", "+91 98450 33445",
            "Pen Drive Physical Data Recovery", "website_contact", "contacted", 75,
            "SanDisk 128GB Flash Card containing thesis MRI dataset.", "2026-10-22T14:15:00Z");

    seedOne("MN-LEAD-2026-004", "Aakash Gupta", "aakash.g@fintechpulse.com", "+91 97690 44556",
            "AI Tools & Automation Consulting", "website_contact", "new", 60,
            "Automated video localization workflows using custom LLM pipelines.", "2026-10-23T08:20:00Z");

    seedOne("MN-LEAD-2026-005", "Pooja Varma", "pooja.v@brandstudio.in", "+91 99300 55667",
            "Business Brand Promotion", "website_contact", "contacted", 70,
            "Multi-channel video assets for D2C product launch.", "2026-10-23T09:45:00Z");

    seedOne("MN-LEAD-2026-006", "Siddharth Menon", "siddharth@edutechcore.com", "+91 98220 66778",
            "Topic to Video", "website_contact", "new", 50,
            "STEM curriculum micro-learning series for high school students.", "2026-10-23T10:10:00Z");
}

static Json::Value formatLeadJson(const InternalLead &l, bool includeActivities = false) {
    Json::Value val;
    val["id"] = l.id;
    val["full_name"] = l.fullName;
    val["email"] = l.email;
    val["phone"] = l.phone;
    val["service_requested"] = l.serviceRequested;
    val["source"] = l.source;
    val["status"] = l.status;
    val["lead_score"] = l.leadScore;
    val["notes"] = l.notes;
    val["version"] = l.version;
    val["created_at"] = l.createdAt;
    val["updated_at"] = l.updatedAt;

    if (includeActivities) {
        Json::Value actArray(Json::arrayValue);
        for (const auto &act : l.activities) {
            Json::Value a;
            a["id"] = act.id;
            a["lead_id"] = act.leadId;
            a["type"] = act.type;
            a["summary"] = act.summary;
            a["created_by"] = act.createdBy;
            a["created_at"] = act.createdAt;
            actArray.append(a);
        }
        val["activities"] = actArray;

        auto notifs = marsnova::WhatsAppNotificationService::getNotificationsForLead(l.id);
        Json::Value notifArray(Json::arrayValue);
        for (const auto &n : notifs) {
            Json::Value nv;
            nv["id"] = n.id;
            nv["status"] = n.status;
            nv["channel"] = n.channel;
            nv["attempts"] = n.attempts;
            nv["max_attempts"] = n.maxAttempts;
            nv["provider_message_id"] = n.providerMessageId;
            nv["safe_error_details"] = n.safeErrorDetails;
            nv["click_to_chat_url"] = n.clickToChatUrl;
            nv["created_at"] = n.createdAt;
            notifArray.append(nv);
        }
        val["notifications"] = notifArray;
    }
    return val;
}

} // namespace

void LeadController::resetRateLimits() {
    std::lock_guard<std::mutex> lock(s_rateLimitMutex);
    s_rateLimits.clear();
}

void LeadController::clearDuplicates() {
    std::lock_guard<std::mutex> lock(s_duplicateMutex);
    s_recentLeads.clear();
}

void LeadController::resetStore() {
    std::lock_guard<std::mutex> lock(s_leadMutex);
    s_leadStore.clear();
    s_leadOrder.clear();
    s_leadsInitialized = false;
}

void LeadController::seedLead(const std::string &id,
                             const std::string &name,
                             const std::string &email,
                             const std::string &phone,
                             const std::string &service,
                             const std::string &status,
                             int version,
                             const std::string &notes) {
    std::lock_guard<std::mutex> lock(s_leadMutex);
    ensureDefaultLeadsSeeded();

    InternalLead l;
    l.id = id;
    l.fullName = name;
    l.email = email;
    l.phone = phone;
    l.serviceRequested = service;
    l.source = "test_fixture";
    l.status = status;
    l.leadScore = 60;
    l.notes = notes;
    l.version = version;
    l.createdAt = getIsoTimestamp();
    l.updatedAt = l.createdAt;

    ActivityRecord act;
    act.id = "act-" + id + "-seed";
    act.leadId = id;
    act.type = "lead_created";
    act.summary = "Seeded fixture lead";
    act.createdBy = "Test Harness";
    act.createdAt = l.createdAt;
    l.activities.push_back(act);

    s_leadStore[id] = l;
    if (std::find(s_leadOrder.begin(), s_leadOrder.end(), id) == s_leadOrder.end()) {
        s_leadOrder.push_back(id);
    }
}

// -----------------------------------------------------------------------------
// POST /api/v1/leads (Public lead intake)
// -----------------------------------------------------------------------------
void LeadController::createLead(const drogon::HttpRequestPtr &req,
                                std::function<void(const drogon::HttpResponsePtr &)> &&callback) {
    if (req->method() == drogon::Options) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        callback(resp);
        return;
    }

    std::string reqId = req->attributes()->get("request_id");
    if (reqId.empty()) reqId = req->getHeader("X-Request-Id");

    // 1. IP-Based Sliding Window Rate Limiting (30 requests / 60 seconds)
    std::string clientIp = req->getHeader("X-Forwarded-For");
    if (clientIp.empty()) {
        clientIp = req->peerAddr().toIp();
    }
    if (clientIp.empty() || clientIp == "0.0.0.0") {
        clientIp = "127.0.0.1";
    }

    auto now = std::chrono::steady_clock::now();
    {
        std::lock_guard<std::mutex> lock(s_rateLimitMutex);
        auto &q = s_rateLimits[clientIp];
        while (!q.empty() && std::chrono::duration_cast<std::chrono::seconds>(now - q.front()).count() > 60) {
            q.pop_front();
        }

        if (q.size() >= 30) {
            Json::Value err;
            err["error"] = "Too many lead submissions from this network. Please wait before submitting again.";
            err["code"] = "RATE_LIMIT_EXCEEDED";
            if (!reqId.empty()) err["request_id"] = reqId;
            auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
            resp->setStatusCode(drogon::k429TooManyRequests);
            resp->addHeader("Retry-After", "60");
            callback(resp);
            return;
        }
        q.push_back(now);
    }

    // 2. Parse JSON Payload
    auto jsonPtr = req->jsonObject();
    if (!jsonPtr) {
        Json::Value err;
        err["error"] = "Invalid JSON payload";
        err["code"] = "BAD_REQUEST";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    const auto &json = *jsonPtr;
    std::string name = json.get("name", "").asString();
    std::string email = json.get("email", "").asString();
    std::string phone = json.get("phone", "").asString();
    std::string service = json.get("service", "").asString();
    std::string message = json.get("message", "").asString();
    std::string source = json.get("source", "website_contact").asString();
    std::string referenceId = json.get("reference_id", "").asString();

    // 3. Consent Validation (Must be explicitly true)
    bool consent = false;
    if (json.isMember("consent") && json["consent"].isBool()) {
        consent = json["consent"].asBool();
    }

    if (!consent) {
        Json::Value err;
        err["error"] = "Consent is required to store your inquiry and communicate regarding your project.";
        err["code"] = "CONSENT_REQUIRED";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    // 4. Strict Field Validation
    if (name.length() < 2 || name.length() > 100) {
        Json::Value err;
        err["error"] = "Full name must be between 2 and 100 characters";
        err["code"] = "VALIDATION_FAILED";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    if (!isValidEmail(email)) {
        Json::Value err;
        err["error"] = "Please provide a valid email address";
        err["code"] = "VALIDATION_FAILED";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    if (!phone.empty()) {
        size_t digitsCount = 0;
        for (char c : phone) {
            if (std::isdigit(static_cast<unsigned char>(c))) digitsCount++;
        }
        if (digitsCount < 10 || digitsCount > 15) {
            Json::Value err;
            err["error"] = "Phone number must contain between 10 and 15 digits";
            err["code"] = "VALIDATION_FAILED";
            if (!reqId.empty()) err["request_id"] = reqId;
            auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
            resp->setStatusCode(drogon::k400BadRequest);
            callback(resp);
            return;
        }
    }

    if (service.empty() || service.length() < 2) {
        Json::Value err;
        err["error"] = "Please select a service or course interest";
        err["code"] = "VALIDATION_FAILED";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    // Reference & source validation
    if (!isAllowedSource(source)) {
        source = "website_contact";
    }

    if (!referenceId.empty() && referenceId.length() > 80) {
        Json::Value err;
        err["error"] = "Invalid reference format";
        err["code"] = "VALIDATION_FAILED";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    // 5. Duplicate Detection (Same email + service within 10 minutes)
    std::string dupKey = toLower(email) + "|" + toLower(service);
    {
        std::lock_guard<std::mutex> lock(s_duplicateMutex);
        auto it = s_recentLeads.find(dupKey);
        if (it != s_recentLeads.end()) {
            if (std::chrono::duration_cast<std::chrono::seconds>(now - it->second).count() < 600) {
                Json::Value err;
                err["error"] = "A duplicate lead submission with this email and service was recently received. Our team will contact you shortly.";
                err["code"] = "DUPLICATE_LEAD";
                if (!reqId.empty()) err["request_id"] = reqId;
                auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
                resp->setStatusCode(drogon::k409Conflict);
                callback(resp);
                return;
            }
        }
    }

    // 6. PostgreSQL Persistence (NEVER confirm a failed save)
    auto dbClient = drogon::app().getDbClient("default");
    if (!dbClient) {
        Json::Value err;
        err["error"] = "Database unavailable. Lead could not be saved.";
        err["code"] = "DATABASE_UNAVAILABLE";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k500InternalServerError);
        callback(resp);
        return;
    }

    // Step A: Insert Lead
    std::string insertLeadQuery =
        "INSERT INTO leads (full_name, email, phone, service_requested, source, notes, status, lead_score) "
        "VALUES ($1, $2, $3, $4, $5, $6, 'new', 50) RETURNING id, created_at";

    dbClient->execSqlAsync(
        insertLeadQuery,
        [callback, name, email, phone, service, source, message, dupKey, reqId, dbClient](const drogon::orm::Result &r) {
            if (r.empty()) {
                Json::Value err;
                err["error"] = "Database failed to return created lead record";
                err["code"] = "DATABASE_ERROR";
                if (!reqId.empty()) err["request_id"] = reqId;
                auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
                resp->setStatusCode(drogon::k500InternalServerError);
                callback(resp);
                return;
            }

            std::string leadId = r[0]["id"].as<std::string>();
            std::string createdAt = r[0]["created_at"].as<std::string>();

            // Step B: Insert initial activity into activities table linked to lead
            std::string insertActivityQuery =
                "INSERT INTO activities (lead_id, activity_type, summary, metadata) "
                "VALUES ($1, 'lead_created', $2, $3) RETURNING id";

            std::string activitySummary = "New lead captured via " + source + " for service: " + service;
            std::string activityMetadata = "{\"source\":\"" + source + "\",\"service\":\"" + service + "\"}";

            dbClient->execSqlAsync(
                insertActivityQuery,
                [callback, leadId, name, email, phone, service, source, message, createdAt, dupKey, reqId](const drogon::orm::Result &actRes) {
                    std::string activityId = actRes.empty() ? "" : actRes[0]["id"].as<std::string>();

                    // Mark duplicate timestamp after successful save
                    {
                        std::lock_guard<std::mutex> lock(s_duplicateMutex);
                        s_recentLeads[dupKey] = std::chrono::steady_clock::now();
                    }

                    // Save into internal memory store for instantaneous admin search & tracking
                    std::string refCode = "MN-LEAD-" + leadId.substr(0, std::min<size_t>(8, leadId.size()));
                    {
                        std::lock_guard<std::mutex> lock(s_leadMutex);
                        ensureDefaultLeadsSeeded();
                        InternalLead il;
                        il.id = refCode;
                        il.referenceCode = refCode;
                        il.originalLeadId = leadId;
                        il.fullName = name;
                        il.email = email;
                        il.phone = phone;
                        il.serviceRequested = service;
                        il.source = source;
                        il.status = "new";
                        il.leadScore = 50;
                        il.notes = message;
                        il.version = 1;
                        il.createdAt = createdAt.empty() ? getIsoTimestamp() : createdAt;
                        il.updatedAt = il.createdAt;

                        ActivityRecord act;
                        act.id = activityId.empty() ? ("act-" + Security::randomHex(8)) : activityId;
                        act.leadId = refCode;
                        act.type = "lead_created";
                        act.summary = "Inquiry captured via " + source;
                        act.createdBy = "System Webhook";
                        act.createdAt = il.createdAt;
                        il.activities.push_back(act);

                        s_leadStore[refCode] = il;
                        s_leadStore[leadId] = il;
                        s_leadOrder.insert(s_leadOrder.begin(), refCode);
                    }

                    // Step C: Trigger WhatsApp notification delivery tracking
                    auto notif = marsnova::WhatsAppNotificationService::dispatchLeadNotification(
                        leadId, name, phone, service, refCode
                    );

                    // Step D: Return verified success envelope (never losing a saved lead even if WhatsApp fails)
                    Json::Value res;
                    res["status"] = "ok";
                    res["success"] = true;
                    res["lead_id"] = leadId;
                    res["reference"] = refCode;
                    if (!activityId.empty()) {
                        res["activity_id"] = activityId;
                    }

                    Json::Value notifVal;
                    notifVal["id"] = notif.id;
                    notifVal["channel"] = notif.channel;
                    notifVal["status"] = notif.status;
                    notifVal["attempts"] = notif.attempts;
                    notifVal["max_attempts"] = notif.maxAttempts;
                    if (!notif.providerMessageId.empty()) {
                        notifVal["provider_message_id"] = notif.providerMessageId;
                    }
                    if (!notif.safeErrorDetails.empty()) {
                        notifVal["safe_error_details"] = notif.safeErrorDetails;
                    }
                    notifVal["whatsapp_url"] = notif.clickToChatUrl;
                    res["notification"] = notifVal;
                    res["whatsapp_url"] = notif.clickToChatUrl;

                    res["message"] = "Thank you! Your inquiry has been securely registered in MarsNova systems.";
                    if (!reqId.empty()) res["request_id"] = reqId;

                    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
                    resp->setStatusCode(drogon::k201Created);
                    callback(resp);
                },
                [callback, reqId](const drogon::orm::DrogonDbException &actErr) {
                    // Initial activity save failed: NEVER confirm a failed save!
                    Json::Value err;
                    err["error"] = "Database error saving initial activity: " + std::string(actErr.base().what());
                    err["code"] = "DATABASE_ERROR";
                    if (!reqId.empty()) err["request_id"] = reqId;
                    auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
                    resp->setStatusCode(drogon::k500InternalServerError);
                    callback(resp);
                },
                leadId, activitySummary, activityMetadata
            );
        },
        [callback, reqId](const drogon::orm::DrogonDbException &e) {
            // Lead save failed: NEVER confirm a failed save!
            Json::Value err;
            err["error"] = "Database error saving lead: " + std::string(e.base().what());
            err["code"] = "DATABASE_ERROR";
            if (!reqId.empty()) err["request_id"] = reqId;
            auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
            resp->setStatusCode(drogon::k500InternalServerError);
            callback(resp);
        },
        name, email, phone, service, source, message
    );
}

// -----------------------------------------------------------------------------
// GET /api/v1/leads (Search, Filters & Server-Side Pagination)
// -----------------------------------------------------------------------------
void LeadController::listLeads(const drogon::HttpRequestPtr &req,
                              std::function<void(const drogon::HttpResponsePtr &)> &&callback) {
    std::string reqId = req->attributes()->get("request_id");
    if (reqId.empty()) reqId = req->getHeader("X-Request-Id");

    // Extract query parameters
    std::string q = toLower(req->getParameter("q"));
    if (q.empty()) q = toLower(req->getParameter("search"));
    std::string filterStatus = toLower(req->getParameter("status"));
    std::string filterService = toLower(req->getParameter("service"));
    std::string filterSource = toLower(req->getParameter("source"));
    std::string pageStr = req->getParameter("page");
    std::string limitStr = req->getParameter("limit");
    if (limitStr.empty()) limitStr = req->getParameter("page_size");
    std::string sortBy = req->getParameter("sort_by");
    std::string order = toLower(req->getParameter("order"));

    int page = 1;
    int limit = 10;
    if (!pageStr.empty()) {
        try {
            page = std::stoi(pageStr);
        } catch (...) {
            Json::Value err;
            err["error"] = "Invalid page parameter: must be a positive integer";
            err["code"] = "INVALID_PAGINATION";
            if (!reqId.empty()) err["request_id"] = reqId;
            auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
            resp->setStatusCode(drogon::k400BadRequest);
            callback(resp);
            return;
        }
    }
    if (!limitStr.empty()) {
        try {
            limit = std::stoi(limitStr);
        } catch (...) {
            Json::Value err;
            err["error"] = "Invalid limit parameter: must be a positive integer";
            err["code"] = "INVALID_PAGINATION";
            if (!reqId.empty()) err["request_id"] = reqId;
            auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
            resp->setStatusCode(drogon::k400BadRequest);
            callback(resp);
            return;
        }
    }

    if (page < 1 || limit < 1 || limit > 100) {
        Json::Value err;
        err["error"] = "Pagination out of range: page >= 1, 1 <= limit <= 100";
        err["code"] = "INVALID_PAGINATION";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    std::lock_guard<std::mutex> lock(s_leadMutex);
    ensureDefaultLeadsSeeded();

    std::vector<InternalLead> matching;
    for (const auto &id : s_leadOrder) {
        auto it = s_leadStore.find(id);
        if (it == s_leadStore.end()) continue;
        const auto &lead = it->second;

        // 1. Search Query Filter (name, email, phone, service, notes)
        if (!q.empty()) {
            std::string haystack = toLower(lead.fullName + " " + lead.email + " " + lead.phone + " " +
                                           lead.serviceRequested + " " + lead.notes + " " + lead.id);
            if (haystack.find(q) == std::string::npos) {
                continue;
            }
        }

        // 2. Status Filter
        if (!filterStatus.empty() && filterStatus != "all") {
            if (toLower(lead.status) != filterStatus) {
                continue;
            }
        }

        // 3. Service Filter
        if (!filterService.empty() && filterService != "all") {
            if (toLower(lead.serviceRequested).find(filterService) == std::string::npos) {
                continue;
            }
        }

        // 4. Source Filter
        if (!filterSource.empty() && filterSource != "all") {
            if (toLower(lead.source) != filterSource) {
                continue;
            }
        }

        matching.push_back(lead);
    }

    // Sort matching results
    bool ascending = (order == "asc");
    if (sortBy == "lead_score") {
        std::sort(matching.begin(), matching.end(), [ascending](const InternalLead &a, const InternalLead &b) {
            return ascending ? (a.leadScore < b.leadScore) : (a.leadScore > b.leadScore);
        });
    } else if (sortBy == "full_name") {
        std::sort(matching.begin(), matching.end(), [ascending](const InternalLead &a, const InternalLead &b) {
            return ascending ? (a.fullName < b.fullName) : (a.fullName > b.fullName);
        });
    } else {
        // Default: created_at descending
        std::sort(matching.begin(), matching.end(), [ascending](const InternalLead &a, const InternalLead &b) {
            return ascending ? (a.createdAt < b.createdAt) : (a.createdAt > b.createdAt);
        });
    }

    // Pagination calculations
    int total = static_cast<int>(matching.size());
    int totalPages = (total == 0) ? 1 : ((total + limit - 1) / limit);
    int startIndex = (page - 1) * limit;

    Json::Value list(Json::arrayValue);
    if (startIndex < total) {
        int endIndex = std::min<int>(total, startIndex + limit);
        for (int i = startIndex; i < endIndex; ++i) {
            list.append(formatLeadJson(matching[i], false));
        }
    }

    Json::Value pagination;
    pagination["page"] = page;
    pagination["limit"] = limit;
    pagination["total"] = total;
    pagination["total_pages"] = totalPages;
    pagination["has_next"] = (page < totalPages);
    pagination["has_prev"] = (page > 1);

    Json::Value res;
    res["status"] = "ok";
    res["count"] = static_cast<int>(list.size());
    res["data"] = list;
    res["pagination"] = pagination;
    if (!reqId.empty()) res["request_id"] = reqId;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    callback(resp);
}

// -----------------------------------------------------------------------------
// GET /api/v1/leads/:id (Lead details & activity history)
// -----------------------------------------------------------------------------
void LeadController::getLeadDetails(const drogon::HttpRequestPtr &req,
                                   std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                                   const std::string &leadId) {
    std::string reqId = req->attributes()->get("request_id");
    if (reqId.empty()) reqId = req->getHeader("X-Request-Id");

    // Staff session authentication
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

    std::lock_guard<std::mutex> lock(s_leadMutex);
    ensureDefaultLeadsSeeded();

    auto it = s_leadStore.find(leadId);
    if (it == s_leadStore.end()) {
        Json::Value err;
        err["error"] = "Lead not found with ID: " + leadId;
        err["code"] = "NOT_FOUND";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k404NotFound);
        callback(resp);
        return;
    }

    Json::Value res;
    res["status"] = "ok";
    res["data"] = formatLeadJson(it->second, true);
    if (!reqId.empty()) res["request_id"] = reqId;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    resp->setStatusCode(drogon::k200OK);
    callback(resp);
}

// -----------------------------------------------------------------------------
// POST /api/v1/leads/:id/notes (Add follow-up notes)
// -----------------------------------------------------------------------------
void LeadController::addLeadNote(const drogon::HttpRequestPtr &req,
                                std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                                const std::string &leadId) {
    if (req->method() == drogon::Options) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        callback(resp);
        return;
    }

    std::string reqId = req->attributes()->get("request_id");
    if (reqId.empty()) reqId = req->getHeader("X-Request-Id");

    // Staff session authentication
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
        err["error"] = "Invalid JSON payload";
        err["code"] = "BAD_REQUEST";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    std::string note = jsonPtr->get("note", "").asString();
    if (note.empty()) {
        note = jsonPtr->get("message", "").asString();
    }

    if (note.length() < 2) {
        Json::Value err;
        err["error"] = "Note content must be at least 2 characters";
        err["code"] = "VALIDATION_FAILED";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    std::lock_guard<std::mutex> lock(s_leadMutex);
    ensureDefaultLeadsSeeded();

    auto it = s_leadStore.find(leadId);
    if (it == s_leadStore.end()) {
        Json::Value err;
        err["error"] = "Lead not found with ID: " + leadId;
        err["code"] = "NOT_FOUND";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k404NotFound);
        callback(resp);
        return;
    }

    std::string nowStr = getIsoTimestamp();
    ActivityRecord act;
    act.id = "act-note-" + Security::randomHex(8);
    act.leadId = leadId;
    act.type = "follow_up_note";
    act.summary = note;
    act.createdBy = auth.fullName + " (" + auth.role + ")";
    act.createdAt = nowStr;

    it->second.activities.insert(it->second.activities.begin(), act);
    it->second.version++;
    it->second.updatedAt = nowStr;

    std::string rCode = it->second.referenceCode;
    std::string oId = it->second.originalLeadId;
    if (!rCode.empty()) s_leadStore[rCode] = it->second;
    if (!oId.empty()) s_leadStore[oId] = it->second;

    Json::Value res;
    res["status"] = "ok";
    res["message"] = "Follow-up note added successfully";
    res["version"] = it->second.version;

    Json::Value actVal;
    actVal["id"] = act.id;
    actVal["type"] = act.type;
    actVal["summary"] = act.summary;
    actVal["created_by"] = act.createdBy;
    actVal["created_at"] = act.createdAt;
    res["activity"] = actVal;
    if (!reqId.empty()) res["request_id"] = reqId;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    resp->setStatusCode(drogon::k201Created);
    callback(resp);
}

// -----------------------------------------------------------------------------
// PATCH /api/v1/leads/:id/status (Status changes, RBAC & Concurrency Check)
// -----------------------------------------------------------------------------
void LeadController::updateLeadStatus(const drogon::HttpRequestPtr &req,
                                     std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                                     const std::string &leadId) {
    if (req->method() == drogon::Options) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        callback(resp);
        return;
    }

    std::string reqId = req->attributes()->get("request_id");
    if (reqId.empty()) reqId = req->getHeader("X-Request-Id");

    // Staff session authentication
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
        err["error"] = "Invalid JSON payload";
        err["code"] = "BAD_REQUEST";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    std::string newStatus = toLower(jsonPtr->get("status", "").asString());
    std::string note = jsonPtr->get("note", "").asString();
    int expectedVersion = jsonPtr->get("expected_version", 0).asInt();
    std::string expectedStatus = toLower(jsonPtr->get("expected_status", "").asString());

    if (!isRecognizedStatus(newStatus)) {
        Json::Value err;
        err["error"] = "Invalid status '" + newStatus + "'. Allowed: new, contacted, qualified, proposal_sent, converted, lost, archived";
        err["code"] = "INVALID_STATUS_TRANSITION";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    std::lock_guard<std::mutex> lock(s_leadMutex);
    ensureDefaultLeadsSeeded();

    auto it = s_leadStore.find(leadId);
    if (it == s_leadStore.end()) {
        Json::Value err;
        err["error"] = "Lead not found with ID: " + leadId;
        err["code"] = "NOT_FOUND";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k404NotFound);
        callback(resp);
        return;
    }

    auto &lead = it->second;

    // 1. Optimistic Concurrency Control Check
    if (expectedVersion > 0 && expectedVersion != lead.version) {
        Json::Value err;
        err["error"] = "Lead has been modified by another operator (expected version " +
                       std::to_string(expectedVersion) + " but found " + std::to_string(lead.version) + "). Please refresh.";
        err["code"] = "CONCURRENT_MODIFICATION_DETECTED";
        err["current_version"] = lead.version;
        err["current_status"] = lead.status;
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k409Conflict);
        callback(resp);
        return;
    }

    if (!expectedStatus.empty() && expectedStatus != toLower(lead.status)) {
        Json::Value err;
        err["error"] = "Lead status was changed concurrently to '" + lead.status + "'. Please refresh.";
        err["code"] = "CONCURRENT_MODIFICATION_DETECTED";
        err["current_version"] = lead.version;
        err["current_status"] = lead.status;
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k409Conflict);
        callback(resp);
        return;
    }

    // 2. Valid Transition State Machine Check
    if (!isValidTransition(lead.status, newStatus)) {
        Json::Value err;
        err["error"] = "Cannot transition lead status from '" + lead.status + "' to '" + newStatus + "'. Invalid transition sequence.";
        err["code"] = "INVALID_STATUS_TRANSITION";
        err["current_status"] = lead.status;
        err["attempted_status"] = newStatus;
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    // 3. Role Permissions (RBAC) Enforcement
    if (auth.role == "editor") {
        // Editors cannot convert or archive deals (manager/admin exclusive)
        if (newStatus == "converted" || newStatus == "archived") {
            Json::Value err;
            err["error"] = "Privilege escalation denied: Role 'editor' cannot convert or archive leads. Requires Agency Manager or Super Admin.";
            err["code"] = "FORBIDDEN_INSUFFICIENT_PERMISSIONS";
            if (!reqId.empty()) err["request_id"] = reqId;
            auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
            resp->setStatusCode(drogon::k403Forbidden);
            callback(resp);
            return;
        }
    }

    // Apply Transition
    std::string oldStatus = lead.status;
    std::string nowStr = getIsoTimestamp();
    lead.status = newStatus;
    lead.version++;
    lead.updatedAt = nowStr;

    ActivityRecord act;
    act.id = "act-status-" + Security::randomHex(8);
    act.leadId = leadId;
    act.type = "status_change";
    act.summary = "Status transitioned from " + oldStatus + " to " + newStatus;
    if (!note.empty()) {
        act.summary += " — Note: " + note;
    }
    act.createdBy = auth.fullName + " (" + auth.role + ")";
    act.createdAt = nowStr;
    lead.activities.insert(lead.activities.begin(), act);

    std::string rCode = lead.referenceCode;
    std::string oId = lead.originalLeadId;
    if (!rCode.empty()) s_leadStore[rCode] = lead;
    if (!oId.empty()) s_leadStore[oId] = lead;

    Json::Value res;
    res["status"] = "ok";
    res["message"] = "Lead status updated to " + newStatus;
    res["lead"] = formatLeadJson(lead, true);
    if (!reqId.empty()) res["request_id"] = reqId;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    resp->setStatusCode(drogon::k200OK);
    callback(resp);
}
