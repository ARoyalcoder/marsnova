#include "RecoveryController.h"
#include "AuthController.h"
#include <drogon/drogon.h>
#include <algorithm>
#include <regex>
#include <chrono>
#include <iomanip>
#include <sstream>

namespace {

struct InternalRecoveryCase {
    std::string id;
    std::string caseReference;
    std::string customerName;
    std::string customerPhone;
    std::string customerEmail;
    std::string deviceBrand;
    std::string deviceModel;
    std::string deviceSerial;
    double capacityGb{64.0};
    std::string fileSystem{"FAT32"};
    std::string damageType{"logical_format"};
    std::string symptoms;
    std::string criticalFilesDescription;
    bool consentDiagnostic{true};
    bool consentNandRisk{false};
    bool termsAccepted{true};
    std::string deliveryMethod{"counter_dropoff"};
    bool physicalReceiptConfirmed{false};
    std::string receivedAt;
    std::string receivedBy;
    std::string receivedConditionNotes;
    std::string currentCustodyLocation{"Customer Custody / Pending Shipment"};
    std::string diagnosisStatus{"pending"}; // pending, in_progress, completed, unrecoverable
    std::string diagnosticComplexity{"standard"}; // standard, level2_chip_off, level3_monolithic
    std::string internalDiagnosticNotes; // PROTECTED: Staff diagnostic notes, redacted from public API
    std::string publicDiagnosticSummary; // Safe sanitized public overview
    std::string quotationId;
    double quotationAmount{0.0};
    std::string quotationStatus{"none"}; // none, issued, approved, rejected
    std::string quotationApprovedAt;
    std::string quotationApprovedBy;
    std::string recoveryStatus{"intake_submitted"};
    int progressPercentage{10};
    int filesRecoveredCount{0};
    double dataSizeRecoveredMb{0.0};
    std::string returnDispatchedAt;
    std::string returnTrackingNumber;
    std::string returnCarrier;
    std::string returnRecipientName;
    std::string createdAt;
    std::string updatedAt;
};

struct InternalRecoveryEvent {
    std::string id;
    std::string caseReference;
    std::string eventType;
    std::string fromStatus;
    std::string toStatus;
    std::string actorType{"staff"};
    std::string actorName;
    std::string custodyLocation;
    std::string publicNotes;
    std::string internalDiagnosticNotes; // PROTECTED: Only visible to authenticated staff
    std::string createdAt;
};

std::mutex s_recoveryMutex;
std::unordered_map<std::string, InternalRecoveryCase> s_recoveryCases; // keyed by caseReference or id
std::vector<InternalRecoveryEvent> s_recoveryEvents;
bool s_recoverySeeded = false;
int s_caseSequence = 8291;

std::string getCurrentIsoTimestamp() {
    auto now = std::chrono::system_clock::now();
    auto in_time_t = std::chrono::system_clock::to_time_t(now);
    std::stringstream ss;
    ss << std::put_time(std::gmtime(&in_time_t), "%Y-%m-%dT%H:%M:%SZ");
    return ss.str();
}

void ensureDefaultRecoverySeeded() {
    if (s_recoverySeeded) return;

    InternalRecoveryCase demo;
    demo.id = "c8f2a1b0-1111-4444-9999-000000000001";
    demo.caseReference = "MN-REC-8291";
    demo.customerName = "Verified Customer";
    demo.customerPhone = "+91 98765 43210";
    demo.customerEmail = "customer@example.com";
    demo.deviceBrand = "SanDisk";
    demo.deviceModel = "Ultra 64GB USB 3.0";
    demo.deviceSerial = "SD-CZ48-99214";
    demo.capacityGb = 64.0;
    demo.fileSystem = "FAT32";
    demo.damageType = "logical_format";
    demo.symptoms = "Accidental Formatting & Corrupted File Allocation Table";
    demo.criticalFilesDescription = "Annual financial spreadsheets and photography portfolio";
    demo.consentDiagnostic = true;
    demo.consentNandRisk = true;
    demo.termsAccepted = true;
    demo.deliveryMethod = "counter_dropoff";
    demo.physicalReceiptConfirmed = true;
    demo.receivedAt = "2026-10-21T09:30:00Z";
    demo.receivedBy = "lab_technician";
    demo.receivedConditionNotes = "Anti-static pouch logged. Connector intact, no exterior physical crushing.";
    demo.currentCustodyLocation = "Cleanroom Bench 4 - Image Extraction Rig";
    demo.diagnosisStatus = "completed";
    demo.diagnosticComplexity = "standard";
    demo.internalDiagnosticNotes = "Controller healthy (Silicon Motion SM3281BB). Raw NAND sectors mirrored without bad block errors. Rebuilding FAT directory tree.";
    demo.publicDiagnosticSummary = "Physical hardware and NAND flash validated intact. Directory reconstruction in progress.";
    demo.quotationAmount = 4500.00;
    demo.quotationStatus = "approved";
    demo.quotationApprovedAt = "2026-10-21T14:30:00Z";
    demo.quotationApprovedBy = "Customer Signature In-Person";
    demo.recoveryStatus = "in_recovery";
    demo.progressPercentage = 75;
    demo.filesRecoveredCount = 1420;
    demo.dataSizeRecoveredMb = 18450.5;
    demo.createdAt = "2026-10-21T09:30:00Z";
    demo.updatedAt = "2026-10-23T04:15:00Z";

    s_recoveryCases[demo.caseReference] = demo;
    s_recoveryCases[demo.id] = demo;

    InternalRecoveryCase demo2 = demo;
    demo2.id = "c8f2a1b0-1111-4444-9999-000000000002";
    demo2.caseReference = "MNR-2026-8292";
    s_recoveryCases[demo2.caseReference] = demo2;
    s_recoveryCases[demo2.id] = demo2;

    InternalRecoveryEvent ev1;
    ev1.id = "ev-001";
    ev1.caseReference = demo.caseReference;
    ev1.eventType = "intake";
    ev1.fromStatus = "";
    ev1.toStatus = "intake_submitted";
    ev1.actorType = "customer";
    ev1.actorName = demo.customerName;
    ev1.custodyLocation = "Customer Custody / Pending Shipment";
    ev1.publicNotes = "Online intake registered and case reference generated.";
    ev1.createdAt = "2026-10-21T09:00:00Z";
    s_recoveryEvents.push_back(ev1);

    InternalRecoveryEvent ev2;
    ev2.id = "ev-002";
    ev2.caseReference = demo.caseReference;
    ev2.eventType = "physical_receipt";
    ev2.fromStatus = "intake_submitted";
    ev2.toStatus = "device_received";
    ev2.actorType = "staff";
    ev2.actorName = "lab_technician";
    ev2.custodyLocation = "Lab Intake Bay - Anti-Static Bin";
    ev2.publicNotes = "Physical device received in lab counter, barcode attached.";
    ev2.internalDiagnosticNotes = "Clean pin traces, USB 3.0 superspeed pair impedance normal.";
    ev2.createdAt = "2026-10-21T09:30:00Z";
    s_recoveryEvents.push_back(ev2);

    InternalRecoveryEvent ev3;
    ev3.id = "ev-003";
    ev3.caseReference = demo.caseReference;
    ev3.eventType = "quotation_approved";
    ev3.fromStatus = "quote_pending";
    ev3.toStatus = "quote_approved";
    ev3.actorType = "staff";
    ev3.actorName = "agency_manager";
    ev3.custodyLocation = "Lab Intake Bay - Anti-Static Bin";
    ev3.publicNotes = "Manual quotation approved by client. Recovery authorized to proceed.";
    ev3.internalDiagnosticNotes = "Standard logical rebuild quote of 4500.00 confirmed.";
    ev3.createdAt = "2026-10-21T14:30:00Z";
    s_recoveryEvents.push_back(ev3);

    s_recoverySeeded = true;
}

Json::Value caseToJson(const InternalRecoveryCase &c, bool includeProtectedInternal = false) {
    Json::Value val;
    val["id"] = c.id;
    val["case_id"] = c.caseReference;
    val["case_reference"] = c.caseReference;
    val["customer_name"] = c.customerName;
    val["device_brand"] = c.deviceBrand;
    val["device_model"] = c.deviceModel;
    val["device_type"] = c.deviceBrand + " " + c.deviceModel + " (" + std::to_string((int)c.capacityGb) + "GB)";
    val["capacity_gb"] = c.capacityGb;
    val["file_system"] = c.fileSystem;
    val["damage_type"] = c.damageType;
    val["symptoms"] = c.symptoms;
    val["critical_files_description"] = c.criticalFilesDescription;
    val["current_stage"] = c.recoveryStatus;
    val["recovery_status"] = c.recoveryStatus;
    val["stage_title"] = c.recoveryStatus;
    val["progress_percentage"] = c.progressPercentage;
    val["files_recovered_count"] = c.filesRecoveredCount;
    val["data_size_recovered_mb"] = c.dataSizeRecoveredMb;
    val["current_custody_location"] = c.currentCustodyLocation;
    val["physical_receipt_confirmed"] = c.physicalReceiptConfirmed;
    val["diagnosis_status"] = c.diagnosisStatus;
    val["diagnostic_complexity"] = c.diagnosticComplexity;
    val["public_diagnostic_summary"] = c.publicDiagnosticSummary;
    val["quotation_amount"] = c.quotationAmount;
    val["quotation_status"] = c.quotationStatus;
    val["delivery_method"] = c.deliveryMethod;
    val["created_at"] = c.createdAt;
    val["updated_at"] = c.updatedAt;

    // Protected internal diagnostic notes are only exposed to authenticated staff!
    if (includeProtectedInternal) {
        val["customer_phone"] = c.customerPhone;
        val["customer_email"] = c.customerEmail;
        val["device_serial"] = c.deviceSerial;
        val["internal_diagnostic_notes"] = c.internalDiagnosticNotes;
        val["received_at"] = c.receivedAt;
        val["received_by"] = c.receivedBy;
        val["received_condition_notes"] = c.receivedConditionNotes;
        val["quotation_approved_at"] = c.quotationApprovedAt;
        val["quotation_approved_by"] = c.quotationApprovedBy;
        val["return_dispatched_at"] = c.returnDispatchedAt;
        val["return_tracking_number"] = c.returnTrackingNumber;
        val["return_carrier"] = c.returnCarrier;
        val["return_recipient_name"] = c.returnRecipientName;
    } else {
        // Redacted for public customer tracking
        val["diagnostic_notes"] = c.publicDiagnosticSummary.empty() ? "Inspection completed." : c.publicDiagnosticSummary;
    }

    return val;
}

Json::Value eventToJson(const InternalRecoveryEvent &ev, bool includeProtectedInternal = false) {
    Json::Value val;
    val["id"] = ev.id;
    val["case_reference"] = ev.caseReference;
    val["event_type"] = ev.eventType;
    val["stage"] = ev.toStatus;
    val["status_title"] = ev.eventType;
    val["status_description"] = ev.publicNotes;
    val["actor_type"] = ev.actorType;
    val["actor_name"] = ev.actorName;
    val["custody_location"] = ev.custodyLocation;
    val["recorded_at"] = ev.createdAt;
    val["created_at"] = ev.createdAt;

    if (includeProtectedInternal) {
        val["internal_diagnostic_notes"] = ev.internalDiagnosticNotes;
    }

    return val;
}

} // namespace

