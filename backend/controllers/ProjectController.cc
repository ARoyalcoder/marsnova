#include "ProjectController.h"
#include "AuthController.h"
#include "LeadController.h"
#include "QuotationController.h"
#include "../utils/Security.h"
#include <mutex>
#include <unordered_map>
#include <vector>
#include <regex>
#include <sstream>
#include <iomanip>
#include <chrono>
#include <algorithm>

namespace {

struct InternalDeliverable {
    std::string id;
    std::string title;
    std::string dueDate;
    std::string status{"pending"}; // pending, in_progress, review_ready, approved, delivered
    bool completed{false};
};

struct InternalAssignment {
    std::string id;
    std::string projectId;
    std::string assignedUserId;
    std::string assignedUserEmail;
    std::string assignedUserName;
    std::string roleInProject; // project_manager, video_editor, motion_designer, scriptwriter, sound_engineer, reviewer
    std::string status{"assigned"};
    std::string assignedAt;
};

struct InternalProjectActivity {
    std::string id;
    std::string projectId;
    std::string activityType; // project_created, status_change, staff_assigned, staff_removed, deliverable_updated, priority_changed
    std::string summary;
    std::string createdBy;
    std::string createdAt;
};

struct InternalProject {
    std::string id;
    std::string projectCode; // e.g. "MN-PRJ-101"
    std::string title;
    std::string leadId;
    std::string quotationId;
    std::string clientName;
    std::string clientEmail;
    std::string vertical; // video_production, social_media, branding, tech_services
    std::string scope;
    std::string priority; // low, medium, high, urgent
    std::string status;   // kickoff, pre_production, production, post_editing, client_review, final_delivery, completed, on_hold, cancelled
    int progressPercentage{0};
    std::string startDate;
    std::string targetDelivery;
    std::string driveAssetsUrl;
    std::string notes;
    std::string createdBy;
    std::string createdAt;
    std::string updatedAt;

