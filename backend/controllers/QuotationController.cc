#include "QuotationController.h"
#include "AuthController.h"
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

struct InternalQuotationRevision {
    std::string id;
    std::string quotationId;
    int revisionNumber{1};
    std::string scope;
    std::string amount;      // Formatted decimal e.g. "45000.00"
    std::string currency;    // e.g. "INR"
    std::string terms;
    std::string validUntil;  // YYYY-MM-DD
    std::string changeSummary;
    std::string createdBy;
    std::string createdAt;
};

struct InternalQuotation {
    std::string id;
    std::string reference;   // e.g. "MN-QT-2026-001"
    std::string leadId;
    std::string clientName;
    std::string clientEmail;
    std::string serviceType;
    std::string scope;
    std::string amount;      // Decimal string e.g. "45000.00"
    std::string currency;    // "INR", "USD", "EUR", "GBP", "AED"
    std::string terms;
    std::string validUntil;  // YYYY-MM-DD
    std::string status;      // draft, sent, approved, rejected, expired, cancelled
    int revisionNumber{1};
    std::string idempotencyKey;
    std::string createdBy;
    std::string createdAt;
    std::string updatedAt;
    std::vector<InternalQuotationRevision> revisions;
};

static std::mutex s_quoteMutex;
static std::unordered_map<std::string, InternalQuotation> s_quoteStore;
static std::unordered_map<std::string, std::string> s_refToId;
static std::unordered_map<std::string, std::string> s_idempotencyToId;
static bool s_seeded = false;

static std::string getIsoTimestamp() {
    auto now = std::chrono::system_clock::now();
    auto in_time_t = std::chrono::system_clock::to_time_t(now);
    std::stringstream ss;
    ss << std::put_time(std::gmtime(&in_time_t), "%Y-%m-%dT%H:%M:%SZ");
    return ss.str();
}

static std::string getCurrentDateString() {
    auto now = std::chrono::system_clock::now();
    auto in_time_t = std::chrono::system_clock::to_time_t(now);
    std::stringstream ss;
    ss << std::put_time(std::gmtime(&in_time_t), "%Y-%m-%d");
    return ss.str();
}

static bool isValidEmail(const std::string &email) {
    static const std::regex pattern(R"(^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$)");
    return std::regex_match(email, pattern);
}

// Decimal monetary precision validator and formatter (e.g. "45000.00", "125000.50")
static bool parseDecimalAmount(const std::string &raw, std::string &outFormatted, double &outValue) {
    if (raw.empty()) return false;
    // Regex allows digits with optional 1 or 2 decimal places: ^[0-9]+(\.[0-9]{1,2})?$
    static const std::regex decRegex(R"(^[0-9]+(\.[0-9]{1,2})?$)");
    if (!std::regex_match(raw, decRegex)) {
        return false;
    }
    try {
        double val = std::stod(raw);
        if (val < 0.0) return false;
        char buf[64];
        std::snprintf(buf, sizeof(buf), "%.2f", val);
        outFormatted = std::string(buf);
        outValue = val;
        return true;
    } catch (...) {
        return false;
    }
}

static bool isAllowedCurrency(const std::string &curr) {
    return curr == "INR" || curr == "USD" || curr == "EUR" || curr == "GBP" || curr == "AED";
}

// Checks if validity date has passed
static bool isDatePassed(const std::string &validUntilDate) {
    if (validUntilDate.length() < 10) return false;
    std::string today = getCurrentDateString();
    return validUntilDate < today;
}

static bool isTransitionAllowed(const std::string &from, const std::string &to) {
    if (from == to) return true;
    if (from == "draft") {
        return to == "sent" || to == "cancelled";
    }
    if (from == "sent") {
        return to == "approved" || to == "rejected" || to == "expired" || to == "cancelled";
    }
    if (from == "approved") {
        return to == "cancelled"; // Can cancel approved contract prior to kickoff
    }
    if (from == "rejected") {
        return to == "draft" || to == "cancelled"; // Can restart into draft via revision
    }
    if (from == "expired") {
        return to == "draft" || to == "cancelled"; // Can renew expired quote into draft via revision
    }
    // "cancelled" is a terminal state
    return false;
}