void RecoveryController::resetSeedStore() {
    std::lock_guard<std::mutex> lock(s_recoveryMutex);
    s_recoveryCases.clear();
    s_recoveryEvents.clear();
    s_recoverySeeded = false;
    ensureDefaultRecoverySeeded();
}

// =============================================================================
// PUBLIC INTAKE & TRACKING
// =============================================================================

void RecoveryController::createCase(const drogon::HttpRequestPtr &req,
                                    std::function<void(const drogon::HttpResponsePtr &)> &&callback) {
    if (req->method() == drogon::Options) {
        callback(drogon::HttpResponse::newHttpResponse());
        return;
    }

    std::string reqId = req->attributes()->get("request_id");
    if (reqId.empty()) reqId = req->getHeader("X-Request-Id");

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
    std::string name = json.get("customer_name", "").asString();
    std::string phone = json.get("customer_phone", "").asString();
    std::string email = json.get("customer_email", "").asString();
    std::string brand = json.get("device_brand", "").asString();
    std::string model = json.get("device_model", "").asString();
    double capacityGb = json.get("capacity_gb", 0.0).asDouble();
    std::string fileSystem = json.get("file_system", "unknown").asString();
    std::string damageType = json.get("damage_type", "logical_format").asString();
    std::string symptoms = json.get("symptoms", "").asString();
    std::string criticalFiles = json.get("critical_files_description", "").asString();
    std::string deliveryMethod = json.get("delivery_method", "counter_dropoff").asString();

    bool consentDiagnostic = json.get("consent_diagnostic", false).asBool();
    bool consentNandRisk = json.get("consent_nand_risk", false).asBool();
    bool termsAccepted = json.get("terms_accepted", false).asBool();

    // 1. Mandatory Form Validations
    if (name.length() < 2) {
        Json::Value err;
        err["error"] = "Customer full name is required (minimum 2 characters)";
        err["code"] = "VALIDATION_FAILED";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    if (phone.length() < 7) {
        Json::Value err;
        err["error"] = "Valid customer phone number is required";
        err["code"] = "VALIDATION_FAILED";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    if (brand.empty() || capacityGb <= 0.0) {
        Json::Value err;
        err["error"] = "Valid device brand and capacity in GB (> 0) are required";
        err["code"] = "VALIDATION_FAILED";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    // 2. Mandatory Consent Validations
    if (!consentDiagnostic || !termsAccepted) {
        Json::Value err;
        err["error"] = "Physical laboratory diagnostic authorization and terms acceptance are mandatory";
        err["code"] = "CONSENT_REQUIRED";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    std::string now = getCurrentIsoTimestamp();
    std::string generatedRef;
    std::string generatedId;

    {
        std::lock_guard<std::mutex> lock(s_recoveryMutex);
        ensureDefaultRecoverySeeded();
        int seq = ++s_caseSequence;
        generatedRef = "MNR-2026-" + std::to_string(seq);
        generatedId = "rec-" + std::to_string(seq);

        InternalRecoveryCase c;
        c.id = generatedId;
        c.caseReference = generatedRef;
        c.customerName = name;
        c.customerPhone = phone;
        c.customerEmail = email;
        c.deviceBrand = brand;
        c.deviceModel = model.empty() ? "Standard USB Flash Drive" : model;
        c.capacityGb = capacityGb;
        c.fileSystem = fileSystem;
        c.damageType = damageType;
        c.symptoms = symptoms;
        c.criticalFilesDescription = criticalFiles;
        c.consentDiagnostic = consentDiagnostic;
        c.consentNandRisk = consentNandRisk;
        c.termsAccepted = termsAccepted;
        c.deliveryMethod = deliveryMethod;
        c.physicalReceiptConfirmed = false;
        c.currentCustodyLocation = (deliveryMethod == "counter_dropoff")
            ? "Customer Custody / Pending In-Person Drop-off"
            : "Customer Custody / Pending Courier Dispatch";
        c.diagnosisStatus = "pending";
        c.diagnosticComplexity = "standard";
        c.publicDiagnosticSummary = "Case submitted. Awaiting physical device arrival at lab.";
        c.quotationStatus = "none";
        c.recoveryStatus = "intake_submitted";
        c.progressPercentage = 5;
        c.filesRecoveredCount = 0;
        c.dataSizeRecoveredMb = 0.0;
        c.createdAt = now;
        c.updatedAt = now;

        s_recoveryCases[generatedRef] = c;
        s_recoveryCases[generatedId] = c;

        // Log initial intake event
        InternalRecoveryEvent ev;
        ev.id = "ev-intake-" + std::to_string(seq);
        ev.caseReference = generatedRef;
        ev.eventType = "intake";
        ev.fromStatus = "";
        ev.toStatus = "intake_submitted";
        ev.actorType = "customer";
        ev.actorName = name;
        ev.custodyLocation = c.currentCustodyLocation;
        ev.publicNotes = "Online intake registered. Case reference generated.";
        ev.createdAt = now;
        s_recoveryEvents.push_back(ev);
    }

    // Safe notification dispatch simulation (e.g. WhatsApp / Email)
    // Never fail or rollback a successfully saved intake if external notification provider fails!
    bool notificationDispatched = true;

    Json::Value res;
    res["success"] = true;
    res["status"] = "ok";
    res["case_id"] = generatedRef;
    res["case_reference"] = generatedRef;
    res["recovery_status"] = "intake_submitted";
    res["notification_status"] = notificationDispatched ? "queued" : "failed_safe";
    res["message"] = "Recovery case registered successfully for physical lab intake.";
    res["tracking_url"] = "/services/pen-drive-data-recovery?ref=" + generatedRef;
    if (!reqId.empty()) res["request_id"] = reqId;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
    resp->setStatusCode(drogon::k201Created);
    callback(resp);
}

void RecoveryController::trackCase(const drogon::HttpRequestPtr &req,
                                   std::function<void(const drogon::HttpResponsePtr &)> &&callback,
                                   const std::string &caseId) {
    if (req->method() == drogon::Options) {
        callback(drogon::HttpResponse::newHttpResponse());
        return;
    }

    std::string reqId = req->attributes()->get("request_id");
    if (reqId.empty()) reqId = req->getHeader("X-Request-Id");

    if (caseId.empty() || caseId.length() < 3) {
        Json::Value err;
        err["error"] = "Invalid Case ID format. Example: MN-REC-8291 or MNR-2026-8292";
        err["code"] = "INVALID_CASE_ID";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    std::lock_guard<std::mutex> lock(s_recoveryMutex);
    ensureDefaultRecoverySeeded();

    auto it = s_recoveryCases.find(caseId);
    if (it == s_recoveryCases.end()) {
        Json::Value err;
        err["error"] = "No recovery case found for reference: " + caseId;
        err["code"] = "CASE_NOT_FOUND";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k404NotFound);
        callback(resp);
        return;
    }

    const auto &c = it->second;
    // Public track: strictly FALSE for includeProtectedInternal
    Json::Value data = caseToJson(c, false);
    data["status"] = "ok";
    if (!reqId.empty()) data["request_id"] = reqId;

    // Attach public timeline events
    Json::Value timeline(Json::arrayValue);
    for (const auto &ev : s_recoveryEvents) {
        if (ev.caseReference == c.caseReference) {
            timeline.append(eventToJson(ev, false));
        }
    }
    data["timeline"] = timeline;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(data);
    callback(resp);
}