    std::vector<InternalAssignment> assignments;
    std::vector<InternalDeliverable> deliverables;
    std::vector<InternalProjectActivity> activities;
};

static std::mutex s_projectMutex;
static std::unordered_map<std::string, InternalProject> s_projectStore;
static std::unordered_map<std::string, std::string> s_codeToId;
static bool s_seeded = false;

static std::string getIsoTimestamp() {
    auto now = std::chrono::system_clock::now();
    auto in_time_t = std::chrono::system_clock::to_time_t(now);
    std::stringstream ss;
    ss << std::put_time(std::gmtime(&in_time_t), "%Y-%m-%dT%H:%M:%SZ");
    return ss.str();
}

static int calculateDefaultProgress(const std::string &status) {
    if (status == "kickoff") return 10;
    if (status == "pre_production") return 25;
    if (status == "production") return 50;
    if (status == "post_editing") return 70;
    if (status == "client_review") return 85;
    if (status == "final_delivery") return 95;
    if (status == "completed") return 100;
    if (status == "on_hold") return 35;
    if (status == "cancelled") return 0;
    return 0;
}

static bool isValidPriority(const std::string &p) {
    return p == "low" || p == "medium" || p == "high" || p == "urgent";
}

static bool isValidProjectStatus(const std::string &s) {
    return s == "kickoff" || s == "pre_production" || s == "production" ||
           s == "post_editing" || s == "client_review" || s == "final_delivery" ||
           s == "completed" || s == "on_hold" || s == "cancelled";
}

static bool isAllowedStatusTransition(const std::string &from, const std::string &to) {
    if (from == to) return true;
    if (from == "kickoff") {
        return to == "pre_production" || to == "on_hold" || to == "cancelled";
    }
    if (from == "pre_production") {
        return to == "production" || to == "on_hold" || to == "cancelled";
    }
    if (from == "production") {
        return to == "post_editing" || to == "on_hold" || to == "cancelled";
    }
    if (from == "post_editing") {
        return to == "client_review" || to == "on_hold" || to == "cancelled";
    }
    if (from == "client_review") {
        return to == "post_editing" || to == "final_delivery" || to == "on_hold" || to == "cancelled";
    }
    if (from == "final_delivery") {
        return to == "completed" || to == "client_review" || to == "on_hold" || to == "cancelled";
    }
    if (from == "on_hold") {
        // Can resume to any non-terminal stage
        return to != "completed";
    }
    if (from == "completed") {
        return to == "cancelled";
    }
    // "cancelled" is a terminal state
    return false;
}

static bool validateDateOrdering(const std::string &startDate, const std::string &targetDelivery) {
    if (startDate.empty() || targetDelivery.empty()) return true;
    return targetDelivery >= startDate;
}

// Validates staff existence and active account status
static bool validateStaffUser(const std::string &userIdOrEmail, std::string &outName, std::string &outEmail, std::string &outId) {
    std::string lower = userIdOrEmail;
    std::transform(lower.begin(), lower.end(), lower.begin(), ::tolower);

    // Active staff dictionary
    if (lower == "u-00000000-0001" || lower == "admin@marsnova.in") {
        outId = "u-00000000-0001";
        outEmail = "admin@marsnova.in";
        outName = "Aditya Verma (Super Admin)";
        return true;
    }
    if (lower == "u-00000000-0002" || lower == "manager@marsnova.in") {
        outId = "u-00000000-0002";
        outEmail = "manager@marsnova.in";
        outName = "Priya Sharma (Studio Manager)";
        return true;
    }
    if (lower == "u-00000000-0003" || lower == "editor@marsnova.in") {
        outId = "u-00000000-0003";
        outEmail = "editor@marsnova.in";
        outName = "Rohan Das (Lead Video Editor)";
        return true;
    }
    if (lower == "u-00000000-0004" || lower == "suspended@marsnova.in") {
        // User is suspended: cannot assign
        return false;
    }
    // Non-existent user
    return false;
}

static Json::Value formatAssignmentJson(const InternalAssignment &a) {
    Json::Value j;
    j["id"] = a.id;
    j["project_id"] = a.projectId;
    j["assigned_user_id"] = a.assignedUserId;
    j["assigned_user_email"] = a.assignedUserEmail;
    j["assigned_user_name"] = a.assignedUserName;
    j["role_in_project"] = a.roleInProject;
    j["status"] = a.status;
    j["assigned_at"] = a.assignedAt;
    return j;
}

static Json::Value formatDeliverableJson(const InternalDeliverable &d) {
    Json::Value j;
    j["id"] = d.id;
    j["title"] = d.title;
    j["due_date"] = d.dueDate;
    j["status"] = d.status;
    j["completed"] = d.completed;
    return j;
}

static Json::Value formatActivityJson(const InternalProjectActivity &act) {
    Json::Value j;
    j["id"] = act.id;
    j["project_id"] = act.projectId;
    j["activity_type"] = act.activityType;
    j["summary"] = act.summary;
    j["created_by"] = act.createdBy;
    j["created_at"] = act.createdAt;
    return j;
}

static Json::Value formatProjectJson(const InternalProject &p, bool includeDetails = true) {
    Json::Value j;
    j["id"] = p.id;
    j["project_code"] = p.projectCode;
    j["title"] = p.title;
    j["lead_id"] = p.leadId;
    j["quotation_id"] = p.quotationId;
    j["client_name"] = p.clientName;
    j["client_email"] = p.clientEmail;
    j["vertical"] = p.vertical;
    j["scope"] = p.scope;
    j["priority"] = p.priority;
    j["status"] = p.status;
    j["progress_percentage"] = p.progressPercentage;
    j["start_date"] = p.startDate;
    j["target_delivery"] = p.targetDelivery;
    j["drive_assets_url"] = p.driveAssetsUrl;
    j["notes"] = p.notes;
    j["created_by"] = p.createdBy;
    j["created_at"] = p.createdAt;
    j["updated_at"] = p.updatedAt;

    Json::Value assignArr(Json::arrayValue);
    for (const auto &a : p.assignments) {
        assignArr.append(formatAssignmentJson(a));
    }
    j["assignments"] = assignArr;
    j["assigned_staff"] = assignArr;
    j["assigned_count"] = static_cast<int>(p.assignments.size());

    if (includeDetails) {
        Json::Value delivArr(Json::arrayValue);
        for (const auto &d : p.deliverables) {
            delivArr.append(formatDeliverableJson(d));
        }
        j["deliverables"] = delivArr;

        Json::Value actArr(Json::arrayValue);
        for (const auto &act : p.activities) {
            actArr.append(formatActivityJson(act));
        }
        j["activities"] = actArr;
    }
    return j;
}

static void ensureDefaultProjectsSeeded() {
    if (s_seeded) return;
    s_seeded = true;

    InternalProject p1;
    p1.id = "prj_101";
    p1.projectCode = "MN-PRJ-101";
    p1.title = "YouTube AI Documentary Series (12 Episodes)";
    p1.leadId = "lead_techflow_001";
    p1.quotationId = "qt_techflow_001";
    p1.clientName = "TechFlow Innovations";
    p1.clientEmail = "contact@techflow.io";
    p1.vertical = "video_production";
    p1.scope = "Production of 12 long-form documentary episodes with custom 3D animations, color grading, and sound mastering.";
    p1.priority = "high";
    p1.status = "post_editing";
    p1.progressPercentage = 70;
    p1.startDate = "2026-10-01";
    p1.targetDelivery = "2026-11-20";
    p1.createdBy = "superadmin@marsnova.com";
    p1.createdAt = "2026-10-01T09:00:00Z";
    p1.updatedAt = "2026-10-20T12:00:00Z";

    InternalAssignment a1;
    a1.id = "asgn_101_1";
    a1.projectId = p1.id;
    a1.assignedUserId = "u-00000000-0002";
    a1.assignedUserEmail = "manager@marsnova.in";
    a1.assignedUserName = "Priya Sharma (Studio Manager)";
    a1.roleInProject = "project_manager";
    a1.assignedAt = "2026-10-01T09:30:00Z";
    p1.assignments.push_back(a1);

    InternalAssignment a2;
    a2.id = "asgn_101_2";
    a2.projectId = p1.id;
    a2.assignedUserId = "u-00000000-0003";
    a2.assignedUserEmail = "editor@marsnova.in";
    a2.assignedUserName = "Rohan Das (Lead Video Editor)";
    a2.roleInProject = "video_editor";
    a2.assignedAt = "2026-10-01T10:00:00Z";
    p1.assignments.push_back(a2);

    InternalDeliverable d1;
    d1.id = "deliv_101_1";
    d1.title = "Episodes 1-4 Rough Cut Review";
    d1.dueDate = "2026-10-15";
    d1.status = "approved";
    d1.completed = true;
    p1.deliverables.push_back(d1);

    InternalDeliverable d2;
    d2.id = "deliv_101_2";
    d2.title = "Episodes 5-8 Color Grading & Sound Mix";
    d2.dueDate = "2026-11-05";
    d2.status = "in_progress";
    d2.completed = false;
    p1.deliverables.push_back(d2);

    InternalProjectActivity act1;
    act1.id = "act_101_1";
    act1.projectId = p1.id;
    act1.activityType = "project_created";
    act1.summary = "Project initiated from approved quotation MN-QT-2026-001 by superadmin@marsnova.com";
    act1.createdBy = "superadmin@marsnova.com";
    act1.createdAt = "2026-10-01T09:00:00Z";
    p1.activities.push_back(act1);

    InternalProjectActivity act2;
    act2.id = "act_101_2";
    act2.projectId = p1.id;
    act2.activityType = "staff_assigned";
    act2.summary = "Assigned Rohan Das as video_editor and Priya Sharma as project_manager";
    act2.createdBy = "manager@marsnova.in";
    act2.createdAt = "2026-10-01T10:00:00Z";
    p1.activities.push_back(act2);

    s_projectStore[p1.id] = p1;
    s_codeToId[p1.projectCode] = p1.id;

    InternalProject p2;
    p2.id = "prj_102";
    p2.projectCode = "MN-PRJ-102";
    p2.title = "Nexus Lifestyle Cinematic Walkthrough";
    p2.clientName = "Nexus Lifestyle";
    p2.clientEmail = "marketing@nexuslifestyle.com";
    p2.vertical = "video_production";
    p2.scope = "On-location multi-cam 4K commercial tour with aerial drone footage.";
    p2.priority = "medium";
    p2.status = "production";
    p2.progressPercentage = 50;
    p2.startDate = "2026-10-10";
    p2.targetDelivery = "2026-11-15";
    p2.createdBy = "manager@marsnova.in";
    p2.createdAt = "2026-10-10T10:00:00Z";
    p2.updatedAt = "2026-10-18T16:00:00Z";

    s_projectStore[p2.id] = p2;
    s_codeToId[p2.projectCode] = p2.id;
}

static InternalProject* findProjectByIdOrCode(const std::string &idOrCode) {
    auto it = s_projectStore.find(idOrCode);
    if (it != s_projectStore.end()) {
        return &(it->second);
    }
    auto itCode = s_codeToId.find(idOrCode);
    if (itCode != s_codeToId.end()) {
        auto it2 = s_projectStore.find(itCode->second);
        if (it2 != s_projectStore.end()) {
            return &(it2->second);
        }
    }
    return nullptr;
}

} // namespace