static Json::Value formatRevisionJson(const InternalQuotationRevision &rev) {
    Json::Value j;
    j["id"] = rev.id;
    j["quotation_id"] = rev.quotationId;
    j["revision_number"] = rev.revisionNumber;
    j["scope"] = rev.scope;
    j["amount"] = rev.amount;
    j["currency"] = rev.currency;
    j["terms"] = rev.terms;
    j["valid_until"] = rev.validUntil;
    j["change_summary"] = rev.changeSummary;
    j["created_by"] = rev.createdBy;
    j["created_at"] = rev.createdAt;
    return j;
}

static Json::Value formatQuotationJson(const InternalQuotation &q, bool includeRevisions = true) {
    Json::Value j;
    j["id"] = q.id;
    j["reference"] = q.reference;
    j["lead_id"] = q.leadId;
    j["client_name"] = q.clientName;
    j["client_email"] = q.clientEmail;
    j["service_type"] = q.serviceType;
    j["scope"] = q.scope;
    j["amount"] = q.amount;
    j["currency"] = q.currency;
    j["terms"] = q.terms;
    j["valid_until"] = q.validUntil;
    j["status"] = q.status;
    j["revision_number"] = q.revisionNumber;
    j["is_expired"] = isDatePassed(q.validUntil) && (q.status == "draft" || q.status == "sent");
    j["created_by"] = q.createdBy;
    j["created_at"] = q.createdAt;
    j["updated_at"] = q.updatedAt;

    // Explicit record-only documentation: no checkout, gateways, webhooks, or commissions
    j["is_record_only"] = true;

    if (includeRevisions) {
        Json::Value revArr(Json::arrayValue);
        for (const auto &rev : q.revisions) {
            revArr.append(formatRevisionJson(rev));
        }
        j["revisions"] = revArr;
    }
    return j;
}

static void ensureDefaultQuotationsSeeded() {
    if (s_seeded) return;
    s_seeded = true;

    InternalQuotation q1;
    q1.id = "qt_techflow_001";
    q1.reference = "MN-QT-2026-001";
    q1.leadId = "lead_techflow_001";
    q1.clientName = "TechFlow Innovations";
    q1.clientEmail = "contact@techflow.io";
    q1.serviceType = "Topic to Video + Shorts Package";
    q1.scope = "Production of 4 long-form YouTube documentary episodes + 16 vertical shorts with 3D motion graphics and custom sound design.";
    q1.amount = "45000.00";
    q1.currency = "INR";
    q1.terms = "50% advance on project agreement; 50% on milestone sign-off prior to master asset release. Net 15 days.";
    q1.validUntil = "2026-11-15";
    q1.status = "sent";
    q1.revisionNumber = 1;
    q1.createdBy = "superadmin@marsnova.com";
    q1.createdAt = "2026-10-20T10:00:00Z";
    q1.updatedAt = "2026-10-20T10:00:00Z";

    InternalQuotationRevision rev1;
    rev1.id = "rev_techflow_001_1";
    rev1.quotationId = q1.id;
    rev1.revisionNumber = 1;
    rev1.scope = q1.scope;
    rev1.amount = q1.amount;
    rev1.currency = q1.currency;
    rev1.terms = q1.terms;
    rev1.validUntil = q1.validUntil;
    rev1.changeSummary = "Initial manual quotation prepared for TechFlow.";
    rev1.createdBy = q1.createdBy;
    rev1.createdAt = q1.createdAt;
    q1.revisions.push_back(rev1);

    s_quoteStore[q1.id] = q1;
    s_refToId[q1.reference] = q1.id;

    InternalQuotation q2;
    q2.id = "qt_quantum_002";
    q2.reference = "MN-QT-2026-002";
    q2.leadId = "lead_quantum_002";
    q2.clientName = "Quantum Leap Health";
    q2.clientEmail = "marketing@quantumleap.health";
    q2.serviceType = "Brand Identity & Design System";
    q2.scope = "Full medical-tech brand identity design system including typography, color architecture, vector icon library, and brand guidelines manual.";
    q2.amount = "125000.50";
    q2.currency = "INR";
    q2.terms = "100% milestone-based: 40% initial, 30% intermediate review, 30% final brand pack delivery.";
    q2.validUntil = "2026-11-30";
    q2.status = "approved";
    q2.revisionNumber = 1;
    q2.createdBy = "manager@marsnova.com";
    q2.createdAt = "2026-10-21T11:00:00Z";
    q2.updatedAt = "2026-10-21T11:00:00Z";

    InternalQuotationRevision rev2;
    rev2.id = "rev_quantum_002_1";
    rev2.quotationId = q2.id;
    rev2.revisionNumber = 1;
    rev2.scope = q2.scope;
    rev2.amount = q2.amount;
    rev2.currency = q2.currency;
    rev2.terms = q2.terms;
    rev2.validUntil = q2.validUntil;
    rev2.changeSummary = "Formal brand identity proposal and milestone schedule.";
    rev2.createdBy = q2.createdBy;
    rev2.createdAt = q2.createdAt;
    q2.revisions.push_back(rev2);

    s_quoteStore[q2.id] = q2;
    s_refToId[q2.reference] = q2.id;
}

