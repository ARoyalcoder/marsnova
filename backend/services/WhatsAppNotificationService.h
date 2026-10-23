#pragma once
#include <string>
#include <vector>
#include <memory>
#include <functional>
#include <chrono>
#include <drogon/drogon.h>

namespace marsnova {

enum class NotificationStatus {
    Pending,
    Sent,
    Delivered,
    Failed,
    FallbackClickToChat
};

enum class MockProviderMode {
    Disabled,  // Simulates unconfigured provider -> fallback_click_to_chat
    Success,   // Returns 200 with wamid... -> sent
    Outage,    // Returns 503 Provider Outage -> failed with safe error & bounded retries
    Timeout    // Simulates timeout -> failed with timeout error & bounded retries
};

struct NotificationRecord {
    std::string id;
    std::string leadId;
    std::string recipientPhone;
    std::string recipientName;
    std::string serviceRequested;
    std::string channel{"whatsapp"};
    std::string status{"pending"}; // pending, sent, delivered, failed, fallback_click_to_chat
    int attempts{0};
    int maxAttempts{3};
    std::string providerMessageId;
    std::string safeErrorDetails;
    std::string idempotencyKey;
    std::string clickToChatUrl;
    std::string createdAt;
    std::string updatedAt;
};

class WhatsAppNotificationService {
public:
    static std::string buildClickToChatUrl(const std::string &recipientPhone,
                                           const std::string &name,
                                           const std::string &service,
                                           const std::string &referenceCode);

    static NotificationRecord dispatchLeadNotification(
        const std::string &leadId,
        const std::string &name,
        const std::string &phone,
        const std::string &service,
        const std::string &referenceCode
    );

    // Diagnostics & testing helpers
    static void setMockMode(MockProviderMode mode);
    static MockProviderMode getMockMode();
    static void setProviderEnabled(bool enabled);
    static bool isProviderEnabled();
    static void resetStore();
    static std::vector<NotificationRecord> getNotificationsForLead(const std::string &leadId);
    static NotificationRecord getNotificationById(const std::string &id);
    static NotificationRecord getNotificationByIdempotencyKey(const std::string &key);
    static size_t getTotalDispatchesCount();
};

} // namespace marsnova