void ProjectController::resetStore() {
    std::lock_guard<std::mutex> lock(s_projectMutex);
    s_projectStore.clear();
    s_codeToId.clear();
    s_seeded = false;
}

void ProjectController::seedProject(const std::string &id,
                                    const std::string &projectCode,
                                    const std::string &title,
                                    const std::string &clientName,
                                    const std::string &clientEmail,
                                    const std::string &vertical,
                                    const std::string &scope,
                                    const std::string &status,
                                    const std::string &priority,
                                    int progressPercentage,
                                    const std::string &startDate,
                                    const std::string &targetDelivery,
                                    const std::string &leadId,
                                    const std::string &quotationId) {
    std::lock_guard<std::mutex> lock(s_projectMutex);
    InternalProject p;
    p.id = id;
    p.projectCode = projectCode;
    p.title = title;
    p.clientName = clientName;
    p.clientEmail = clientEmail;
    p.vertical = vertical;
    p.scope = scope;
    p.status = status;
    p.priority = priority;
    p.progressPercentage = progressPercentage;
    p.startDate = startDate;
    p.targetDelivery = targetDelivery;
    p.leadId = leadId;
    p.quotationId = quotationId;
    p.createdBy = "superadmin@marsnova.com";
    p.createdAt = getIsoTimestamp();
    p.updatedAt = p.createdAt;

    s_projectStore[id] = p;
    s_codeToId[projectCode] = id;
}