static InternalQuotation* findQuotationByIdOrRef(const std::string &idOrRef) {
    auto it = s_quoteStore.find(idOrRef);
    if (it != s_quoteStore.end()) {
        return &(it->second);
    }
    auto itRef = s_refToId.find(idOrRef);
    if (itRef != s_refToId.end()) {
        auto it2 = s_quoteStore.find(itRef->second);
        if (it2 != s_quoteStore.end()) {
            return &(it2->second);
        }
    }
    return nullptr;
}

} // namespace

void QuotationController::resetStore() {
    std::lock_guard<std::mutex> lock(s_quoteMutex);
    s_quoteStore.clear();
    s_refToId.clear();
    s_idempotencyToId.clear();
    s_seeded = false;
}

void QuotationController::seedQuotation(const std::string &id,
                                        const std::string &reference,
                                        const std::string &clientName,
                                        const std::string &clientEmail,
                                        const std::string &serviceType,
                                        const std::string &scope,
                                        const std::string &amountStr,
                                        const std::string &currency,
                                        const std::string &validUntil,
                                        const std::string &status,
                                        int revisionNumber,
                                        const std::string &leadId) {
    std::lock_guard<std::mutex> lock(s_quoteMutex);
    InternalQuotation q;
    q.id = id;
    q.reference = reference;
    q.leadId = leadId;
    q.clientName = clientName;
    q.clientEmail = clientEmail;
    q.serviceType = serviceType;
    q.scope = scope;
    q.amount = amountStr;
    q.currency = currency;
    q.terms = "Standard MarsNova studio terms. Records only.";
    q.validUntil = validUntil;
    q.status = status;
    q.revisionNumber = revisionNumber;
    q.createdBy = "superadmin@marsnova.com";
    q.createdAt = getIsoTimestamp();
    q.updatedAt = q.createdAt;

    InternalQuotationRevision rev;
    rev.id = "rev_" + id + "_" + std::to_string(revisionNumber);
    rev.quotationId = id;
    rev.revisionNumber = revisionNumber;
    rev.scope = scope;
    rev.amount = amountStr;
    rev.currency = currency;
    rev.terms = q.terms;
    rev.validUntil = validUntil;
    rev.changeSummary = "Seeded quotation revision " + std::to_string(revisionNumber);
    rev.createdBy = q.createdBy;
    rev.createdAt = q.createdAt;
    q.revisions.push_back(rev);

    s_quoteStore[id] = q;
    s_refToId[reference] = id;
}

