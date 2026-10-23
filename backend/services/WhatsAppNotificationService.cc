#include "WhatsAppNotificationService.h"
#include "../utils/Security.h"
#include <mutex>
#include <unordered_map>
#include <iomanip>
#include <sstream>
#include <chrono>
#include <algorithm>

namespace marsnova {

namespace {

static std::mutex s_notifMutex;
static std::unordered_map<std::string, NotificationRecord> s_notificationsById;
static std::unordered_map<std::string, std::string> s_idempotencyToId;
static std::unordered_map<std::string, std::vector<std::string>> s_leadToNotifications;
static size_t s_totalDispatches = 0;

static MockProviderMode s_mockMode = MockProviderMode::Disabled;
static bool s_providerEnabled = false;

static const std::string MARSNOVA_WA_NUMBER = "917208591595";

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

static std::string urlEncode(const std::string &value) {
    std::ostringstream escaped;
    escaped.fill('0');
    escaped << std::hex;

    for (char c : value) {
        if (std::isalnum(static_cast<unsigned char>(c)) || c == '-' || c == '_' || c == '.' || c == '~') {
            escaped << c;
        } else if (c == ' ') {
            escaped << "%20";
        } else {
            escaped << '%' << std::setw(2) << static_cast<unsigned int>(static_cast<unsigned char>(c));
        }
    }
    return escaped.str();
}

static std::string sanitizeErrorMessage(const std::string &rawError) {
    // Strip sensitive tokens or Bearer keywords from error details
    std::string safe = rawError;
    size_t bearerPos = safe.find("Bearer");
    if (bearerPos != std::string::npos) {
        safe = safe.substr(0, bearerPos) + "[REDACTED_AUTH_TOKEN]";
    }
    size_t tokenPos = safe.find("token=");
    if (tokenPos != std::string::npos) {
        safe = safe.substr(0, tokenPos) + "token=[REDACTED]";
    }
    return safe;
}

} // namespace

std::string WhatsAppNotificationService::buildClickToChatUrl(const std::string &recipientPhone,
                                                            const std::string &name,
                                                            const std::string &service,
                                                            const std::string &referenceCode) {
    std::string text = "Hi MarsNova, I'm " + name;
    if (!recipientPhone.empty()) {
        text += " (Phone: " + recipientPhone + ")";
    }
    text += ". I submitted an inquiry for *" + service + "*";
    if (!referenceCode.empty()) {
        text += " (Ref: " + referenceCode + ")";
    }
    text += ". Please share next steps and project estimation.";

    return "https://wa.me/" + MARSNOVA_WA_NUMBER + "?text=" + urlEncode(text);
}

void WhatsAppNotificationService::setMockMode(MockProviderMode mode) {
    std::lock_guard<std::mutex> lock(s_notifMutex);
    s_mockMode = mode;
    if (mode == MockProviderMode::Success || mode == MockProviderMode::Outage || mode == MockProviderMode::Timeout) {
        s_providerEnabled = true;
    } else {
        s_providerEnabled = false;
    }
}

MockProviderMode WhatsAppNotificationService::getMockMode() {
    std::lock_guard<std::mutex> lock(s_notifMutex);
    return s_mockMode;
}

void WhatsAppNotificationService::setProviderEnabled(bool enabled) {
    std::lock_guard<std::mutex> lock(s_notifMutex);
    s_providerEnabled = enabled;
}

bool WhatsAppNotificationService::isProviderEnabled() {
    std::lock_guard<std::mutex> lock(s_notifMutex);
    return s_providerEnabled;
}

void WhatsAppNotificationService::resetStore() {
    std::lock_guard<std::mutex> lock(s_notifMutex);
    s_notificationsById.clear();
    s_idempotencyToId.clear();
    s_leadToNotifications.clear();
    s_totalDispatches = 0;
    s_mockMode = MockProviderMode::Disabled;
    s_providerEnabled = false;
}

NotificationRecord WhatsAppNotificationService::dispatchLeadNotification(
    const std::string &leadId,
    const std::string &name,
    const std::string &phone,
    const std::string &service,
    const std::string &referenceCode
) {
    std::lock_guard<std::mutex> lock(s_notifMutex);

    // 1. Duplicate Protection / Idempotency Check
    std::string idempotencyKey = leadId + ":whatsapp_lead_notification";
    auto itIdemp = s_idempotencyToId.find(idempotencyKey);
    if (itIdemp != s_idempotencyToId.end()) {
        auto itRecord = s_notificationsById.find(itIdemp->second);
        if (itRecord != s_notificationsById.end()) {
            // Return existing notification without re-dispatching
            return itRecord->second;
        }
    }

    s_totalDispatches++;

    // 2. Initialize Notification Record
    NotificationRecord rec;
    rec.id = "notif-" + Security::randomHex(8);
    rec.leadId = leadId;
    rec.recipientPhone = phone;
    rec.recipientName = name;
    rec.serviceRequested = service;
    rec.channel = "whatsapp";
    rec.idempotencyKey = idempotencyKey;
    rec.clickToChatUrl = buildClickToChatUrl(phone, name, service, referenceCode);
    rec.maxAttempts = 3;
    rec.createdAt = getIsoTimestamp();
    rec.updatedAt = rec.createdAt;

    // 3. Provider Dispatch Logic
    if (!s_providerEnabled || s_mockMode == MockProviderMode::Disabled) {
        // Automation provider is not configured: NEVER claim a message was sent when it was not!
        rec.status = "fallback_click_to_chat";
        rec.attempts = 0;
        rec.providerMessageId = "";
        rec.safeErrorDetails = "Automated WhatsApp provider unconfigured; verified click-to-chat fallback retained.";
    } else if (s_mockMode == MockProviderMode::Success) {
        // Successful automated delivery
        rec.status = "sent";
        rec.attempts = 1;
        rec.providerMessageId = "wamid.HBg" + Security::randomHex(16);
        rec.safeErrorDetails = "";
    } else if (s_mockMode == MockProviderMode::Outage) {
        // Provider Outage: bounded retries up to maxAttempts (3)
        for (int i = 1; i <= rec.maxAttempts; ++i) {
            rec.attempts = i;
        }
        rec.status = "failed";
        rec.providerMessageId = "";
        rec.safeErrorDetails = sanitizeErrorMessage(
            "WhatsApp Business Gateway Outage: HTTP 503 Service Unavailable (3 attempts exhausted; click-to-chat fallback retained)"
        );
    } else if (s_mockMode == MockProviderMode::Timeout) {
        // Provider Timeout: bounded retries up to maxAttempts (3)
        for (int i = 1; i <= rec.maxAttempts; ++i) {
            rec.attempts = i;
        }
        rec.status = "failed";
        rec.providerMessageId = "";
        rec.safeErrorDetails = sanitizeErrorMessage(
            "WhatsApp Gateway Timeout: Connection timed out after 3000ms (3 attempts exhausted; click-to-chat fallback retained)"
        );
    }

    rec.updatedAt = getIsoTimestamp();

    // 4. Save to in-memory store
    s_notificationsById[rec.id] = rec;
    s_idempotencyToId[idempotencyKey] = rec.id;
    s_leadToNotifications[leadId].push_back(rec.id);

    return rec;
}

std::vector<NotificationRecord> WhatsAppNotificationService::getNotificationsForLead(const std::string &leadId) {
    std::lock_guard<std::mutex> lock(s_notifMutex);
    std::vector<NotificationRecord> res;
    auto it = s_leadToNotifications.find(leadId);
    if (it != s_leadToNotifications.end()) {
        for (const auto &id : it->second) {
            auto rit = s_notificationsById.find(id);
            if (rit != s_notificationsById.end()) {
                res.push_back(rit->second);
            }
        }
    }
    return res;
}

NotificationRecord WhatsAppNotificationService::getNotificationById(const std::string &id) {
    std::lock_guard<std::mutex> lock(s_notifMutex);
    auto it = s_notificationsById.find(id);
    if (it != s_notificationsById.end()) {
        return it->second;
    }
    return NotificationRecord{};
}

NotificationRecord WhatsAppNotificationService::getNotificationByIdempotencyKey(const std::string &key) {
    std::lock_guard<std::mutex> lock(s_notifMutex);
    auto it = s_idempotencyToId.find(key);
    if (it != s_idempotencyToId.end()) {
        auto rit = s_notificationsById.find(it->second);
        if (rit != s_notificationsById.end()) {
            return rit->second;
        }
    }
    return NotificationRecord{};
}

size_t WhatsAppNotificationService::getTotalDispatchesCount() {
    std::lock_guard<std::mutex> lock(s_notifMutex);
    return s_totalDispatches;
}

} // namespace marsnova