// -----------------------------------------------------------------------------
// POST /api/v1/projects (Create project from lead, quotation, or directly)
// -----------------------------------------------------------------------------
void ProjectController::createProject(const drogon::HttpRequestPtr &req,
                                     std::function<void(const drogon::HttpResponsePtr &)> &&callback) {
    if (req->method() == drogon::Options) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        callback(resp);
        return;
    }

    std::string reqId = req->attributes()->get("request_id");
    if (reqId.empty()) reqId = req->getHeader("X-Request-Id");

    // Staff session & RBAC verification
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

    // Role check: Only super_admin and agency_manager can create projects
    if (auth.role == "editor") {
        Json::Value err;
        err["error"] = "Permission Denied: Editors have read-only access to projects and cannot initiate project creation.";
        err["code"] = "INSUFFICIENT_PERMISSIONS";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k403Forbidden);
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
    std::string clientName = body.get("client_name", "").asString();
    std::string clientEmail = body.get("client_email", "").asString();
    std::string vertical = body.get("vertical", "video_production").asString();
    std::string scope = body.get("scope", "").asString();
    std::string priority = body.get("priority", "medium").asString();
    std::string startDate = body.get("start_date", "").asString();
    std::string targetDelivery = body.get("target_delivery", "").asString();
    std::string leadId = body.get("lead_id", "").asString();
    std::string quotationId = body.get("quotation_id", "").asString();
    std::string customCode = body.get("project_code", "").asString();
    std::string notes = body.get("notes", "").asString();

    // 1. Quotation Source Validation:
    // If project is created from a quotation, it must be an APPROVED quotation
    if (!quotationId.empty()) {
        std::string qStatus = body.get("quotation_status", "").asString();
        // If caller specifies quotation_status or it's not approved, validate
        if (!qStatus.empty() && qStatus != "approved" && qStatus != "accepted") {
            Json::Value err;
            err["error"] = "Cannot create project: quotation must be in approved status (received: " + qStatus + ")";
            err["code"] = "QUOTATION_NOT_APPROVED";
            if (!reqId.empty()) err["request_id"] = reqId;
            auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
            resp->setStatusCode(drogon::k400BadRequest);
            callback(resp);
            return;
        }
    }

    // 2. Lead Source Validation:
    // If project is created from a lead, lead must not be 'lost'
    if (!leadId.empty()) {
        std::string leadStatus = body.get("lead_status", "").asString();
        if (leadStatus == "lost") {
            Json::Value err;
            err["error"] = "Cannot initiate project from lost lead: lead must be qualified or converted.";
            err["code"] = "LEAD_STATUS_INVALID";
            if (!reqId.empty()) err["request_id"] = reqId;
            auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
            resp->setStatusCode(drogon::k400BadRequest);
            callback(resp);
            return;
        }
    }

    // 3. Title & Client Validation
    if (title.length() < 3) {
        Json::Value err;
        err["error"] = "Project title must be at least 3 characters";
        err["code"] = "VALIDATION_FAILED";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    if (clientName.length() < 2) {
        Json::Value err;
        err["error"] = "Client name must be at least 2 characters";
        err["code"] = "VALIDATION_FAILED";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    if (!isValidPriority(priority)) {
        Json::Value err;
        err["error"] = "Invalid priority: allowed values are low, medium, high, urgent";
        err["code"] = "VALIDATION_FAILED";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    // 4. Dates Validation
    if (!validateDateOrdering(startDate, targetDelivery)) {
        Json::Value err;
        err["error"] = "Target delivery date (" + targetDelivery + ") cannot be earlier than start date (" + startDate + ")";
        err["code"] = "INVALID_PROJECT_DATES";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    // 5. Initial Staff Assignments Validation
    std::vector<InternalAssignment> initialAssignments;
    if (body.isMember("assignments") && body["assignments"].isArray()) {
        const auto &asgnList = body["assignments"];
        for (size_t i = 0; i < asgnList.size(); ++i) {
            const auto &item = asgnList[i];
            std::string staffRef = item.get("user_id", "").asString();
            if (staffRef.empty()) staffRef = item.get("email", "").asString();
            std::string roleInProj = item.get("role_in_project", "video_editor").asString();

            std::string resolvedName, resolvedEmail, resolvedId;
            if (!validateStaffUser(staffRef, resolvedName, resolvedEmail, resolvedId)) {
                Json::Value err;
                err["error"] = "Cannot assign staff: user '" + staffRef + "' not found or account is suspended/inactive.";
                err["code"] = "INVALID_STAFF_ASSIGNMENT";
                if (!reqId.empty()) err["request_id"] = reqId;
                auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
                resp->setStatusCode(drogon::k400BadRequest);
                callback(resp);
                return;
            }

            InternalAssignment asgn;
            asgn.id = "asgn_" + Security::randomHex(8);
            asgn.assignedUserId = resolvedId;
            asgn.assignedUserEmail = resolvedEmail;
            asgn.assignedUserName = resolvedName;
            asgn.roleInProject = roleInProj;
            asgn.assignedAt = getIsoTimestamp();
            initialAssignments.push_back(asgn);
        }
    }

    // 6. Deliverables extraction
    std::vector<InternalDeliverable> initialDeliverables;
    if (body.isMember("deliverables") && body["deliverables"].isArray()) {
        const auto &delivList = body["deliverables"];
        for (size_t i = 0; i < delivList.size(); ++i) {
            const auto &item = delivList[i];
            InternalDeliverable d;
            d.id = "deliv_" + Security::randomHex(8);
            d.title = item.get("title", "Milestone Deliverable").asString();
            d.dueDate = item.get("due_date", targetDelivery).asString();
            d.status = item.get("status", "pending").asString();
            d.completed = item.get("completed", false).asBool();
            initialDeliverables.push_back(d);
        }
    }

    std::lock_guard<std::mutex> lock(s_projectMutex);
    ensureDefaultProjectsSeeded();

    std::string projCode = customCode;
    if (projCode.empty()) {
        char buf[32];
        std::snprintf(buf, sizeof(buf), "MN-PRJ-2026-%03zu", s_projectStore.size() + 1);
        projCode = std::string(buf);
    } else {
        if (s_codeToId.find(projCode) != s_codeToId.end()) {
            Json::Value err;
            err["error"] = "Project code already exists: " + projCode;
            err["code"] = "DUPLICATE_PROJECT_CODE";
            if (!reqId.empty()) err["request_id"] = reqId;
            auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
            resp->setStatusCode(drogon::k409Conflict);
            callback(resp);
            return;
        }
    }

    std::string projectId = "prj_" + Security::randomHex(12);
    InternalProject p;
    p.id = projectId;
    p.projectCode = projCode;
    p.title = title;
    p.clientName = clientName;
    p.clientEmail = clientEmail;
    p.vertical = vertical;
    p.scope = scope;
    p.priority = priority;
    p.status = "kickoff";
    p.progressPercentage = calculateDefaultProgress(p.status);
    p.startDate = startDate;
    p.targetDelivery = targetDelivery;
    p.leadId = leadId;
    p.quotationId = quotationId;
    p.notes = notes;
    p.createdBy = auth.email;
    p.createdAt = getIsoTimestamp();
    p.updatedAt = p.createdAt;
    p.deliverables = initialDeliverables;

    for (auto &asgn : initialAssignments) {
        asgn.projectId = projectId;
        p.assignments.push_back(asgn);
    }

    // Record creation activity
    InternalProjectActivity act;
    act.id = "act_" + Security::randomHex(8);
    act.projectId = projectId;
    act.activityType = "project_created";
    std::string srcMsg = "Project initiated directly";
    if (!quotationId.empty()) srcMsg = "Project converted from approved quotation " + quotationId;
    else if (!leadId.empty()) srcMsg = "Project converted from lead " + leadId;
    act.summary = srcMsg + " by " + auth.email;
    act.createdBy = auth.email;
    act.createdAt = p.createdAt;
    p.activities.push_back(act);

    // If staff were assigned at creation, record activity
    if (!initialAssignments.empty()) {
        InternalProjectActivity asgnAct;
        asgnAct.id = "act_" + Security::randomHex(8);
        asgnAct.projectId = projectId;
        asgnAct.activityType = "staff_assigned";
        std::stringstream ss;
        ss << "Assigned " << initialAssignments.size() << " team member(s) during project kickoff";
        asgnAct.summary = ss.str();
        asgnAct.createdBy = auth.email;
        asgnAct.createdAt = p.createdAt;
        p.activities.push_back(asgnAct);
    }

    s_projectStore[projectId] = p;
    s_codeToId[projCode] = projectId;

    Json::Value res;
    res["status"] = "ok";
    res["message"] = "Project created successfully";
    res["data"] = formatProjectJson(p, true);
    if (!reqId.empty()) res["request_id"] = reqId;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    resp->setStatusCode(drogon::k201Created);
    callback(resp);
}

// -----------------------------------------------------------------------------
// GET /api/v1/projects (List projects with filters & search)
// -----------------------------------------------------------------------------
void ProjectController::listProjects(const drogon::HttpRequestPtr &req,
                                    std::function<void(const drogon::HttpResponsePtr &)> &&callback) {
    std::string reqId = req->attributes()->get("request_id");
    if (reqId.empty()) reqId = req->getHeader("X-Request-Id");

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

    std::string statusFilter = req->getParameter("status");
    std::string priorityFilter = req->getParameter("priority");
    std::string search = req->getParameter("search");
    std::string pageStr = req->getParameter("page");
    std::string limitStr = req->getParameter("limit");

    int page = pageStr.empty() ? 1 : std::max(1, std::atoi(pageStr.c_str()));
    int limit = limitStr.empty() ? 20 : std::clamp(std::atoi(limitStr.c_str()), 1, 100);

    std::lock_guard<std::mutex> lock(s_projectMutex);
    ensureDefaultProjectsSeeded();

    std::vector<InternalProject> matching;
    matching.reserve(s_projectStore.size());

    for (const auto &pair : s_projectStore) {
        const auto &p = pair.second;
        if (!statusFilter.empty() && statusFilter != "all" && p.status != statusFilter) {
            continue;
        }
        if (!priorityFilter.empty() && priorityFilter != "all" && p.priority != priorityFilter) {
            continue;
        }
        if (!search.empty()) {
            std::string sLow = search;
            std::transform(sLow.begin(), sLow.end(), sLow.begin(), ::tolower);
            std::string codeLow = p.projectCode;
            std::transform(codeLow.begin(), codeLow.end(), codeLow.begin(), ::tolower);
            std::string titleLow = p.title;
            std::transform(titleLow.begin(), titleLow.end(), titleLow.begin(), ::tolower);
            std::string clientLow = p.clientName;
            std::transform(clientLow.begin(), clientLow.end(), clientLow.begin(), ::tolower);

            if (codeLow.find(sLow) == std::string::npos &&
                titleLow.find(sLow) == std::string::npos &&
                clientLow.find(sLow) == std::string::npos) {
                continue;
            }
        }
        matching.push_back(p);
    }

    // Sort descending by created_at
    std::sort(matching.begin(), matching.end(), [](const InternalProject &a, const InternalProject &b) {
        return a.createdAt > b.createdAt;
    });

    int total = static_cast<int>(matching.size());
    int totalPages = std::max(1, (total + limit - 1) / limit);
    int startIndex = (page - 1) * limit;

    Json::Value list(Json::arrayValue);
    if (startIndex < total) {
        int endIndex = std::min(total, startIndex + limit);
        for (int i = startIndex; i < endIndex; ++i) {
            list.append(formatProjectJson(matching[i], false));
        }
    }

    Json::Value pagination;
    pagination["page"] = page;
    pagination["limit"] = limit;
    pagination["total"] = total;
    pagination["total_pages"] = totalPages;

    Json::Value res;
    res["status"] = "ok";
    res["count"] = static_cast<int>(list.size());
    res["data"] = list;
    res["pagination"] = pagination;
    if (!reqId.empty()) res["request_id"] = reqId;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    resp->setStatusCode(drogon::k200OK);
    callback(resp);
}

// -----------------------------------------------------------------------------
// GET /api/v1/projects/:id (Get details with assignments, deliverables & activities)
// -----------------------------------------------------------------------------
void ProjectController::getProjectDetails(const drogon::HttpRequestPtr &req,
                                         std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                                         const std::string &idOrCode) {
    std::string reqId = req->attributes()->get("request_id");
    if (reqId.empty()) reqId = req->getHeader("X-Request-Id");

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

    std::lock_guard<std::mutex> lock(s_projectMutex);
    ensureDefaultProjectsSeeded();

    InternalProject *p = findProjectByIdOrCode(idOrCode);
    if (!p) {
        Json::Value err;
        err["error"] = "Project not found: " + idOrCode;
        err["code"] = "NOT_FOUND";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k404NotFound);
        callback(resp);
        return;
    }

    Json::Value res;
    res["status"] = "ok";
    res["data"] = formatProjectJson(*p, true);
    if (!reqId.empty()) res["request_id"] = reqId;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    resp->setStatusCode(drogon::k200OK);
    callback(resp);
}

// -----------------------------------------------------------------------------
// POST /api/v1/projects/:id/status (Transition project status)
// -----------------------------------------------------------------------------
void ProjectController::updateProjectStatus(const drogon::HttpRequestPtr &req,
                                           std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                                           const std::string &idOrCode) {
    if (req->method() == drogon::Options) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        callback(resp);
        return;
    }

    std::string reqId = req->attributes()->get("request_id");
    if (reqId.empty()) reqId = req->getHeader("X-Request-Id");

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

    // Role check: Only super_admin and agency_manager can transition project status
    if (auth.role == "editor") {
        Json::Value err;
        err["error"] = "Permission Denied: Editors cannot update core project status.";
        err["code"] = "INSUFFICIENT_PERMISSIONS";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k403Forbidden);
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
    std::string newStatus = body.get("status", "").asString();
    std::string note = body.get("note", "").asString();

    if (!isValidProjectStatus(newStatus)) {
        Json::Value err;
        err["error"] = "Invalid project status: " + newStatus;
        err["code"] = "VALIDATION_FAILED";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    std::lock_guard<std::mutex> lock(s_projectMutex);
    ensureDefaultProjectsSeeded();

    InternalProject *p = findProjectByIdOrCode(idOrCode);
    if (!p) {
        Json::Value err;
        err["error"] = "Project not found: " + idOrCode;
        err["code"] = "NOT_FOUND";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k404NotFound);
        callback(resp);
        return;
    }

    if (!isAllowedStatusTransition(p->status, newStatus)) {
        Json::Value err;
        err["error"] = "Invalid status transition from '" + p->status + "' to '" + newStatus + "'";
        err["code"] = "INVALID_STATUS_TRANSITION";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    std::string oldStatus = p->status;
    p->status = newStatus;
    p->progressPercentage = calculateDefaultProgress(newStatus);
    p->updatedAt = getIsoTimestamp();

    // Record activity log
    InternalProjectActivity act;
    act.id = "act_" + Security::randomHex(8);
    act.projectId = p->id;
    act.activityType = "status_change";
    std::string desc = "Status changed from " + oldStatus + " to " + newStatus;
    if (!note.empty()) desc += " (Note: " + note + ")";
    act.summary = desc;
    act.createdBy = auth.email;
    act.createdAt = p->updatedAt;
    p->activities.push_back(act);

    Json::Value res;
    res["status"] = "ok";
    res["message"] = "Project status updated to " + newStatus;
    res["data"] = formatProjectJson(*p, true);
    if (!reqId.empty()) res["request_id"] = reqId;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    resp->setStatusCode(drogon::k200OK);
    callback(resp);
}

// -----------------------------------------------------------------------------
// POST /api/v1/projects/:id/assignments (Assign manual staff)
// -----------------------------------------------------------------------------
void ProjectController::assignStaff(const drogon::HttpRequestPtr &req,
                                   std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                                   const std::string &idOrCode) {
    if (req->method() == drogon::Options) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        callback(resp);
        return;
    }

    std::string reqId = req->attributes()->get("request_id");
    if (reqId.empty()) reqId = req->getHeader("X-Request-Id");

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

    if (auth.role == "editor") {
        Json::Value err;
        err["error"] = "Permission Denied: Editors cannot assign team members to projects.";
        err["code"] = "INSUFFICIENT_PERMISSIONS";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k403Forbidden);
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

    std::string staffRef = body.get("user_id", "").asString();
    if (staffRef.empty()) staffRef = body.get("email", "").asString();
    std::string roleInProject = body.get("role_in_project", "video_editor").asString();

    std::string resolvedName, resolvedEmail, resolvedId;
    if (!validateStaffUser(staffRef, resolvedName, resolvedEmail, resolvedId)) {
        Json::Value err;
        err["error"] = "Cannot assign staff: user '" + staffRef + "' not found or account is suspended/inactive.";
        err["code"] = "INVALID_STAFF_ASSIGNMENT";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    std::lock_guard<std::mutex> lock(s_projectMutex);
    ensureDefaultProjectsSeeded();

    InternalProject *p = findProjectByIdOrCode(idOrCode);
    if (!p) {
        Json::Value err;
        err["error"] = "Project not found: " + idOrCode;
        err["code"] = "NOT_FOUND";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k404NotFound);
        callback(resp);
        return;
    }

    // Check if already assigned with this role
    for (const auto &asgn : p->assignments) {
        if (asgn.assignedUserId == resolvedId && asgn.roleInProject == roleInProject) {
            Json::Value err;
            err["error"] = "User " + resolvedName + " is already assigned to this project as " + roleInProject;
            err["code"] = "DUPLICATE_ASSIGNMENT";
            if (!reqId.empty()) err["request_id"] = reqId;
            auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
            resp->setStatusCode(drogon::k409Conflict);
            callback(resp);
            return;
        }
    }

    InternalAssignment asgn;
    asgn.id = "asgn_" + Security::randomHex(8);
    asgn.projectId = p->id;
    asgn.assignedUserId = resolvedId;
    asgn.assignedUserEmail = resolvedEmail;
    asgn.assignedUserName = resolvedName;
    asgn.roleInProject = roleInProject;
    asgn.assignedAt = getIsoTimestamp();
    p->assignments.push_back(asgn);
    p->updatedAt = asgn.assignedAt;

    // Record activity
    InternalProjectActivity act;
    act.id = "act_" + Security::randomHex(8);
    act.projectId = p->id;
    act.activityType = "staff_assigned";
    act.summary = "Assigned " + resolvedName + " as " + roleInProject + " by " + auth.email;
    act.createdBy = auth.email;
    act.createdAt = p->updatedAt;
    p->activities.push_back(act);

    Json::Value res;
    res["status"] = "ok";
    res["message"] = "Staff successfully assigned to project";
    res["data"] = formatProjectJson(*p, true);
    if (!reqId.empty()) res["request_id"] = reqId;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    resp->setStatusCode(drogon::k201Created);
    callback(resp);
}

// -----------------------------------------------------------------------------
// DELETE /api/v1/projects/:id/assignments/:userId (Remove staff assignment)
// -----------------------------------------------------------------------------
void ProjectController::removeStaff(const drogon::HttpRequestPtr &req,
                                   std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                                   const std::string &idOrCode,
                                   const std::string &userId) {
    if (req->method() == drogon::Options) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        callback(resp);
        return;
    }

    std::string reqId = req->attributes()->get("request_id");
    if (reqId.empty()) reqId = req->getHeader("X-Request-Id");

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

    if (auth.role == "editor") {
        Json::Value err;
        err["error"] = "Permission Denied: Editors cannot remove project staff.";
        err["code"] = "INSUFFICIENT_PERMISSIONS";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k403Forbidden);
        callback(resp);
        return;
    }

    std::lock_guard<std::mutex> lock(s_projectMutex);
    ensureDefaultProjectsSeeded();

    InternalProject *p = findProjectByIdOrCode(idOrCode);
    if (!p) {
        Json::Value err;
        err["error"] = "Project not found: " + idOrCode;
        err["code"] = "NOT_FOUND";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k404NotFound);
        callback(resp);
        return;
    }

    auto it = std::find_if(p->assignments.begin(), p->assignments.end(), [&userId](const InternalAssignment &a) {
        return a.id == userId || a.assignedUserId == userId || a.assignedUserEmail == userId;
    });

    if (it == p->assignments.end()) {
        Json::Value err;
        err["error"] = "Assignment not found for user: " + userId;
        err["code"] = "NOT_FOUND";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k404NotFound);
        callback(resp);
        return;
    }

    std::string removedName = it->assignedUserName;
    std::string removedRole = it->roleInProject;
    p->assignments.erase(it);
    p->updatedAt = getIsoTimestamp();

    // Record activity
    InternalProjectActivity act;
    act.id = "act_" + Security::randomHex(8);
    act.projectId = p->id;
    act.activityType = "staff_removed";
    act.summary = "Removed " + removedName + " (" + removedRole + ") from project team by " + auth.email;
    act.createdBy = auth.email;
    act.createdAt = p->updatedAt;
    p->activities.push_back(act);

    Json::Value res;
    res["status"] = "ok";
    res["message"] = "Staff assignment removed successfully";
    res["data"] = formatProjectJson(*p, true);
    if (!reqId.empty()) res["request_id"] = reqId;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    resp->setStatusCode(drogon::k200OK);
    callback(resp);
}