// -----------------------------------------------------------------------------
// POST /api/v1/quotations (Create manual quotation)
// -----------------------------------------------------------------------------
void QuotationController::createQuotation(const drogon::HttpRequestPtr &req,
                                         std::function<void(const drogon::HttpResponsePtr &)> &&callback) {
    if (req->method() == drogon::Options) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        callback(resp);
        return;
    }

    std::string reqId = req->attributes()->get("request_id");
    if (reqId.empty()) reqId = req->getHeader("X-Request-Id");

    // 1. Staff session & RBAC verification
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

    // Role check: Only super_admin and agency_manager can create quotations
    if (auth.role == "editor") {
        Json::Value err;
        err["error"] = "Permission Denied: Editors have read-only access to quotations.";
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

    std::string clientName = body.get("client_name", "").asString();
    std::string clientEmail = body.get("client_email", "").asString();
    std::string serviceType = body.get("service_type", "").asString();
    std::string scope = body.get("scope", "").asString();
    std::string rawAmount = body.get("amount", "").isString() ? body["amount"].asString() : std::to_string(body.get("amount", 0.0).asDouble());
    std::string currency = body.get("currency", "INR").asString();
    std::string terms = body.get("terms", "Standard studio payment terms. Net 15 days.").asString();
    std::string validUntil = body.get("valid_until", "").asString();
    std::string leadId = body.get("lead_id", "").asString();
    std::string customRef = body.get("reference", "").asString();
    std::string idempotencyKey = body.get("idempotency_key", "").asString();

    // 2. Validation
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

    if (!clientEmail.empty() && !isValidEmail(clientEmail)) {
        Json::Value err;
        err["error"] = "Invalid client email address";
        err["code"] = "VALIDATION_FAILED";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    if (serviceType.empty()) {
        Json::Value err;
        err["error"] = "Service type is required";
        err["code"] = "VALIDATION_FAILED";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    if (scope.empty()) {
        Json::Value err;
        err["error"] = "Scope of work is required for manual quotations";
        err["code"] = "VALIDATION_FAILED";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    // Decimal monetary precision parsing
    std::string formattedAmount;
    double numericAmount = 0.0;
    if (!parseDecimalAmount(rawAmount, formattedAmount, numericAmount)) {
        Json::Value err;
        err["error"] = "Invalid amount: must be a positive decimal number with up to 2 decimal places";
        err["code"] = "INVALID_DECIMAL_AMOUNT";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    if (!isAllowedCurrency(currency)) {
        Json::Value err;
        err["error"] = "Unsupported currency: allowed currencies are INR, USD, EUR, GBP, AED";
        err["code"] = "INVALID_CURRENCY";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    if (validUntil.length() < 10) {
        Json::Value err;
        err["error"] = "Valid until date is required (format: YYYY-MM-DD)";
        err["code"] = "VALIDATION_FAILED";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    std::lock_guard<std::mutex> lock(s_quoteMutex);
    ensureDefaultQuotationsSeeded();

    // 3. Duplicate check via idempotency key
    if (!idempotencyKey.empty()) {
        auto itIdemp = s_idempotencyToId.find(idempotencyKey);
        if (itIdemp != s_idempotencyToId.end()) {
            Json::Value err;
            err["error"] = "Duplicate quotation request detected (idempotency key already used)";
            err["code"] = "DUPLICATE_QUOTATION";
            err["existing_quotation_id"] = itIdemp->second;
            if (!reqId.empty()) err["request_id"] = reqId;
            auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
            resp->setStatusCode(drogon::k409Conflict);
            callback(resp);
            return;
        }
    }

    // 4. Generate or validate quotation reference
    std::string ref = customRef;
    if (ref.empty()) {
        char buf[32];
        std::snprintf(buf, sizeof(buf), "MN-QT-2026-%03zu", s_quoteStore.size() + 1);
        ref = std::string(buf);
    } else {
        if (s_refToId.find(ref) != s_refToId.end()) {
            Json::Value err;
            err["error"] = "Quotation reference already exists: " + ref;
            err["code"] = "DUPLICATE_QUOTATION";
            if (!reqId.empty()) err["request_id"] = reqId;
            auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
            resp->setStatusCode(drogon::k409Conflict);
            callback(resp);
            return;
        }
    }

    // 5. Construct quotation record
    std::string quoteId = "qt_" + Security::randomHex(12);
    InternalQuotation q;
    q.id = quoteId;
    q.reference = ref;
    q.leadId = leadId;
    q.clientName = clientName;
    q.clientEmail = clientEmail;
    q.serviceType = serviceType;
    q.scope = scope;
    q.amount = formattedAmount;
    q.currency = currency;
    q.terms = terms;
    q.validUntil = validUntil;
    q.status = "draft";
    q.revisionNumber = 1;
    q.idempotencyKey = idempotencyKey;
    q.createdBy = auth.email;
    q.createdAt = getIsoTimestamp();
    q.updatedAt = q.createdAt;

    // Initial revision 1
    InternalQuotationRevision rev;
    rev.id = "rev_" + Security::randomHex(12);
    rev.quotationId = quoteId;
    rev.revisionNumber = 1;
    rev.scope = scope;
    rev.amount = formattedAmount;
    rev.currency = currency;
    rev.terms = terms;
    rev.validUntil = validUntil;
    rev.changeSummary = "Initial manual quotation record created.";
    rev.createdBy = auth.email;
    rev.createdAt = q.createdAt;
    q.revisions.push_back(rev);

    s_quoteStore[quoteId] = q;
    s_refToId[ref] = quoteId;
    if (!idempotencyKey.empty()) {
        s_idempotencyToId[idempotencyKey] = quoteId;
    }

    Json::Value res;
    res["status"] = "ok";
    res["message"] = "Manual quotation created successfully";
    res["data"] = formatQuotationJson(q, true);
    if (!reqId.empty()) res["request_id"] = reqId;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    resp->setStatusCode(drogon::k201Created);
    callback(resp);
}

// -----------------------------------------------------------------------------
// GET /api/v1/quotations (List quotations with search & status filters)
// -----------------------------------------------------------------------------
void QuotationController::listQuotations(const drogon::HttpRequestPtr &req,
                                        std::function<void(const drogon::HttpResponsePtr &)> &&callback) {
    std::string reqId = req->attributes()->get("request_id");
    if (reqId.empty()) reqId = req->getHeader("X-Request-Id");

    // Staff session check (All roles: super_admin, agency_manager, editor have read access)
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
    std::string leadFilter = req->getParameter("lead_id");
    std::string search = req->getParameter("search");
    std::string pageStr = req->getParameter("page");
    std::string limitStr = req->getParameter("limit");

    int page = pageStr.empty() ? 1 : std::max(1, std::atoi(pageStr.c_str()));
    int limit = limitStr.empty() ? 20 : std::clamp(std::atoi(limitStr.c_str()), 1, 100);

    std::lock_guard<std::mutex> lock(s_quoteMutex);
    ensureDefaultQuotationsSeeded();

    std::vector<InternalQuotation> matching;
    matching.reserve(s_quoteStore.size());

    for (const auto &pair : s_quoteStore) {
        const auto &q = pair.second;
        if (!statusFilter.empty() && statusFilter != "all" && q.status != statusFilter) {
            continue;
        }
        if (!leadFilter.empty() && q.leadId != leadFilter) {
            continue;
        }
        if (!search.empty()) {
            std::string sLow = search;
            std::transform(sLow.begin(), sLow.end(), sLow.begin(), ::tolower);
            std::string refLow = q.reference;
            std::transform(refLow.begin(), refLow.end(), refLow.begin(), ::tolower);
            std::string clientLow = q.clientName;
            std::transform(clientLow.begin(), clientLow.end(), clientLow.begin(), ::tolower);

            if (refLow.find(sLow) == std::string::npos && clientLow.find(sLow) == std::string::npos) {
                continue;
            }
        }
        matching.push_back(q);
    }

    // Sort descending by created_at
    std::sort(matching.begin(), matching.end(), [](const InternalQuotation &a, const InternalQuotation &b) {
        return a.createdAt > b.createdAt;
    });

    int total = static_cast<int>(matching.size());
    int totalPages = std::max(1, (total + limit - 1) / limit);
    int startIndex = (page - 1) * limit;

    Json::Value list(Json::arrayValue);
    if (startIndex < total) {
        int endIndex = std::min(total, startIndex + limit);
        for (int i = startIndex; i < endIndex; ++i) {
            list.append(formatQuotationJson(matching[i], false));
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
// GET /api/v1/quotations/:id (Details with complete revision history)
// -----------------------------------------------------------------------------
void QuotationController::getQuotationDetails(const drogon::HttpRequestPtr &req,
                                             std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                                             const std::string &idOrRef) {
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

    std::lock_guard<std::mutex> lock(s_quoteMutex);
    ensureDefaultQuotationsSeeded();

    InternalQuotation *q = findQuotationByIdOrRef(idOrRef);
    if (!q) {
        Json::Value err;
        err["error"] = "Quotation not found: " + idOrRef;
        err["code"] = "NOT_FOUND";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k404NotFound);
        callback(resp);
        return;
    }

    Json::Value res;
    res["status"] = "ok";
    res["data"] = formatQuotationJson(*q, true);
    if (!reqId.empty()) res["request_id"] = reqId;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    resp->setStatusCode(drogon::k200OK);
    callback(resp);
}

// -----------------------------------------------------------------------------
// POST /api/v1/quotations/:id/status (Transition status with state machine)
// -----------------------------------------------------------------------------
void QuotationController::updateQuotationStatus(const drogon::HttpRequestPtr &req,
                                               std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                                               const std::string &idOrRef) {
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

    // Role check: Only super_admin and agency_manager can change quotation status
    if (auth.role == "editor") {
        Json::Value err;
        err["error"] = "Permission Denied: Editors have read-only access to quotations.";
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
    std::string statusNote = body.get("note", "").asString();

    std::lock_guard<std::mutex> lock(s_quoteMutex);
    ensureDefaultQuotationsSeeded();

    InternalQuotation *q = findQuotationByIdOrRef(idOrRef);
    if (!q) {
        Json::Value err;
        err["error"] = "Quotation not found: " + idOrRef;
        err["code"] = "NOT_FOUND";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k404NotFound);
        callback(resp);
        return;
    }

    // Expiry check: if attempting to approve an expired quote, reject
    bool expired = isDatePassed(q->validUntil);
    if (newStatus == "approved" && expired) {
        Json::Value err;
        err["error"] = "Cannot approve quotation: validity period expired on " + q->validUntil + ". Please issue a new revision.";
        err["code"] = "QUOTATION_EXPIRED";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    // State machine check
    if (!isTransitionAllowed(q->status, newStatus)) {
        Json::Value err;
        err["error"] = "Invalid status transition from '" + q->status + "' to '" + newStatus + "'";
        err["code"] = "INVALID_STATUS_TRANSITION";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    q->status = newStatus;
    q->updatedAt = getIsoTimestamp();

    Json::Value res;
    res["status"] = "ok";
    res["message"] = "Quotation status updated to " + newStatus;
    res["data"] = formatQuotationJson(*q, true);
    if (!reqId.empty()) res["request_id"] = reqId;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    resp->setStatusCode(drogon::k200OK);
    callback(resp);
}

// -----------------------------------------------------------------------------
// POST /api/v1/quotations/:id/revisions (Create a new revision)
// -----------------------------------------------------------------------------
void QuotationController::createQuotationRevision(const drogon::HttpRequestPtr &req,
                                                 std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                                                 const std::string &idOrRef) {
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

    // Role check: Only super_admin and agency_manager can create revisions
    if (auth.role == "editor") {
        Json::Value err;
        err["error"] = "Permission Denied: Editors have read-only access to quotations.";
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

    std::string changeSummary = body.get("change_summary", "Updated scope or pricing").asString();
    std::string newScope = body.get("scope", "").asString();
    std::string rawAmount = body.get("amount", "").isString() ? body["amount"].asString() : std::to_string(body.get("amount", 0.0).asDouble());
    std::string newCurrency = body.get("currency", "").asString();
    std::string newTerms = body.get("terms", "").asString();
    std::string newValidUntil = body.get("valid_until", "").asString();

    std::lock_guard<std::mutex> lock(s_quoteMutex);
    ensureDefaultQuotationsSeeded();

    InternalQuotation *q = findQuotationByIdOrRef(idOrRef);
    if (!q) {
        Json::Value err;
        err["error"] = "Quotation not found: " + idOrRef;
        err["code"] = "NOT_FOUND";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k404NotFound);
        callback(resp);
        return;
    }

    // Cancelled quotations cannot be revised
    if (q->status == "cancelled") {
        Json::Value err;
        err["error"] = "Cannot create revision on cancelled quotation. Please issue a fresh quotation reference.";
        err["code"] = "QUOTATION_CANCELLED";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    // If scope or amount are provided, validate them
    std::string finalScope = newScope.empty() ? q->scope : newScope;
    std::string finalAmount = q->amount;
    if (!rawAmount.empty() && rawAmount != "0" && rawAmount != "0.000000") {
        std::string fmt;
        double val;
        if (!parseDecimalAmount(rawAmount, fmt, val)) {
            Json::Value err;
            err["error"] = "Invalid amount: must be a positive decimal number with up to 2 decimal places";
            err["code"] = "INVALID_DECIMAL_AMOUNT";
            if (!reqId.empty()) err["request_id"] = reqId;
            auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
            resp->setStatusCode(drogon::k400BadRequest);
            callback(resp);
            return;
        }
        finalAmount = fmt;
    }

    std::string finalCurrency = newCurrency.empty() ? q->currency : newCurrency;
    if (!isAllowedCurrency(finalCurrency)) {
        Json::Value err;
        err["error"] = "Unsupported currency";
        err["code"] = "INVALID_CURRENCY";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    std::string finalTerms = newTerms.empty() ? q->terms : newTerms;
    std::string finalValidUntil = newValidUntil.empty() ? q->validUntil : newValidUntil;

    // Bump revision number
    q->revisionNumber += 1;
    q->scope = finalScope;
    q->amount = finalAmount;
    q->currency = finalCurrency;
    q->terms = finalTerms;
    q->validUntil = finalValidUntil;
    q->status = "draft"; // Reverts to draft upon new revision
    q->updatedAt = getIsoTimestamp();

    InternalQuotationRevision rev;
    rev.id = "rev_" + Security::randomHex(12);
    rev.quotationId = q->id;
    rev.revisionNumber = q->revisionNumber;
    rev.scope = finalScope;
    rev.amount = finalAmount;
    rev.currency = finalCurrency;
    rev.terms = finalTerms;
    rev.validUntil = finalValidUntil;
    rev.changeSummary = changeSummary;
    rev.createdBy = auth.email;
    rev.createdAt = q->updatedAt;
    q->revisions.push_back(rev);

    Json::Value res;
    res["status"] = "ok";
    res["message"] = "Revision " + std::to_string(q->revisionNumber) + " created successfully";
    res["data"] = formatQuotationJson(*q, true);
    if (!reqId.empty()) res["request_id"] = reqId;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    resp->setStatusCode(drogon::k201Created);
    callback(resp);
}