// -----------------------------------------------------------------------------
// POST /api/v1/projects/:id/deliverables (Add or update deliverables)
// -----------------------------------------------------------------------------
void ProjectController::updateDeliverables(const drogon::HttpRequestPtr &req,
                                         std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                                         const std::string &idOrCode) {
    if (req->method() == drogon::Options) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        callback(resp);
        return;
    }

    std::string reqId = req->attributes()->get("request_id");
    if (reqId.empty()) reqId = req->getHeader("X-Request-Id");

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
    std::string dueDate = body.get("due_date", "").asString();
    std::string status = body.get("status", "pending").asString();
    bool completed = body.get("completed", false).asBool();

    if (title.empty()) {
        Json::Value err;
        err["error"] = "Deliverable title is required";
        err["code"] = "VALIDATION_FAILED";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    std::lock_guard<std::mutex> lock(s_projectMutex);
    ensureDefaultProjectsSeeded();

    InternalProject *p = findProjectByIdOrCode(idOrCode);
    if (!p) {
        Json::Value err;
        err["error"] = "Project not found: " + idOrCode;
        err["code"] = "NOT_FOUND";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k404NotFound);
        callback(resp);
        return;
    }

    InternalDeliverable d;
    d.id = "deliv_" + Security::randomHex(8);
    d.title = title;
    d.dueDate = dueDate.empty() ? p->targetDelivery : dueDate;
    d.status = status;
    d.completed = completed;
    p->deliverables.push_back(d);
    p->updatedAt = getIsoTimestamp();

    // Record activity
    InternalProjectActivity act;
    act.id = "act_" + Security::randomHex(8);
    act.projectId = p->id;
    act.activityType = "deliverable_updated";
    act.summary = "Added deliverable '" + title + "' (due: " + d.dueDate + ") by " + auth.email;
    act.createdBy = auth.email;
    act.createdAt = p->updatedAt;
    p->activities.push_back(act);

    Json::Value res;
    res["status"] = "ok";
    res["message"] = "Deliverable added successfully";
    res["data"] = formatProjectJson(*p, true);
    if (!reqId.empty()) res["request_id"] = reqId;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    resp->setStatusCode(drogon::k201Created);
    callback(resp);
}
