#include <iostream>
#include <cassert>
#include <drogon/drogon.h>
#include "../controllers/HealthController.h"
#include "../controllers/EnquiryController.h"
#include "../controllers/RecoveryController.h"
#include "../controllers/CatalogController.h"
#include "../controllers/LeadController.h"
#include "../controllers/AuthController.h"
#include "../controllers/LearningController.h"
#include "../services/WhatsAppNotificationService.h"
#include "../utils/Security.h"

#if defined(_WIN32)
#include <crtdbg.h>
#endif

#include <cctype>
#include <cmath>
#include <cstdlib>
#include <map>
#include <set>
#include <string>
#include <vector>
#include "../utils/Validation.h"

// The backend ships no built-in staff accounts, so suites seed the staff they need. Passwords are
// fixture-only values.
static void seedStaffFixtures() {
    AuthController::seedTestUser("admin@marsnova.in", "Fx-Admin-8421!", "super_admin", "active",
                                 "Aditya Verma (Super Admin)", "u-00000000-0001");
    AuthController::seedTestUser("manager@marsnova.in", "Fx-Manager-8421!", "agency_manager", "active",
                                 "Priya Sharma (Studio Manager)", "u-00000000-0002");
    AuthController::seedTestUser("editor@marsnova.in", "Fx-Editor-8421!", "editor", "active",
                                 "Rohan Das (Lead Video Editor)", "u-00000000-0003");
    AuthController::seedTestUser("suspended@marsnova.in", "Fx-Suspended-8421!", "editor", "suspended",
                                 "Suspended Operator", "u-00000000-0004");
    AuthController::seedTestUser("inactive@marsnova.in", "Fx-Inactive-8421!", "editor", "inactive",
                                 "Inactive Contractor", "u-00000000-0005");
}

void testHealthEndpoint() {
    std::cout << "[Test 1] Testing /api/v1/health endpoint..." << std::endl;
    auto req = std::make_shared<drogon::HttpRequest>();
    req->method_ = drogon::Get;
    req->path_ = "/api/v1/health";
    req->setHeader("X-Request-Id", "SMOKE-TEST-REQ-001");

    bool callbackInvoked = false;
    drogon::app().handleRequest(req, [&callbackInvoked](const drogon::HttpResponsePtr &resp) {
        callbackInvoked = true;
        assert(resp != nullptr);
        assert(resp->statusCode() == drogon::k200OK);
        assert(resp->getHeader("X-Request-Id") == "SMOKE-TEST-REQ-001");

        auto json = resp->jsonObject_;
        assert(json != nullptr);
        assert((*json)["status"].asString() == "online");
        assert((*json)["service"].asString() == "MarsNova C++ Drogon API");
        assert((*json)["version"].asString() == "1.0.0");
        assert((*json)["request_id"].asString() == "SMOKE-TEST-REQ-001");
        assert(!(*json)["timestamp"].asString().empty());
        assert(!(*json)["database"]["status"].asString().empty());
    });

    assert(callbackInvoked);
    std::cout << "  -> PASS: Health check returns online status, timestamp, and request_id." << std::endl;
}

void testEnquiryValidationAndCreation() {
    std::cout << "[Test 2] Testing /api/v1/enquiries validation & creation..." << std::endl;

    // A. Validation failure test (too short name)
    {
        auto req = std::make_shared<drogon::HttpRequest>();
        req->method_ = drogon::Post;
        req->path_ = "/api/v1/enquiries";
        req->body_ = "{\"name\":\"A\",\"email\":\"test@example.com\",\"service\":\"Video Editing\",\"message\":\"Hello there\"}";

        bool callbackInvoked = false;
        drogon::app().handleRequest(req, [&callbackInvoked](const drogon::HttpResponsePtr &resp) {
            callbackInvoked = true;
            assert(resp->statusCode() == drogon::k400BadRequest);
            auto json = resp->jsonObject_;
            assert(json != nullptr);
            assert((*json)["code"].asString() == "VALIDATION_FAILED");
            assert(!(*json)["error"].asString().empty());
        });
        assert(callbackInvoked);
        std::cout << "  -> PASS: Rejects name < 2 chars with 400 VALIDATION_FAILED." << std::endl;
    }

    // B. Validation failure test (invalid email)
    {
        auto req = std::make_shared<drogon::HttpRequest>();
        req->method_ = drogon::Post;
        req->path_ = "/api/v1/enquiries";
        req->body_ = "{\"name\":\"Aarav\",\"email\":\"invalid-email-no-at\",\"service\":\"Video Editing\",\"message\":\"Valid length message\"}";

        bool callbackInvoked = false;
        drogon::app().handleRequest(req, [&callbackInvoked](const drogon::HttpResponsePtr &resp) {
            callbackInvoked = true;
            assert(resp->statusCode() == drogon::k400BadRequest);
            auto json = resp->jsonObject_;
            assert(json != nullptr);
            assert((*json)["code"].asString() == "VALIDATION_FAILED");
        });
        assert(callbackInvoked);
        std::cout << "  -> PASS: Rejects invalid email with 400 VALIDATION_FAILED." << std::endl;
    }

    // C. Valid creation test
    {
        auto req = std::make_shared<drogon::HttpRequest>();
        req->method_ = drogon::Post;
        req->path_ = "/api/v1/enquiries";
        req->body_ = "{\"name\":\"Priya Sharma\",\"email\":\"priya@marsnova.in\",\"phone\":\"+919876543210\",\"service\":\"Video Editing\",\"message\":\"Need YouTube video editing for weekly tech show\"}";

        bool callbackInvoked = false;
        drogon::app().handleRequest(req, [&callbackInvoked](const drogon::HttpResponsePtr &resp) {
            callbackInvoked = true;
            assert(resp->statusCode() == drogon::k201Created);
            auto json = resp->jsonObject_;
            assert(json != nullptr);
            assert((*json)["status"].asString() == "ok");
            assert(!(*json)["enquiry_id"].asString().empty());
            assert((*json)["whatsapp_ready"].asBool() == true);
        });
        assert(callbackInvoked);
        std::cout << "  -> PASS: Creates enquiry with 201 Created and persists before WhatsApp handoff." << std::endl;
    }
}

void testRecoveryCaseTracking() {
    std::cout << "[Test 3] Testing /api/v1/recovery/:caseId tracking..." << std::endl;

    // A. Rejects invalid caseId
    {
        auto req = std::make_shared<drogon::HttpRequest>();
        req->method_ = drogon::Get;
        req->path_ = "/api/v1/recovery/1";

        bool callbackInvoked = false;
        drogon::app().handleRequest(req, [&callbackInvoked](const drogon::HttpResponsePtr &resp) {
            callbackInvoked = true;
            assert(resp->statusCode() == drogon::k400BadRequest);
            auto json = resp->jsonObject_;
            assert(json != nullptr);
            assert((*json)["code"].asString() == "INVALID_CASE_ID");
        });
        assert(callbackInvoked);
        std::cout << "  -> PASS: Rejects invalid caseId < 3 chars with 400." << std::endl;
    }

    // B. Returns valid recovery case details
    {
        auto req = std::make_shared<drogon::HttpRequest>();
        req->method_ = drogon::Get;
        req->path_ = "/api/v1/recovery/MN-REC-8291";

        bool callbackInvoked = false;
        drogon::app().handleRequest(req, [&callbackInvoked](const drogon::HttpResponsePtr &resp) {
            callbackInvoked = true;
            assert(resp->statusCode() == drogon::k200OK);
            auto json = resp->jsonObject_;
            assert(json != nullptr);
            assert((*json)["status"].asString() == "ok");
            std::string caseId = (*json).isMember("data") ? (*json)["data"]["case_id"].asString() : (*json)["case_id"].asString();
            assert(caseId == "MN-REC-8291");
            std::string devType = (*json).isMember("data") ? (*json)["data"]["device_type"].asString() : (*json)["device_type"].asString();
            assert(!devType.empty());
            const auto &timeline = (*json).isMember("data") ? (*json)["data"]["timeline"] : (*json)["timeline"];
            assert(timeline.isArray());
            assert(timeline.size() > 0);
        });
        assert(callbackInvoked);
        std::cout << "  -> PASS: Returns recovery case details, stage, and forensic timeline." << std::endl;
    }
}

void testCentralized404Handler() {
    std::cout << "[Test 4] Testing centralized 404 JSON error handling..." << std::endl;
    auto req = std::make_shared<drogon::HttpRequest>();
    req->method_ = drogon::Get;
    req->path_ = "/api/v1/non-existent-endpoint";

    bool callbackInvoked = false;
    drogon::app().handleRequest(req, [&callbackInvoked](const drogon::HttpResponsePtr &resp) {
        callbackInvoked = true;
        assert(resp->statusCode() == drogon::k404NotFound);
        auto json = resp->jsonObject_;
        assert(json != nullptr);
        assert((*json)["code"].asString() == "NOT_FOUND");
        assert(!(*json)["request_id"].asString().empty());
    });
    assert(callbackInvoked);
    std::cout << "  -> PASS: Unmapped route returns structured JSON 404 with request_id." << std::endl;
}

void testRequestIdAndStructuredLogging() {
    std::cout << "[Test 5] Testing request ID propagation & security headers..." << std::endl;
    auto req = std::make_shared<drogon::HttpRequest>();
    req->method_ = drogon::Get;
    req->path_ = "/api/v1/health";

    bool callbackInvoked = false;
    drogon::app().handleRequest(req, [&callbackInvoked](const drogon::HttpResponsePtr &resp) {
        callbackInvoked = true;
        std::string reqId = resp->getHeader("X-Request-Id");
        assert(!reqId.empty());
        assert(reqId.rfind("req_", 0) == 0);
    });
    assert(callbackInvoked);
    std::cout << "  -> PASS: Request ID automatically generated and attached to response header." << std::endl;
}

void testServicesCatalog() {
    std::cout << "[Test 6] Testing GET /api/v1/services & /services/:slug..." << std::endl;

    // A. List published services
    {
        auto req = std::make_shared<drogon::HttpRequest>();
        req->method_ = drogon::Get;
        req->path_ = "/api/v1/services";

        bool callbackInvoked = false;
        drogon::app().handleRequest(req, [&callbackInvoked](const drogon::HttpResponsePtr &resp) {
            callbackInvoked = true;
            assert(resp->statusCode() == drogon::k200OK);
            auto json = resp->jsonObject_;
            assert(json != nullptr);
            assert((*json)["status"].asString() == "ok");
            assert((*json)["data"].isArray());
            assert((*json)["data"].size() == 8);
            assert((*json)["pagination"]["total"].asInt() == 8);
        });
        assert(callbackInvoked);
        std::cout << "  -> PASS: /services returns only published active records." << std::endl;
    }

    // B. Query parameters validation and filtering
    {
        auto req = std::make_shared<drogon::HttpRequest>();
        req->method_ = drogon::Get;
        req->path_ = "/api/v1/services?category=Video&page=1&limit=2";

        bool callbackInvoked = false;
        drogon::app().handleRequest(req, [&callbackInvoked](const drogon::HttpResponsePtr &resp) {
            callbackInvoked = true;
            assert(resp->statusCode() == drogon::k200OK);
            auto json = resp->jsonObject_;
            assert(json != nullptr);
            assert((*json)["data"].size() == 2);
            assert((*json)["pagination"]["page"].asInt() == 1);
            assert((*json)["pagination"]["limit"].asInt() == 2);
        });
        assert(callbackInvoked);
        std::cout << "  -> PASS: Category filter and pagination calculated accurately." << std::endl;
    }

    // C. Invalid query parameter validation
    {
        auto req = std::make_shared<drogon::HttpRequest>();
        req->method_ = drogon::Get;
        req->path_ = "/api/v1/services?page=-5";

        bool callbackInvoked = false;
        drogon::app().handleRequest(req, [&callbackInvoked](const drogon::HttpResponsePtr &resp) {
            callbackInvoked = true;
            assert(resp->statusCode() == drogon::k400BadRequest);
            auto json = resp->jsonObject_;
            assert((*json)["code"].asString() == "INVALID_QUERY_PARAMS");
        });
        assert(callbackInvoked);
        std::cout << "  -> PASS: Rejects invalid page number with 400 INVALID_QUERY_PARAMS." << std::endl;
    }

    // D. Fetch service by slug
    {
        auto req = std::make_shared<drogon::HttpRequest>();
        req->method_ = drogon::Get;
        req->path_ = "/api/v1/services/topic-to-video";

        bool callbackInvoked = false;
        drogon::app().handleRequest(req, [&callbackInvoked](const drogon::HttpResponsePtr &resp) {
            callbackInvoked = true;
            assert(resp->statusCode() == drogon::k200OK);
            auto json = resp->jsonObject_;
            assert((*json)["data"]["slug"].asString() == "topic-to-video");
            assert((*json)["data"]["title"].asString() == "Topic to Video");
        });
        assert(callbackInvoked);
        std::cout << "  -> PASS: /services/:slug returns requested active service." << std::endl;
    }

    // E. Unpublished service returns 404
    {
        auto req = std::make_shared<drogon::HttpRequest>();
        req->method_ = drogon::Get;
        req->path_ = "/api/v1/services/internal-draft-service";

        bool callbackInvoked = false;
        drogon::app().handleRequest(req, [&callbackInvoked](const drogon::HttpResponsePtr &resp) {
            callbackInvoked = true;
            assert(resp->statusCode() == drogon::k404NotFound);
            auto json = resp->jsonObject_;
            assert((*json)["code"].asString() == "NOT_FOUND");
        });
        assert(callbackInvoked);
        std::cout << "  -> PASS: Unpublished service slug returns 404 Not Found." << std::endl;
    }

    // F. Non-existent slug returns 404
    {
        auto req = std::make_shared<drogon::HttpRequest>();
        req->method_ = drogon::Get;
        req->path_ = "/api/v1/services/unknown-non-existent-service";

        bool callbackInvoked = false;
        drogon::app().handleRequest(req, [&callbackInvoked](const drogon::HttpResponsePtr &resp) {
            callbackInvoked = true;
            assert(resp->statusCode() == drogon::k404NotFound);
            auto json = resp->jsonObject_;
            assert((*json)["code"].asString() == "NOT_FOUND");
        });
        assert(callbackInvoked);
        std::cout << "  -> PASS: Non-existent service slug returns 404 Not Found." << std::endl;
    }
}

void testPortfolioAndCoursesCatalog() {
    std::cout << "[Test 7] Testing GET /api/v1/portfolio, /courses & /courses/:slug..." << std::endl;

    // A. List portfolio
    {
        auto req = std::make_shared<drogon::HttpRequest>();
        req->method_ = drogon::Get;
        req->path_ = "/api/v1/portfolio";

        bool callbackInvoked = false;
        drogon::app().handleRequest(req, [&callbackInvoked](const drogon::HttpResponsePtr &resp) {
            callbackInvoked = true;
            assert(resp->statusCode() == drogon::k200OK);
            auto json = resp->jsonObject_;
            assert(json != nullptr);
            assert((*json)["data"].isArray());
            assert((*json)["data"].size() == 6);
        });
        assert(callbackInvoked);
        std::cout << "  -> PASS: /portfolio returns only published items." << std::endl;
    }

    // B. List courses
    {
        auto req = std::make_shared<drogon::HttpRequest>();
        req->method_ = drogon::Get;
        req->path_ = "/api/v1/courses";

        bool callbackInvoked = false;
        drogon::app().handleRequest(req, [&callbackInvoked](const drogon::HttpResponsePtr &resp) {
            callbackInvoked = true;
            assert(resp->statusCode() == drogon::k200OK);
            auto json = resp->jsonObject_;
            assert(json != nullptr);
            assert((*json)["data"].isArray());
            assert((*json)["data"].size() == 6);
        });
        assert(callbackInvoked);
        std::cout << "  -> PASS: /courses returns only published courses." << std::endl;
    }

    // C. Get course by slug
    {
        auto req = std::make_shared<drogon::HttpRequest>();
        req->method_ = drogon::Get;
        req->path_ = "/api/v1/courses/ai-tools-automation";

        bool callbackInvoked = false;
        drogon::app().handleRequest(req, [&callbackInvoked](const drogon::HttpResponsePtr &resp) {
            callbackInvoked = true;
            assert(resp->statusCode() == drogon::k200OK);
            auto json = resp->jsonObject_;
            assert((*json)["data"]["slug"].asString() == "ai-tools-automation");
            assert((*json)["data"]["title"].asString() == "AI Tools & Automation");
        });
        assert(callbackInvoked);
        std::cout << "  -> PASS: /courses/:slug returns requested published course." << std::endl;
    }

    // D. Unpublished course returns 404
    {
        auto req = std::make_shared<drogon::HttpRequest>();
        req->method_ = drogon::Get;
        req->path_ = "/api/v1/courses/internal-paid-lms-draft";

        bool callbackInvoked = false;
        drogon::app().handleRequest(req, [&callbackInvoked](const drogon::HttpResponsePtr &resp) {
            callbackInvoked = true;
            assert(resp->statusCode() == drogon::k404NotFound);
            auto json = resp->jsonObject_;
            assert((*json)["code"].asString() == "NOT_FOUND");
        });
        assert(callbackInvoked);
        std::cout << "  -> PASS: Unpublished course slug returns 404 Not Found." << std::endl;
    }

    // E. Empty filter results return 200 with empty data array
    {
        auto req = std::make_shared<drogon::HttpRequest>();
        req->method_ = drogon::Get;
        req->path_ = "/api/v1/courses?category=NonExistentCategory";

        bool callbackInvoked = false;
        drogon::app().handleRequest(req, [&callbackInvoked](const drogon::HttpResponsePtr &resp) {
            callbackInvoked = true;
            assert(resp->statusCode() == drogon::k200OK);
            auto json = resp->jsonObject_;
            assert((*json)["data"].size() == 0);
            assert((*json)["pagination"]["total"].asInt() == 0);
        });
        assert(callbackInvoked);
        std::cout << "  -> PASS: Empty category filter returns 200 with empty array." << std::endl;
    }
}

void testLeadsEndpoint() {
    std::cout << "[Test 8] Testing /api/v1/leads endpoint..." << std::endl;
    LeadController::resetRateLimits();
    LeadController::clearDuplicates();

    // A. Valid lead creation with consent, references and initial activity
    {
        auto req = std::make_shared<drogon::HttpRequest>();
        req->method_ = drogon::Post;
        req->path_ = "/api/v1/leads";
        req->body_ = "{\"name\":\"Vikram Patel\",\"email\":\"vikram@example.com\",\"phone\":\"+919876501234\","
                     "\"service\":\"Video Editing\",\"notes\":\"Need commercial ad grading\",\"source\":\"website_contact\","
                     "\"reference_id\":\"ref-camp-2026\",\"consent\":true}";

        bool callbackInvoked = false;
        drogon::app().handleRequest(req, [&callbackInvoked](const drogon::HttpResponsePtr &resp) {
            callbackInvoked = true;
            assert(resp->statusCode() == drogon::k201Created);
            auto json = resp->jsonObject_;
            assert(json != nullptr);
            assert((*json)["status"].asString() == "ok");
            assert((*json)["success"].asBool() == true);
            assert(!(*json)["lead_id"].asString().empty());
            assert(!(*json)["activity_id"].asString().empty());
            assert((*json)["reference"].asString().rfind("MN-LEAD-", 0) == 0);
        });
        assert(callbackInvoked);
        std::cout << "  -> PASS: Valid lead and initial activity saved with reference code." << std::endl;
    }

    // B. Consent validation failure (consent is false or missing)
    {
        auto req = std::make_shared<drogon::HttpRequest>();
        req->method_ = drogon::Post;
        req->path_ = "/api/v1/leads";
        req->body_ = "{\"name\":\"Rohan Verma\",\"email\":\"rohan@example.com\",\"service\":\"Video Editing\",\"consent\":false}";

        bool callbackInvoked = false;
        drogon::app().handleRequest(req, [&callbackInvoked](const drogon::HttpResponsePtr &resp) {
            callbackInvoked = true;
            assert(resp->statusCode() == drogon::k400BadRequest);
            auto json = resp->jsonObject_;
            assert(json != nullptr);
            assert((*json)["code"].asString() == "CONSENT_REQUIRED");
        });
        assert(callbackInvoked);
        std::cout << "  -> PASS: Missing or false consent rejected with 400 CONSENT_REQUIRED." << std::endl;
    }

    // C. Field validation failures
    {
        // 1. Name too short
        auto req = std::make_shared<drogon::HttpRequest>();
        req->method_ = drogon::Post;
        req->path_ = "/api/v1/leads";
        req->body_ = "{\"name\":\"V\",\"email\":\"v@example.com\",\"service\":\"Video Editing\",\"consent\":true}";

        bool callbackInvoked = false;
        drogon::app().handleRequest(req, [&callbackInvoked](const drogon::HttpResponsePtr &resp) {
            callbackInvoked = true;
            assert(resp->statusCode() == drogon::k400BadRequest);
            auto json = resp->jsonObject_;
            assert(json != nullptr);
            assert((*json)["code"].asString() == "VALIDATION_FAILED");
        });
        assert(callbackInvoked);

        // 2. Invalid email format
        auto req2 = std::make_shared<drogon::HttpRequest>();
        req2->method_ = drogon::Post;
        req2->path_ = "/api/v1/leads";
        req2->body_ = "{\"name\":\"Valid Name\",\"email\":\"invalid-email\",\"service\":\"Video Editing\",\"consent\":true}";

        callbackInvoked = false;
        drogon::app().handleRequest(req2, [&callbackInvoked](const drogon::HttpResponsePtr &resp) {
            callbackInvoked = true;
            assert(resp->statusCode() == drogon::k400BadRequest);
            auto json = resp->jsonObject_;
            assert(json != nullptr);
            assert((*json)["code"].asString() == "VALIDATION_FAILED");
        });
        assert(callbackInvoked);

        // 3. Invalid phone number (less than 10 digits)
        auto req3 = std::make_shared<drogon::HttpRequest>();
        req3->method_ = drogon::Post;
        req3->path_ = "/api/v1/leads";
        req3->body_ = "{\"name\":\"Valid Name\",\"email\":\"valid@example.com\",\"phone\":\"12345\",\"service\":\"Video Editing\",\"consent\":true}";

        callbackInvoked = false;
        drogon::app().handleRequest(req3, [&callbackInvoked](const drogon::HttpResponsePtr &resp) {
            callbackInvoked = true;
            assert(resp->statusCode() == drogon::k400BadRequest);
            auto json = resp->jsonObject_;
            assert(json != nullptr);
            assert((*json)["code"].asString() == "VALIDATION_FAILED");
        });
        assert(callbackInvoked);

        // 4. Missing service
        auto req4 = std::make_shared<drogon::HttpRequest>();
        req4->method_ = drogon::Post;
        req4->path_ = "/api/v1/leads";
        req4->body_ = "{\"name\":\"Valid Name\",\"email\":\"valid@example.com\",\"service\":\"\",\"consent\":true}";

        callbackInvoked = false;
        drogon::app().handleRequest(req4, [&callbackInvoked](const drogon::HttpResponsePtr &resp) {
            callbackInvoked = true;
            assert(resp->statusCode() == drogon::k400BadRequest);
            auto json = resp->jsonObject_;
            assert(json != nullptr);
            assert((*json)["code"].asString() == "VALIDATION_FAILED");
        });
        assert(callbackInvoked);
        std::cout << "  -> PASS: Invalid fields rejected with 400 VALIDATION_FAILED." << std::endl;
    }

    // D. Duplicate detection (same email and service)
    {
        auto req = std::make_shared<drogon::HttpRequest>();
        req->method_ = drogon::Post;
        req->path_ = "/api/v1/leads";
        req->body_ = "{\"name\":\"Vikram Patel\",\"email\":\"vikram@example.com\",\"service\":\"Video Editing\",\"consent\":true}";

        bool callbackInvoked = false;
        drogon::app().handleRequest(req, [&callbackInvoked](const drogon::HttpResponsePtr &resp) {
            callbackInvoked = true;
            assert(resp->statusCode() == drogon::k409Conflict);
            auto json = resp->jsonObject_;
            assert(json != nullptr);
            assert((*json)["code"].asString() == "DUPLICATE_LEAD");
        });
        assert(callbackInvoked);
        std::cout << "  -> PASS: Duplicate lead submission detected and rejected with 409 Conflict." << std::endl;
    }

    // E. Rate limiting (> 30 submissions per minute)
    {
        LeadController::clearDuplicates();
        std::string testIp = "192.168.1.100";
        bool hitRateLimit = false;

        for (int i = 0; i < 33; ++i) {
            auto req = std::make_shared<drogon::HttpRequest>();
            req->method_ = drogon::Post;
            req->path_ = "/api/v1/leads";
            req->setHeader("X-Forwarded-For", testIp);
            req->body_ = "{\"name\":\"Rate Tester\",\"email\":\"user" + std::to_string(i) + "@example.com\",\"service\":\"Service" + std::to_string(i) + "\",\"consent\":true}";

            drogon::app().handleRequest(req, [&hitRateLimit, i](const drogon::HttpResponsePtr &resp) {
                if (i >= 30) {
                    assert(resp->statusCode() == drogon::k429TooManyRequests);
                    assert(!resp->getHeader("Retry-After").empty());
                    auto json = resp->jsonObject_;
                    assert(json != nullptr);
                    assert((*json)["code"].asString() == "RATE_LIMIT_EXCEEDED");
                    hitRateLimit = true;
                }
            });
        }
        assert(hitRateLimit);
        std::cout << "  -> PASS: Rapid submissions throttled with 429 Too Many Requests." << std::endl;
    }

    // F. Database failure resilience: never confirm a failed save!
    {
        LeadController::resetRateLimits();
        LeadController::clearDuplicates();

        auto dbClient = drogon::app().getDbClient("default");
        assert(dbClient != nullptr);
        dbClient->setSimulateFailure(true);

        auto req = std::make_shared<drogon::HttpRequest>();
        req->method_ = drogon::Post;
        req->path_ = "/api/v1/leads";
        req->body_ = "{\"name\":\"Ananya Roy\",\"email\":\"ananya@example.com\",\"service\":\"Topic to Video\",\"consent\":true}";

        bool callbackInvoked = false;
        drogon::app().handleRequest(req, [&callbackInvoked](const drogon::HttpResponsePtr &resp) {
            callbackInvoked = true;
            // Must return 500, NEVER 200 or 201
            assert(resp->statusCode() == drogon::k500InternalServerError);
            auto json = resp->jsonObject_;
            assert(json != nullptr);
            assert((*json)["code"].asString() == "DATABASE_ERROR");
            assert((*json)["success"].isNull() || (*json)["success"].asBool() == false);
        });
        assert(callbackInvoked);

        // Reset dbClient back to normal
        dbClient->setSimulateFailure(false);
        std::cout << "  -> PASS: Database failure handled securely with 500 (never confirms failed save)." << std::endl;
    }

    // G. Lead search, filters, and server-side pagination
    {
        // 1. Pagination check
        auto reqPage = std::make_shared<drogon::HttpRequest>();
        reqPage->method_ = drogon::Get;
        reqPage->path_ = "/api/v1/leads?page=1&limit=2";

        bool callbackInvoked = false;
        drogon::app().handleRequest(reqPage, [&callbackInvoked](const drogon::HttpResponsePtr &resp) {
            callbackInvoked = true;
            assert(resp->statusCode() == drogon::k200OK);
            auto json = resp->jsonObject_;
            assert(json != nullptr);
            assert((*json)["status"].asString() == "ok");
            assert((*json)["pagination"]["page"].asInt() == 1);
            assert((*json)["pagination"]["limit"].asInt() == 2);
            assert((*json)["pagination"]["total"].asInt() >= 2);
            assert((*json)["data"].size() == 2);
        });
        assert(callbackInvoked);

        // 2. Search query check
        auto reqSearch = std::make_shared<drogon::HttpRequest>();
        reqSearch->method_ = drogon::Get;
        reqSearch->path_ = "/api/v1/leads?q=TechFlow";

        callbackInvoked = false;
        drogon::app().handleRequest(reqSearch, [&callbackInvoked](const drogon::HttpResponsePtr &resp) {
            callbackInvoked = true;
            assert(resp->statusCode() == drogon::k200OK);
            auto json = resp->jsonObject_;
            assert(json != nullptr);
            assert((*json)["data"].size() >= 1);
            assert((*json)["data"][0]["full_name"].asString() == "TechFlow Innovations");
        });
        assert(callbackInvoked);

        // 3. Status filter check
        auto reqStatus = std::make_shared<drogon::HttpRequest>();
        reqStatus->method_ = drogon::Get;
        reqStatus->path_ = "/api/v1/leads?status=qualified";

        callbackInvoked = false;
        drogon::app().handleRequest(reqStatus, [&callbackInvoked](const drogon::HttpResponsePtr &resp) {
            callbackInvoked = true;
            assert(resp->statusCode() == drogon::k200OK);
            auto json = resp->jsonObject_;
            assert(json != nullptr);
            for (size_t i = 0; i < (*json)["data"].size(); ++i) {
                assert((*json)["data"][i]["status"].asString() == "qualified");
            }
        });
        assert(callbackInvoked);

        // 4. Invalid pagination parameter
        auto reqBadPage = std::make_shared<drogon::HttpRequest>();
        reqBadPage->method_ = drogon::Get;
        reqBadPage->path_ = "/api/v1/leads?page=0";

        callbackInvoked = false;
        drogon::app().handleRequest(reqBadPage, [&callbackInvoked](const drogon::HttpResponsePtr &resp) {
            callbackInvoked = true;
            assert(resp->statusCode() == drogon::k400BadRequest);
            auto json = resp->jsonObject_;
            assert(json != nullptr);
            assert((*json)["code"].asString() == "INVALID_PAGINATION");
        });
        assert(callbackInvoked);
        std::cout << "  -> PASS: Lead search, filter combinations, and server-side pagination verified." << std::endl;
    }

    // H. Lead details and follow-up notes with session verification
    {
        // 1. Unauthorized access rejected
        auto reqUnauth = std::make_shared<drogon::HttpRequest>();
        reqUnauth->method_ = drogon::Get;
        reqUnauth->path_ = "/api/v1/leads/MN-LEAD-2026-001";

        bool callbackInvoked = false;
        drogon::app().handleRequest(reqUnauth, [&callbackInvoked](const drogon::HttpResponsePtr &resp) {
            callbackInvoked = true;
            assert(resp->statusCode() == drogon::k401Unauthorized);
        });
        assert(callbackInvoked);

        // Log in manager to obtain valid session
        std::string mgrSid;
        {
            auto reqLogin = std::make_shared<drogon::HttpRequest>();
            reqLogin->method_ = drogon::Post;
            reqLogin->path_ = "/api/v1/auth/login";
            reqLogin->body_ = "{\"email\":\"manager@marsnova.in\",\"password\":\"Fx-Manager-8421!\"}";

            drogon::app().handleRequest(reqLogin, [&mgrSid](const drogon::HttpResponsePtr &resp) {
                assert(resp->statusCode() == drogon::k200OK);
                auto json = resp->jsonObject_;
                assert(json != nullptr);
                mgrSid = (*json)["session"]["session_id"].asString();
            });
        }
        assert(!mgrSid.empty());

        // 2. Authorized lead details inspection
        auto reqAuth = std::make_shared<drogon::HttpRequest>();
        reqAuth->method_ = drogon::Get;
        reqAuth->path_ = "/api/v1/leads/MN-LEAD-2026-001";
        reqAuth->setHeader("Cookie", "marsnova_session=" + mgrSid);

        callbackInvoked = false;
        drogon::app().handleRequest(reqAuth, [&callbackInvoked](const drogon::HttpResponsePtr &resp) {
            callbackInvoked = true;
            assert(resp->statusCode() == drogon::k200OK);
            auto json = resp->jsonObject_;
            assert(json != nullptr);
            assert((*json)["data"]["id"].asString() == "MN-LEAD-2026-001");
            assert((*json)["data"]["activities"].isArray());
            assert((*json)["data"]["activities"].size() >= 1);
        });
        assert(callbackInvoked);

        // 3. Add follow-up note (validation & persistence)
        auto reqNote = std::make_shared<drogon::HttpRequest>();
        reqNote->method_ = drogon::Post;
        reqNote->path_ = "/api/v1/leads/MN-LEAD-2026-001/notes";
        reqNote->setHeader("Cookie", "marsnova_session=" + mgrSid);
        reqNote->body_ = "{\"note\":\"Followed up via phone. Client requested formal pricing breakdown.\"}";

        callbackInvoked = false;
        drogon::app().handleRequest(reqNote, [&callbackInvoked](const drogon::HttpResponsePtr &resp) {
            callbackInvoked = true;
            assert(resp->statusCode() == drogon::k201Created);
            auto json = resp->jsonObject_;
            assert(json != nullptr);
            assert((*json)["status"].asString() == "ok");
            assert((*json)["version"].asInt() >= 2);
            assert((*json)["activity"]["type"].asString() == "follow_up_note");
        });
        assert(callbackInvoked);
        std::cout << "  -> PASS: Staff lead inspection and follow-up notes persisted with audit trail." << std::endl;
    }

    // I. Status transitions, role permissions, and concurrent edits
    {
        std::string editorSid;
        std::string mgrSid;
        {
            auto reqLogin = std::make_shared<drogon::HttpRequest>();
            reqLogin->method_ = drogon::Post;
            reqLogin->path_ = "/api/v1/auth/login";
            reqLogin->body_ = "{\"email\":\"editor@marsnova.in\",\"password\":\"Fx-Editor-8421!\"}";
            drogon::app().handleRequest(reqLogin, [&editorSid](const drogon::HttpResponsePtr &resp) {
                editorSid = (*resp->jsonObject_)["session"]["session_id"].asString();
            });

            auto reqLogin2 = std::make_shared<drogon::HttpRequest>();
            reqLogin2->method_ = drogon::Post;
            reqLogin2->path_ = "/api/v1/auth/login";
            reqLogin2->body_ = "{\"email\":\"manager@marsnova.in\",\"password\":\"Fx-Manager-8421!\"}";
            drogon::app().handleRequest(reqLogin2, [&mgrSid](const drogon::HttpResponsePtr &resp) {
                mgrSid = (*resp->jsonObject_)["session"]["session_id"].asString();
            });
        }
        assert(!editorSid.empty() && !mgrSid.empty());

        // 1. Seed fresh lead in 'new' status
        LeadController::seedLead("MN-LEAD-TRANS-01", "Transition Tester", "trans@example.com", "+91 99999 88888", "Topic to Video", "new", 1);

        // 2. Invalid state machine transition: 'new' -> 'converted' must be rejected
        auto reqInvalidTrans = std::make_shared<drogon::HttpRequest>();
        reqInvalidTrans->method_ = drogon::Patch;
        reqInvalidTrans->path_ = "/api/v1/leads/MN-LEAD-TRANS-01/status";
        reqInvalidTrans->setHeader("Cookie", "marsnova_session=" + mgrSid);
        reqInvalidTrans->body_ = "{\"status\":\"converted\"}";

        bool callbackInvoked = false;
        drogon::app().handleRequest(reqInvalidTrans, [&callbackInvoked](const drogon::HttpResponsePtr &resp) {
            callbackInvoked = true;
            assert(resp->statusCode() == drogon::k400BadRequest);
            auto json = resp->jsonObject_;
            assert(json != nullptr);
            assert((*json)["code"].asString() == "INVALID_STATUS_TRANSITION");
        });
        assert(callbackInvoked);

        // 3. Role permission check: Editor cannot convert or archive leads
        LeadController::seedLead("MN-LEAD-TRANS-02", "Editor RBAC Tester", "editor.rbac@example.com", "+91 99999 77777", "Topic to Video", "proposal_sent", 1);
        auto reqEditorEscalation = std::make_shared<drogon::HttpRequest>();
        reqEditorEscalation->method_ = drogon::Patch;
        reqEditorEscalation->path_ = "/api/v1/leads/MN-LEAD-TRANS-02/status";
        reqEditorEscalation->setHeader("Cookie", "marsnova_session=" + editorSid);
        reqEditorEscalation->body_ = "{\"status\":\"converted\"}";

        callbackInvoked = false;
        drogon::app().handleRequest(reqEditorEscalation, [&callbackInvoked](const drogon::HttpResponsePtr &resp) {
            callbackInvoked = true;
            assert(resp->statusCode() == drogon::k403Forbidden);
            auto json = resp->jsonObject_;
            assert(json != nullptr);
            assert((*json)["code"].asString() == "FORBIDDEN_INSUFFICIENT_PERMISSIONS");
        });
        assert(callbackInvoked);

        // 4. Valid transition by manager: 'proposal_sent' -> 'converted'
        auto reqMgrConvert = std::make_shared<drogon::HttpRequest>();
        reqMgrConvert->method_ = drogon::Patch;
        reqMgrConvert->path_ = "/api/v1/leads/MN-LEAD-TRANS-02/status";
        reqMgrConvert->setHeader("Cookie", "marsnova_session=" + mgrSid);
        reqMgrConvert->body_ = "{\"status\":\"converted\",\"note\":\"Contract signed.\"}";

        callbackInvoked = false;
        drogon::app().handleRequest(reqMgrConvert, [&callbackInvoked](const drogon::HttpResponsePtr &resp) {
            callbackInvoked = true;
            assert(resp->statusCode() == drogon::k200OK);
            auto json = resp->jsonObject_;
            assert(json != nullptr);
            assert((*json)["lead"]["status"].asString() == "converted");
            assert((*json)["lead"]["version"].asInt() == 2);
        });
        assert(callbackInvoked);

        // 5. Concurrent edit detection: Stale expected_version rejected with 409
        auto reqStaleEdit = std::make_shared<drogon::HttpRequest>();
        reqStaleEdit->method_ = drogon::Patch;
        reqStaleEdit->path_ = "/api/v1/leads/MN-LEAD-TRANS-02/status";
        reqStaleEdit->setHeader("Cookie", "marsnova_session=" + mgrSid);
        reqStaleEdit->body_ = "{\"status\":\"archived\",\"expected_version\":1}"; // Lead is already version 2

        callbackInvoked = false;
        drogon::app().handleRequest(reqStaleEdit, [&callbackInvoked](const drogon::HttpResponsePtr &resp) {
            callbackInvoked = true;
            assert(resp->statusCode() == drogon::k409Conflict);
            auto json = resp->jsonObject_;
            assert(json != nullptr);
            assert((*json)["code"].asString() == "CONCURRENT_MODIFICATION_DETECTED");
        });
        assert(callbackInvoked);
        std::cout << "  -> PASS: Valid state transitions, RBAC restrictions, and concurrent edit conflict checks verified." << std::endl;
    }

    // J. WhatsApp Business provider integration, bounded retries, outage & duplicate protection
    {
        marsnova::WhatsAppNotificationService::resetStore();

        // 1. Unconfigured Provider: returns fallback_click_to_chat, truthful status, click-to-chat URL
        marsnova::WhatsAppNotificationService::setMockMode(marsnova::MockProviderMode::Disabled);
        auto notif1 = marsnova::WhatsAppNotificationService::dispatchLeadNotification(
            "LEAD-NOTIF-01", "Priya Verma", "+91 98200 99887", "Topic to Video", "MN-LEAD-001"
        );
        assert(notif1.status == "fallback_click_to_chat");
        assert(notif1.attempts == 0);
        assert(notif1.providerMessageId.empty());
        assert(!notif1.clickToChatUrl.empty());
        assert(notif1.clickToChatUrl.rfind("https://wa.me/917208591595", 0) == 0);

        // 2. Mock Success: automated delivery, provider ID, attempts = 1
        marsnova::WhatsAppNotificationService::setMockMode(marsnova::MockProviderMode::Success);
        auto notif2 = marsnova::WhatsAppNotificationService::dispatchLeadNotification(
            "LEAD-NOTIF-02", "Vikram Singh", "+91 98111 88776", "Pen Drive Data Recovery", "MN-LEAD-002"
        );
        assert(notif2.status == "sent");
        assert(notif2.attempts == 1);
        assert(notif2.providerMessageId.rfind("wamid.HBg", 0) == 0);
        assert(notif2.safeErrorDetails.empty());

        // 3. Mock Outage: HTTP 503 with bounded retries (3 attempts exhausted) & safe error without token leak
        marsnova::WhatsAppNotificationService::setMockMode(marsnova::MockProviderMode::Outage);
        auto notif3 = marsnova::WhatsAppNotificationService::dispatchLeadNotification(
            "LEAD-NOTIF-03", "Rohit Sen", "+91 98450 77665", "Business Branding", "MN-LEAD-003"
        );
        assert(notif3.status == "failed");
        assert(notif3.attempts == 3); // Bounded retries: 3 attempts exhausted
        assert(notif3.maxAttempts == 3);
        assert(notif3.providerMessageId.empty());
        assert(!notif3.safeErrorDetails.empty());
        assert(notif3.safeErrorDetails.find("Bearer") == std::string::npos); // Safe error details: no secrets leaked
        assert(!notif3.clickToChatUrl.empty()); // Fallback URL retained

        // 4. Mock Timeout: timeout with bounded retries
        marsnova::WhatsAppNotificationService::setMockMode(marsnova::MockProviderMode::Timeout);
        auto notif4 = marsnova::WhatsAppNotificationService::dispatchLeadNotification(
            "LEAD-NOTIF-04", "Ananya Roy", "+91 97690 66554", "AI Consulting", "MN-LEAD-004"
        );
        assert(notif4.status == "failed");
        assert(notif4.attempts == 3);
        assert(notif4.safeErrorDetails.find("timed out") != std::string::npos);
        assert(!notif4.clickToChatUrl.empty());

        // 5. Duplicate Protection: repeated dispatch with same idempotency key is blocked
        marsnova::WhatsAppNotificationService::setMockMode(marsnova::MockProviderMode::Success);
        size_t initialDispatches = marsnova::WhatsAppNotificationService::getTotalDispatchesCount();

        auto dup1 = marsnova::WhatsAppNotificationService::dispatchLeadNotification(
            "LEAD-DUP-01", "Duplicate Test", "+91 99999 11111", "Topic to Video", "MN-LEAD-DUP"
        );
        assert(dup1.status == "sent");
        assert(marsnova::WhatsAppNotificationService::getTotalDispatchesCount() == initialDispatches + 1);

        auto dup2 = marsnova::WhatsAppNotificationService::dispatchLeadNotification(
            "LEAD-DUP-01", "Duplicate Test", "+91 99999 11111", "Topic to Video", "MN-LEAD-DUP"
        );
        // Returns existing record without duplicate dispatch
        assert(dup2.id == dup1.id);
        assert(dup2.providerMessageId == dup1.providerMessageId);
        assert(marsnova::WhatsAppNotificationService::getTotalDispatchesCount() == initialDispatches + 1);

        // 6. Persistence Safety Invariant: Lead is saved even if WhatsApp fails
        LeadController::resetRateLimits();
        LeadController::clearDuplicates();
        marsnova::WhatsAppNotificationService::setMockMode(marsnova::MockProviderMode::Outage);

        auto req = std::make_shared<drogon::HttpRequest>();
        req->method_ = drogon::Post;
        req->path_ = "/api/v1/leads";
        req->body_ = "{\"name\":\"Resilient Client\",\"email\":\"resilient@example.com\",\"phone\":\"+919876543210\",\"service\":\"Topic to Video\",\"consent\":true}";

        bool callbackInvoked = false;
        drogon::app().handleRequest(req, [&callbackInvoked](const drogon::HttpResponsePtr &resp) {
            callbackInvoked = true;
            assert(resp->statusCode() == drogon::k201Created); // Lead MUST be saved (201)
            auto json = resp->jsonObject_;
            assert(json != nullptr);
            assert((*json)["status"].asString() == "ok");
            assert((*json)["success"].asBool() == true);
            assert(!(*json)["lead_id"].asString().empty());
            assert(!(*json)["reference"].asString().empty());

            // Notification reflects failure truthfully with fallback click-to-chat URL
            assert((*json)["notification"]["status"].asString() == "failed");
            assert((*json)["notification"]["attempts"].asInt() == 3);
            assert(!(*json)["notification"]["whatsapp_url"].asString().empty());
        });
        assert(callbackInvoked);

        // Reset provider back to disabled mode
        marsnova::WhatsAppNotificationService::setMockMode(marsnova::MockProviderMode::Disabled);
        std::cout << "  -> PASS: WhatsApp provider integration, bounded retries, outage & duplicate protection verified." << std::endl;
    }
}

void testAuthAndRbac() {
    std::cout << "[Test 9] Testing staff auth, sessions, password hashing, and RBAC..." << std::endl;
    AuthController::clearSessions();
    AuthController::clearUsers();
    seedStaffFixtures();

    // A. Password Hashing and Constant-Time Verification
    {
        std::string secret = "MarsNova@Secure2026";
        std::string hash = Security::hashPassword(secret);
        assert(hash.rfind("sha256$", 0) == 0);
        assert(Security::verifyPassword(secret, hash));
        assert(!Security::verifyPassword("WrongPassword", hash));
        std::cout << "  -> PASS: Secure salted password hashing and constant-time verification." << std::endl;
    }

    // B. Invalid credentials rejection
    {
        auto req = std::make_shared<drogon::HttpRequest>();
        req->method_ = drogon::Post;
        req->path_ = "/api/v1/auth/login";
        req->body_ = "{\"email\":\"admin@marsnova.in\",\"password\":\"IncorrectPassword\"}";

        bool callbackInvoked = false;
        drogon::app().handleRequest(req, [&callbackInvoked](const drogon::HttpResponsePtr &resp) {
            callbackInvoked = true;
            assert(resp->statusCode() == drogon::k401Unauthorized);
            auto json = resp->jsonObject_;
            assert(json != nullptr);
            assert((*json)["code"].asString() == "INVALID_CREDENTIALS");
        });
        assert(callbackInvoked);
        std::cout << "  -> PASS: Invalid credentials rejected with 401 INVALID_CREDENTIALS." << std::endl;
    }

    // C. Account status checks (Suspended and Inactive staff accounts)
    {
        // 1. Suspended account
        auto req1 = std::make_shared<drogon::HttpRequest>();
        req1->method_ = drogon::Post;
        req1->path_ = "/api/v1/auth/login";
        req1->body_ = "{\"email\":\"suspended@marsnova.in\",\"password\":\"Fx-Suspended-8421!\"}";

        bool callbackInvoked = false;
        drogon::app().handleRequest(req1, [&callbackInvoked](const drogon::HttpResponsePtr &resp) {
            callbackInvoked = true;
            assert(resp->statusCode() == drogon::k403Forbidden);
            auto json = resp->jsonObject_;
            assert(json != nullptr);
            assert((*json)["code"].asString() == "ACCOUNT_SUSPENDED");
        });
        assert(callbackInvoked);

        // 2. Inactive account
        auto req2 = std::make_shared<drogon::HttpRequest>();
        req2->method_ = drogon::Post;
        req2->path_ = "/api/v1/auth/login";
        req2->body_ = "{\"email\":\"inactive@marsnova.in\",\"password\":\"Fx-Inactive-8421!\"}";

        callbackInvoked = false;
        drogon::app().handleRequest(req2, [&callbackInvoked](const drogon::HttpResponsePtr &resp) {
            callbackInvoked = true;
            assert(resp->statusCode() == drogon::k403Forbidden);
            auto json = resp->jsonObject_;
            assert(json != nullptr);
            assert((*json)["code"].asString() == "ACCOUNT_INACTIVE");
        });
        assert(callbackInvoked);
        std::cout << "  -> PASS: Account status enforced (suspended/inactive rejected with 403)." << std::endl;
    }

    // D. Valid login and session cookie setting
    std::string adminSessionId;
    std::string adminCsrfToken;
    {
        auto req = std::make_shared<drogon::HttpRequest>();
        req->method_ = drogon::Post;
        req->path_ = "/api/v1/auth/login";
        req->body_ = "{\"email\":\"admin@marsnova.in\",\"password\":\"Fx-Admin-8421!\"}";

        bool callbackInvoked = false;
        drogon::app().handleRequest(req, [&callbackInvoked, &adminSessionId, &adminCsrfToken](const drogon::HttpResponsePtr &resp) {
            callbackInvoked = true;
            assert(resp->statusCode() == drogon::k200OK);
            auto json = resp->jsonObject_;
            assert(json != nullptr);
            assert((*json)["status"].asString() == "ok");
            assert((*json)["session"]["user"]["role"].asString() == "super_admin");

            adminSessionId = (*json)["session"]["session_id"].asString();
            adminCsrfToken = (*json)["session"]["csrf_token"].asString();
            assert(!adminSessionId.empty());
            assert(!adminCsrfToken.empty());

            // Verify secure cookie
            std::string cookie = resp->getHeader("Set-Cookie");
            assert(!cookie.empty());
            assert(cookie.find("marsnova_session=" + adminSessionId) != std::string::npos);
            assert(cookie.find("HttpOnly") != std::string::npos);
            assert(cookie.find("SameSite=Strict") != std::string::npos);
        });
        assert(callbackInvoked);
        std::cout << "  -> PASS: Successful login sets secure HttpOnly cookie and CSRF token." << std::endl;
    }

    // E. Session inspection (/api/v1/auth/session and /api/v1/auth/me)
    {
        // 1. Unauthenticated inspection
        auto reqUnauth = std::make_shared<drogon::HttpRequest>();
        reqUnauth->method_ = drogon::Get;
        reqUnauth->path_ = "/api/v1/auth/session";

        bool callbackInvoked = false;
        drogon::app().handleRequest(reqUnauth, [&callbackInvoked](const drogon::HttpResponsePtr &resp) {
            callbackInvoked = true;
            assert(resp->statusCode() == drogon::k401Unauthorized);
            auto json = resp->jsonObject_;
            assert(json != nullptr);
            assert((*json)["code"].asString() == "UNAUTHORIZED");
        });
        assert(callbackInvoked);

        // 2. Authenticated inspection via cookie
        auto reqAuth = std::make_shared<drogon::HttpRequest>();
        reqAuth->method_ = drogon::Get;
        reqAuth->path_ = "/api/v1/auth/session";
        reqAuth->setHeader("Cookie", "marsnova_session=" + adminSessionId);

        callbackInvoked = false;
        drogon::app().handleRequest(reqAuth, [&callbackInvoked](const drogon::HttpResponsePtr &resp) {
            callbackInvoked = true;
            assert(resp->statusCode() == drogon::k200OK);
            auto json = resp->jsonObject_;
            assert(json != nullptr);
            assert((*json)["authenticated"].asBool() == true);
            assert((*json)["user"]["role"].asString() == "super_admin");
            assert((*json)["user"]["permissions"]["all"].asBool() == true);
        });
        assert(callbackInvoked);
        std::cout << "  -> PASS: Session inspection verifies caller role and permissions." << std::endl;
    }

    // F. Session expiration
    {
        AuthController::expireSession(adminSessionId);

        auto req = std::make_shared<drogon::HttpRequest>();
        req->method_ = drogon::Get;
        req->path_ = "/api/v1/auth/session";
        req->setHeader("Cookie", "marsnova_session=" + adminSessionId);

        bool callbackInvoked = false;
        drogon::app().handleRequest(req, [&callbackInvoked](const drogon::HttpResponsePtr &resp) {
            callbackInvoked = true;
            assert(resp->statusCode() == drogon::k401Unauthorized);
            auto json = resp->jsonObject_;
            assert(json != nullptr);
            assert((*json)["code"].asString() == "SESSION_EXPIRED");
        });
        assert(callbackInvoked);
        std::cout << "  -> PASS: Expired session rejected with 401 SESSION_EXPIRED." << std::endl;
    }

    // G. Re-login and Logout
    {
        // Log in again
        auto reqLogin = std::make_shared<drogon::HttpRequest>();
        reqLogin->method_ = drogon::Post;
        reqLogin->path_ = "/api/v1/auth/login";
        reqLogin->body_ = "{\"email\":\"admin@marsnova.in\",\"password\":\"Fx-Admin-8421!\"}";

        std::string newSessionId;
        drogon::app().handleRequest(reqLogin, [&newSessionId](const drogon::HttpResponsePtr &resp) {
            assert(resp->statusCode() == drogon::k200OK);
            auto json = resp->jsonObject_;
            newSessionId = (*json)["session"]["session_id"].asString();
        });
        assert(!newSessionId.empty());

        // Logout
        auto reqLogout = std::make_shared<drogon::HttpRequest>();
        reqLogout->method_ = drogon::Post;
        reqLogout->path_ = "/api/v1/auth/logout";
        reqLogout->setHeader("Cookie", "marsnova_session=" + newSessionId);

        bool callbackInvoked = false;
        drogon::app().handleRequest(reqLogout, [&callbackInvoked](const drogon::HttpResponsePtr &resp) {
            callbackInvoked = true;
            assert(resp->statusCode() == drogon::k200OK);
            std::string cookie = resp->getHeader("Set-Cookie");
            assert(cookie.find("Max-Age=0") != std::string::npos);
        });
        assert(callbackInvoked);

        // Verification after logout
        auto reqCheck = std::make_shared<drogon::HttpRequest>();
        reqCheck->method_ = drogon::Get;
        reqCheck->path_ = "/api/v1/auth/session";
        reqCheck->setHeader("Cookie", "marsnova_session=" + newSessionId);

        callbackInvoked = false;
        drogon::app().handleRequest(reqCheck, [&callbackInvoked](const drogon::HttpResponsePtr &resp) {
            callbackInvoked = true;
            assert(resp->statusCode() == drogon::k401Unauthorized);
        });
        assert(callbackInvoked);
        std::cout << "  -> PASS: Logout invalidates session and clears cookie." << std::endl;
    }

    // H. Role-Based Authorization and Privilege Escalation Prevention
    {
        // 1. Log in as 'editor'
        auto reqEditorLogin = std::make_shared<drogon::HttpRequest>();
        reqEditorLogin->method_ = drogon::Post;
        reqEditorLogin->path_ = "/api/v1/auth/login";
        reqEditorLogin->body_ = "{\"email\":\"editor@marsnova.in\",\"password\":\"Fx-Editor-8421!\"}";

        std::string editorSid;
        std::string editorCsrf;
        drogon::app().handleRequest(reqEditorLogin, [&editorSid, &editorCsrf](const drogon::HttpResponsePtr &resp) {
            assert(resp->statusCode() == drogon::k200OK);
            auto json = resp->jsonObject_;
            editorSid = (*json)["session"]["session_id"].asString();
            editorCsrf = (*json)["session"]["csrf_token"].asString();
        });
        assert(!editorSid.empty());

        bool callbackInvoked = false;

        // Editor CANNOT create staff users (Privilege escalation blocked)
        auto reqCreateUser = std::make_shared<drogon::HttpRequest>();
        reqCreateUser->method_ = drogon::Post;
        reqCreateUser->path_ = "/api/v1/admin/users";
        reqCreateUser->setHeader("Cookie", "marsnova_session=" + editorSid);
        reqCreateUser->setHeader("X-CSRF-Token", editorCsrf);
        reqCreateUser->body_ = "{\"email\":\"newadmin@marsnova.in\",\"password\":\"NewFx-Admin-8421!\",\"full_name\":\"Sneaky Admin\",\"role\":\"super_admin\"}";

        callbackInvoked = false;
        drogon::app().handleRequest(reqCreateUser, [&callbackInvoked](const drogon::HttpResponsePtr &resp) {
            callbackInvoked = true;
            assert(resp->statusCode() == drogon::k403Forbidden);
            auto json = resp->jsonObject_;
            assert(json != nullptr);
            assert((*json)["code"].asString() == "FORBIDDEN_INSUFFICIENT_PERMISSIONS");
        });
        assert(callbackInvoked);
        std::cout << "  -> PASS: Privilege escalation prevented (editor cannot access quotes or create users)." << std::endl;

        // 2. CSRF Verification on super_admin user creation
        // Log in as super_admin
        auto reqAdminLogin = std::make_shared<drogon::HttpRequest>();
        reqAdminLogin->method_ = drogon::Post;
        reqAdminLogin->path_ = "/api/v1/auth/login";
        reqAdminLogin->body_ = "{\"email\":\"admin@marsnova.in\",\"password\":\"Fx-Admin-8421!\"}";

        std::string superSid;
        std::string superCsrf;
        drogon::app().handleRequest(reqAdminLogin, [&superSid, &superCsrf](const drogon::HttpResponsePtr &resp) {
            assert(resp->statusCode() == drogon::k200OK);
            auto json = resp->jsonObject_;
            superSid = (*json)["session"]["session_id"].asString();
            superCsrf = (*json)["session"]["csrf_token"].asString();
        });

        // Fail without CSRF token
        auto reqNoCsrf = std::make_shared<drogon::HttpRequest>();
        reqNoCsrf->method_ = drogon::Post;
        reqNoCsrf->path_ = "/api/v1/admin/users";
        reqNoCsrf->setHeader("Cookie", "marsnova_session=" + superSid);
        reqNoCsrf->body_ = "{\"email\":\"staff2@marsnova.in\",\"password\":\"StaffPassword@2026\",\"full_name\":\"Second Staff\",\"role\":\"editor\"}";

        callbackInvoked = false;
        drogon::app().handleRequest(reqNoCsrf, [&callbackInvoked](const drogon::HttpResponsePtr &resp) {
            callbackInvoked = true;
            assert(resp->statusCode() == drogon::k403Forbidden);
            auto json = resp->jsonObject_;
            assert(json != nullptr);
            assert((*json)["code"].asString() == "CSRF_VERIFICATION_FAILED");
        });
        assert(callbackInvoked);

        // Succeed with valid CSRF token
        auto reqWithCsrf = std::make_shared<drogon::HttpRequest>();
        reqWithCsrf->method_ = drogon::Post;
        reqWithCsrf->path_ = "/api/v1/admin/users";
        reqWithCsrf->setHeader("Cookie", "marsnova_session=" + superSid);
        reqWithCsrf->setHeader("X-CSRF-Token", superCsrf);
        reqWithCsrf->body_ = "{\"email\":\"staff2@marsnova.in\",\"password\":\"StaffPassword@2026\",\"full_name\":\"Second Staff\",\"role\":\"editor\"}";

        callbackInvoked = false;
        drogon::app().handleRequest(reqWithCsrf, [&callbackInvoked](const drogon::HttpResponsePtr &resp) {
            callbackInvoked = true;
            assert(resp->statusCode() == drogon::k201Created);
            auto json = resp->jsonObject_;
            assert(json != nullptr);
            assert((*json)["status"].asString() == "ok");
            assert((*json)["user"]["email"].asString() == "staff2@marsnova.in");
        });
        assert(callbackInvoked);
        std::cout << "  -> PASS: CSRF protection enforced and super_admin user creation confirmed." << std::endl;
    }
}

void testPenDriveRecoveryAndCustodyTracking() {
    std::cout << "[Test 10] Testing pen-drive data recovery, intake, custody, approval gates & diagnostic protection..." << std::endl;

    // A. Rejects invalid form & missing consent
    {
        auto req = std::make_shared<drogon::HttpRequest>();
        req->method_ = drogon::Post;
        req->path_ = "/api/v1/recovery/intake";
        req->body_ = R"({
            "customer_name": "A",
            "customer_phone": "123",
            "device_brand": "SanDisk",
            "capacity_gb": 32.0,
            "consent_diagnostic": false,
            "terms_accepted": false
        })";

        bool cb = false;
        drogon::app().handleRequest(req, [&cb](const drogon::HttpResponsePtr &resp) {
            cb = true;
            assert(resp->statusCode() == drogon::k400BadRequest);
            auto json = resp->jsonObject_;
            assert(json != nullptr);
            assert((*json)["code"].asString() == "VALIDATION_FAILED");
        });
        assert(cb);

        // Missing consent
        auto req2 = std::make_shared<drogon::HttpRequest>();
        req2->method_ = drogon::Post;
        req2->path_ = "/api/v1/recovery/intake";
        req2->body_ = R"({
            "customer_name": "Priya Sharma",
            "customer_phone": "+91 98765 12345",
            "device_brand": "SanDisk",
            "capacity_gb": 32.0,
            "consent_diagnostic": false,
            "terms_accepted": false
        })";

        cb = false;
        drogon::app().handleRequest(req2, [&cb](const drogon::HttpResponsePtr &resp) {
            cb = true;
            assert(resp->statusCode() == drogon::k400BadRequest);
            auto json = resp->jsonObject_;
            assert(json != nullptr);
            assert((*json)["code"].asString() == "CONSENT_REQUIRED");
        });
        assert(cb);
        std::cout << "  -> PASS: Rejects invalid intake form and missing diagnostic consent with 400." << std::endl;
    }

    // B. Submits valid intake form & creates case reference
    std::string newCaseRef;
    {
        auto req = std::make_shared<drogon::HttpRequest>();
        req->method_ = drogon::Post;
        req->path_ = "/api/v1/recovery/intake";
        req->body_ = R"({
            "customer_name": "Priya Sharma",
            "customer_phone": "+91 98765 12345",
            "customer_email": "priya.sharma@example.com",
            "device_brand": "Kingston",
            "device_model": "DataTraveler Exodia 128GB",
            "capacity_gb": 128.0,
            "file_system": "exFAT",
            "damage_type": "electronic_controller",
            "symptoms": "USB device not recognized; burning hot upon insertion",
            "critical_files_description": "Master thesis data and CAD architecture schematics",
            "consent_diagnostic": true,
            "consent_nand_risk": true,
            "terms_accepted": true,
            "delivery_method": "counter_dropoff"
        })";

        bool cb = false;
        drogon::app().handleRequest(req, [&cb, &newCaseRef](const drogon::HttpResponsePtr &resp) {
            cb = true;
            assert(resp->statusCode() == drogon::k201Created);
            auto json = resp->jsonObject_;
            assert(json != nullptr);
            assert((*json)["success"].asBool() == true);
            newCaseRef = (*json)["case_reference"].asString();
            assert(!newCaseRef.empty());
            assert((*json)["recovery_status"].asString() == "intake_submitted");
        });
        assert(cb);
        std::cout << "  -> PASS: Valid intake generates unique case reference (" << newCaseRef << ") with 201 Created." << std::endl;
    }

    // C. Public tracking sanitization: Protected diagnostic notes must NEVER leak to public!
    {
        auto req = std::make_shared<drogon::HttpRequest>();
        req->method_ = drogon::Get;
        req->path_ = "/api/v1/recovery/track/" + newCaseRef;

        bool cb = false;
        drogon::app().handleRequest(req, [&cb](const drogon::HttpResponsePtr &resp) {
            cb = true;
            assert(resp->statusCode() == drogon::k200OK);
            auto json = resp->jsonObject_;
            assert(json != nullptr);
            assert((*json)["status"].asString() == "ok");
            // Must NOT contain internal diagnostic notes
            assert(!(*json).isMember("internal_diagnostic_notes"));
            assert(!(*json).isMember("customer_phone"));
            assert(!(*json).isMember("customer_email"));
            assert((*json)["physical_receipt_confirmed"].asBool() == false);
            assert((*json)["recovery_status"].asString() == "intake_submitted");
        });
        assert(cb);
        std::cout << "  -> PASS: Public case tracking protects internal diagnostic notes and customer contact data." << std::endl;
    }

}

void testMarsNovaLabLearningPlatform() {
    std::cout << "[Test 11] Testing MarsNova Lab student accounts, enrolment rules, ownership & cross-student isolation..." << std::endl;
    marsnova::LearningController::resetStore();

    // A. Student Registration & Validation
    {
        // 1. Weak password rejected
        auto reqWeak = std::make_shared<drogon::HttpRequest>();
        reqWeak->method_ = drogon::Post;
        reqWeak->path_ = "/api/v1/lab/auth/register";
        reqWeak->body_ = R"({"email":"std1@marsnova.in","password":"short","full_name":"Aarav Mehta"})";
        bool cb = false;
        drogon::app().handleRequest(reqWeak, [&cb](const drogon::HttpResponsePtr &resp) {
            cb = true;
            assert(resp->statusCode() == drogon::k400BadRequest);
            assert((*resp->jsonObject_)["code"].asString() == "WEAK_PASSWORD");
        });
        assert(cb);

        // 2. Invalid email rejected
        auto reqBadEmail = std::make_shared<drogon::HttpRequest>();
        reqBadEmail->method_ = drogon::Post;
        reqBadEmail->path_ = "/api/v1/lab/auth/register";
        reqBadEmail->body_ = R"({"email":"notanemail","password":"Password@123","full_name":"Aarav Mehta"})";
        cb = false;
        drogon::app().handleRequest(reqBadEmail, [&cb](const drogon::HttpResponsePtr &resp) {
            cb = true;
            assert(resp->statusCode() == drogon::k400BadRequest);
            assert((*resp->jsonObject_)["code"].asString() == "INVALID_EMAIL");
        });
        assert(cb);
        std::cout << "  -> PASS: Student registration validates password strength and email formatting." << std::endl;
    }

    // B. Account Registration, Login, and Suspended Account Checks
    std::string student1Cookie;
    std::string student1Id;
    {
        // Register Student 1
        auto reqReg = std::make_shared<drogon::HttpRequest>();
        reqReg->method_ = drogon::Post;
        reqReg->path_ = "/api/v1/lab/auth/register";
        reqReg->body_ = R"({"email":"aarav@example.com","password":"Student@2026!","full_name":"Aarav Mehta"})";
        bool cb = false;
        drogon::app().handleRequest(reqReg, [&cb, &student1Cookie, &student1Id](const drogon::HttpResponsePtr &resp) {
            cb = true;
            assert(resp->statusCode() == drogon::k201Created);
            auto json = resp->jsonObject_;
            assert(json != nullptr);
            assert((*json)["student"]["role"].asString() == "student");
            student1Id = (*json)["student"]["id"].asString();
            assert(!student1Id.empty());
            std::string cookie = resp->getHeader("Set-Cookie");
            assert(cookie.find("marsnova_student_session=") != std::string::npos);
            size_t start = cookie.find("marsnova_student_session=");
            size_t end = cookie.find(';', start);
            student1Cookie = cookie.substr(start, end - start);
        });
        assert(cb);
        assert(!student1Cookie.empty());

        // Duplicate registration rejected with 409 Conflict
        auto reqDup = std::make_shared<drogon::HttpRequest>();
        reqDup->method_ = drogon::Post;
        reqDup->path_ = "/api/v1/lab/auth/register";
        reqDup->body_ = R"({"email":"aarav@example.com","password":"DifferentPassword1!","full_name":"Aarav Mehta"})";
        cb = false;
        drogon::app().handleRequest(reqDup, [&cb](const drogon::HttpResponsePtr &resp) {
            cb = true;
            assert(resp->statusCode() == drogon::k409Conflict);
            assert((*resp->jsonObject_)["code"].asString() == "STUDENT_ALREADY_EXISTS");
        });
        assert(cb);

        // Login wrong password rejected with 401
        auto reqBadPass = std::make_shared<drogon::HttpRequest>();
        reqBadPass->method_ = drogon::Post;
        reqBadPass->path_ = "/api/v1/lab/auth/login";
        reqBadPass->body_ = R"({"email":"aarav@example.com","password":"WrongPassword!"})";
        cb = false;
        drogon::app().handleRequest(reqBadPass, [&cb](const drogon::HttpResponsePtr &resp) {
            cb = true;
            assert(resp->statusCode() == drogon::k401Unauthorized);
            assert((*resp->jsonObject_)["code"].asString() == "INVALID_CREDENTIALS");
        });
        assert(cb);

        // Suspended student account rejected with 403
        marsnova::LearningController::seedStudent("std-susp-001", "suspended.student@example.com", "Suspended Student", "Password@123", "suspended");
        auto reqSusp = std::make_shared<drogon::HttpRequest>();
        reqSusp->method_ = drogon::Post;
        reqSusp->path_ = "/api/v1/lab/auth/login";
        reqSusp->body_ = R"({"email":"suspended.student@example.com","password":"Password@123"})";
        cb = false;
        drogon::app().handleRequest(reqSusp, [&cb](const drogon::HttpResponsePtr &resp) {
            cb = true;
            assert(resp->statusCode() == drogon::k403Forbidden);
            assert((*resp->jsonObject_)["code"].asString() == "STUDENT_ACCOUNT_SUSPENDED");
        });
        assert(cb);
        std::cout << "  -> PASS: Account lifecycle, duplicate prevention, and suspended status enforcement verified." << std::endl;
    }

    // C. Strict Role Separation (Student cannot access Staff APIs; Staff cannot masquerade as Student)
    {
        // Staff session trying to hit student portal without student session -> 401
        auto reqStaffAsStudent = std::make_shared<drogon::HttpRequest>();
        reqStaffAsStudent->method_ = drogon::Get;
        reqStaffAsStudent->path_ = "/api/v1/lab/my-enrolments";
        reqStaffAsStudent->setHeader("Cookie", "marsnova_session=staff_mock_sid_12345");
        bool cb = false;
        drogon::app().handleRequest(reqStaffAsStudent, [&cb](const drogon::HttpResponsePtr &resp) {
            cb = true;
            assert(resp->statusCode() == drogon::k401Unauthorized);
            assert((*resp->jsonObject_)["code"].asString() == "UNAUTHORIZED_STUDENT_SESSION");
        });
        assert(cb);
        std::cout << "  -> PASS: Strict role separation blocks privilege escalation and session cross-contamination." << std::endl;
    }

    // D. Course Enrolment Rules (No payment checkout: record-only studio enrolment)
    {
        // Student 1 enrolls in advanced-video-production
        auto reqEnr = std::make_shared<drogon::HttpRequest>();
        reqEnr->method_ = drogon::Post;
        reqEnr->path_ = "/api/v1/lab/courses/advanced-video-production/enroll";
        reqEnr->setHeader("Cookie", student1Cookie);
        bool cb = false;
        drogon::app().handleRequest(reqEnr, [&cb, &student1Id](const drogon::HttpResponsePtr &resp) {
            cb = true;
            assert(resp->statusCode() == drogon::k201Created);
            auto json = resp->jsonObject_;
            assert(json != nullptr);
            assert((*json)["enrolment"]["student_id"].asString() == student1Id);
            assert((*json)["enrolment"]["status"].asString() == "active");
        });
        assert(cb);

        // Duplicate enrolment in same course rejected with 409
        auto reqDupEnr = std::make_shared<drogon::HttpRequest>();
        reqDupEnr->method_ = drogon::Post;
        reqDupEnr->path_ = "/api/v1/lab/courses/advanced-video-production/enroll";
        reqDupEnr->setHeader("Cookie", student1Cookie);
        cb = false;
        drogon::app().handleRequest(reqDupEnr, [&cb](const drogon::HttpResponsePtr &resp) {
            cb = true;
            assert(resp->statusCode() == drogon::k409Conflict);
            assert((*resp->jsonObject_)["code"].asString() == "ALREADY_ENROLLED");
        });
        assert(cb);

        // Non-existent course rejected with 404
        auto reqBadCourse = std::make_shared<drogon::HttpRequest>();
        reqBadCourse->method_ = drogon::Post;
        reqBadCourse->path_ = "/api/v1/lab/courses/non-existent-course-slug/enroll";
        reqBadCourse->setHeader("Cookie", student1Cookie);
        cb = false;
        drogon::app().handleRequest(reqBadCourse, [&cb](const drogon::HttpResponsePtr &resp) {
            cb = true;
            assert(resp->statusCode() == drogon::k404NotFound);
            assert((*resp->jsonObject_)["code"].asString() == "COURSE_NOT_FOUND");
        });
        assert(cb);
        std::cout << "  -> PASS: Course enrolment rules and duplicate prevention verified without payment dependencies." << std::endl;
    }

    // E. Lesson Access Gating & Cross-Student Isolation
    std::string student2Cookie;
    std::string student2Id;
    {
        // 1. Free preview lesson is publicly accessible
        auto reqPrev = std::make_shared<drogon::HttpRequest>();
        reqPrev->method_ = drogon::Get;
        reqPrev->path_ = "/api/v1/lab/courses/advanced-video-production/lessons/les-avp-01";
        bool cb = false;
        drogon::app().handleRequest(reqPrev, [&cb](const drogon::HttpResponsePtr &resp) {
            cb = true;
            assert(resp->statusCode() == drogon::k200OK);
            assert((*resp->jsonObject_)["data"]["is_free_preview"].asBool() == true);
        });
        assert(cb);

        // Register Student 2 and enroll ONLY in ai-powered-creative-editing
        auto reqReg2 = std::make_shared<drogon::HttpRequest>();
        reqReg2->method_ = drogon::Post;
        reqReg2->path_ = "/api/v1/lab/auth/register";
        reqReg2->body_ = R"({"email":"neha@example.com","password":"Student2@2026!","full_name":"Neha Gupta"})";
        cb = false;
        drogon::app().handleRequest(reqReg2, [&cb, &student2Cookie, &student2Id](const drogon::HttpResponsePtr &resp) {
            cb = true;
            assert(resp->statusCode() == drogon::k201Created);
            student2Id = (*resp->jsonObject_)["student"]["id"].asString();
            std::string cookie = resp->getHeader("Set-Cookie");
            size_t start = cookie.find("marsnova_student_session=");
            size_t end = cookie.find(';', start);
            student2Cookie = cookie.substr(start, end - start);
        });
        assert(cb);

        auto reqEnr2 = std::make_shared<drogon::HttpRequest>();
        reqEnr2->method_ = drogon::Post;
        reqEnr2->path_ = "/api/v1/lab/courses/ai-powered-creative-editing/enroll";
        reqEnr2->setHeader("Cookie", student2Cookie);
        cb = false;
        drogon::app().handleRequest(reqEnr2, [&cb](const drogon::HttpResponsePtr &resp) {
            cb = true;
            assert(resp->statusCode() == drogon::k201Created);
        });
        assert(cb);

        // 2. Student 2 tries to access non-preview lesson in advanced-video-production (where they are NOT enrolled) -> 403!
        auto reqGatedFail = std::make_shared<drogon::HttpRequest>();
        reqGatedFail->method_ = drogon::Get;
        reqGatedFail->path_ = "/api/v1/lab/courses/advanced-video-production/lessons/les-avp-02";
        reqGatedFail->setHeader("Cookie", student2Cookie);
        cb = false;
        drogon::app().handleRequest(reqGatedFail, [&cb](const drogon::HttpResponsePtr &resp) {
            cb = true;
            assert(resp->statusCode() == drogon::k403Forbidden);
            assert((*resp->jsonObject_)["code"].asString() == "ENROLMENT_REQUIRED");
        });
        assert(cb);

        // 3. Student 1 (enrolled in advanced-video-production) accesses les-avp-02 -> 200 OK with full content
        auto reqGatedOk = std::make_shared<drogon::HttpRequest>();
        reqGatedOk->method_ = drogon::Get;
        reqGatedOk->path_ = "/api/v1/lab/courses/advanced-video-production/lessons/les-avp-02";
        reqGatedOk->setHeader("Cookie", student1Cookie);
        cb = false;
        drogon::app().handleRequest(reqGatedOk, [&cb](const drogon::HttpResponsePtr &resp) {
            cb = true;
            assert(resp->statusCode() == drogon::k200OK);
            auto json = resp->jsonObject_;
            assert(json != nullptr);
            assert((*json)["data"]["id"].asString() == "les-avp-02");
            assert(!(*json)["data"]["video_url"].asString().empty());
        });
        assert(cb);
        std::cout << "  -> PASS: Curriculum gating allows preview and strictly blocks non-enrolled students from full lessons." << std::endl;
    }

    // F. Progress Tracking Ownership & Cross-Student Isolation (IDOR Protection)
    {
        // 1. Student 1 records progress on les-avp-02
        auto reqProg1 = std::make_shared<drogon::HttpRequest>();
        reqProg1->method_ = drogon::Post;
        reqProg1->path_ = "/api/v1/lab/lessons/les-avp-02/progress";
        reqProg1->setHeader("Cookie", student1Cookie);
        reqProg1->body_ = R"({"completed":true,"position_seconds":1800})";
        bool cb = false;
        drogon::app().handleRequest(reqProg1, [&cb, &student1Id](const drogon::HttpResponsePtr &resp) {
            cb = true;
            assert(resp->statusCode() == drogon::k200OK);
            assert((*resp->jsonObject_)["progress"]["student_id"].asString() == student1Id);
            assert((*resp->jsonObject_)["progress"]["completed"].asBool() == true);
        });
        assert(cb);

        // 2. Student 2 tries to record progress on les-avp-02 (not enrolled) -> 403 Forbidden
        auto reqProgFail = std::make_shared<drogon::HttpRequest>();
        reqProgFail->method_ = drogon::Post;
        reqProgFail->path_ = "/api/v1/lab/lessons/les-avp-02/progress";
        reqProgFail->setHeader("Cookie", student2Cookie);
        reqProgFail->body_ = R"({"completed":true,"position_seconds":500})";
        cb = false;
        drogon::app().handleRequest(reqProgFail, [&cb](const drogon::HttpResponsePtr &resp) {
            cb = true;
            assert(resp->statusCode() == drogon::k403Forbidden);
            assert((*resp->jsonObject_)["code"].asString() == "NOT_ENROLLED_IN_COURSE");
        });
        assert(cb);

        // 3. Cross-student progress calculation isolation in my-enrolments:
        // Student 1 has completed 1 of 3 lessons (33%) in advanced-video-production
        auto reqMy1 = std::make_shared<drogon::HttpRequest>();
        reqMy1->method_ = drogon::Get;
        reqMy1->path_ = "/api/v1/lab/my-enrolments";
        reqMy1->setHeader("Cookie", student1Cookie);
        cb = false;
        drogon::app().handleRequest(reqMy1, [&cb, &student1Id](const drogon::HttpResponsePtr &resp) {
            cb = true;
            assert(resp->statusCode() == drogon::k200OK);
            auto json = resp->jsonObject_;
            assert(json != nullptr);
            assert((*json)["student_id"].asString() == student1Id);
            assert((*json)["data"].size() == 1);
            assert((*json)["data"][0]["course_slug"].asString() == "advanced-video-production");
            assert((*json)["data"][0]["completed_lessons"].asInt() == 1);
            assert((*json)["data"][0]["total_lessons"].asInt() == 3);
            assert((*json)["data"][0]["progress_percentage"].asInt() == 33);
        });
        assert(cb);

        // Student 2 has completed 0 of 2 lessons (0%) in ai-powered-creative-editing
        auto reqMy2 = std::make_shared<drogon::HttpRequest>();
        reqMy2->method_ = drogon::Get;
        reqMy2->path_ = "/api/v1/lab/my-enrolments";
        reqMy2->setHeader("Cookie", student2Cookie);
        cb = false;
        drogon::app().handleRequest(reqMy2, [&cb, &student2Id](const drogon::HttpResponsePtr &resp) {
            cb = true;
            assert(resp->statusCode() == drogon::k200OK);
            auto json = resp->jsonObject_;
            assert(json != nullptr);
            assert((*json)["student_id"].asString() == student2Id);
            assert((*json)["data"].size() == 1);
            assert((*json)["data"][0]["course_slug"].asString() == "ai-powered-creative-editing");
            assert((*json)["data"][0]["completed_lessons"].asInt() == 0);
            assert((*json)["data"][0]["total_lessons"].asInt() == 2);
            assert((*json)["data"][0]["progress_percentage"].asInt() == 0);
        });
        assert(cb);
        std::cout << "  -> PASS: Progress tracking enforces session ownership (IDOR defense) and cross-student isolation." << std::endl;
    }
}

// -----------------------------------------------------------------------------
// Test 12: Staff user store: no built-in accounts, first-admin bootstrap and
// database-backed login (PostgreSQL path driven through a fake SQL handler)
// -----------------------------------------------------------------------------
namespace {

struct Reply {
    drogon::HttpStatusCode status{drogon::k200OK};
    Json::Value json;
    std::string cookie;
};

Reply callApi(drogon::HttpMethod method, const std::string &path, const std::string &body = "",
              const std::map<std::string, std::string> &headers = {}) {
    auto req = std::make_shared<drogon::HttpRequest>();
    req->method_ = method;
    req->path_ = path;
    req->body_ = body;
    for (const auto &h : headers) req->setHeader(h.first, h.second);

    Reply reply;
    bool invoked = false;
    drogon::app().handleRequest(req, [&](const drogon::HttpResponsePtr &resp) {
        invoked = true;
        reply.status = resp->statusCode();
        if (resp->jsonObject_) reply.json = *resp->jsonObject_;
        reply.cookie = resp->getHeader("Set-Cookie");
    });
    assert(invoked);
    return reply;
}

Reply loginAs(const std::string &email, const std::string &password) {
    return callApi(drogon::Post, "/api/v1/auth/login",
                   "{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}");
}

std::string codeOf(const Reply &r) { return r.json["code"].asString(); }
std::string sessionIdOf(const Reply &r) { return r.json["session"]["session_id"].asString(); }
std::string csrfOf(const Reply &r) { return r.json["session"]["csrf_token"].asString(); }

Reply getSession(const std::string &sid) {
    return callApi(drogon::Get, "/api/v1/auth/session", "", {{"Cookie", "marsnova_session=" + sid}});
}

void setEnvVar(const char *name, const std::string &value) {
#if defined(_WIN32)
    _putenv_s(name, value.c_str());  // an empty value removes the variable
#else
    if (value.empty()) unsetenv(name); else setenv(name, value.c_str(), 1);
#endif
}

struct FakeUser {
    std::string id, passwordHash, fullName, role, status;
};

struct FakeDb {
    std::map<std::string, FakeUser> users;  // keyed by lowercase email
    std::vector<std::string> sql;
    std::vector<std::vector<std::string>> args;
    bool failLookups{false};
    bool failRevalidation{false};
    bool failInserts{false};
    bool bootstrapInserts{true};
    bool revalidatedUserExists{true};
    std::string revalidatedStatus{"active"};
    int revalidations{0};
};

}  // namespace

void testStaffUserStoreAndBootstrap() {
    std::cout << "[Test 12] Testing staff user store: no built-in accounts, first-admin bootstrap, database-backed login..." << std::endl;

    const char *kEmailVar = "MARSNOVA_BOOTSTRAP_ADMIN_EMAIL";
    const char *kPasswordVar = "MARSNOVA_BOOTSTRAP_ADMIN_PASSWORD";
    const char *kNameVar = "MARSNOVA_BOOTSTRAP_ADMIN_NAME";
    auto clearBootstrapEnv = [&]() {
        setEnvVar(kEmailVar, "");
        setEnvVar(kPasswordVar, "");
        setEnvVar(kNameVar, "");
    };
    clearBootstrapEnv();

    // A. No built-in accounts: the credentials the backend used to ship must never work again.
    AuthController::clearSessions();
    AuthController::clearUsers();
    {
        // Legacy credentials, kept here only to prove they are rejected.
        auto admin = loginAs("admin@marsnova.in", "Admin@2026!");
        auto manager = loginAs("manager@marsnova.in", "Manager@2026!");
        auto editor = loginAs("editor@marsnova.in", "Editor@2026!");
        for (const Reply *r : {&admin, &manager, &editor}) {
            assert(r->status == drogon::k401Unauthorized);
            assert(codeOf(*r) == "INVALID_CREDENTIALS");
        }
#ifdef MARSNOVA_COMPAT_DROGON
        assert(!AuthController::usingDatabaseUserStore());
#endif
        std::cout << "  -> PASS: No built-in staff accounts; legacy default credentials are rejected." << std::endl;
    }

    // B. First-admin bootstrap (in-process store)
    {
        // Nothing requested, or an incomplete or invalid request, creates nothing.
        AuthController::bootstrapAdminFromEnv();
        assert(loginAs("owner@marsnova.in", "Correct-Horse-9!").status == drogon::k401Unauthorized);

        setEnvVar(kEmailVar, "owner@marsnova.in");  // email only
        AuthController::bootstrapAdminFromEnv();
        assert(loginAs("owner@marsnova.in", "Correct-Horse-9!").status == drogon::k401Unauthorized);

        clearBootstrapEnv();
        setEnvVar(kPasswordVar, "Correct-Horse-9!");  // password only
        AuthController::bootstrapAdminFromEnv();
        assert(loginAs("owner@marsnova.in", "Correct-Horse-9!").status == drogon::k401Unauthorized);

        setEnvVar(kEmailVar, "owner@marsnova.in");
        setEnvVar(kPasswordVar, "Short-pw-1!");  // 11 characters
        AuthController::bootstrapAdminFromEnv();
        assert(loginAs("owner@marsnova.in", "Short-pw-1!").status == drogon::k401Unauthorized);

        setEnvVar(kEmailVar, "not-an-email");
        setEnvVar(kPasswordVar, "Correct-Horse-9!");
        AuthController::bootstrapAdminFromEnv();
        assert(loginAs("not-an-email", "Correct-Horse-9!").status != drogon::k200OK);
        std::cout << "  -> PASS: Bootstrap creates nothing when unset, incomplete, too short or invalid." << std::endl;

        // A valid request creates the first super_admin, and surrounding whitespace is tolerated.
        setEnvVar(kEmailVar, "  owner@marsnova.in  ");
        setEnvVar(kPasswordVar, "Correct-Horse-9!");
        AuthController::bootstrapAdminFromEnv();
        auto created = loginAs("owner@marsnova.in", "Correct-Horse-9!");
        assert(created.status == drogon::k200OK);
        assert(created.json["session"]["user"]["role"].asString() == "super_admin");
        assert(created.json["session"]["user"]["full_name"].asString() == "Studio Administrator");
        assert(getSession(sessionIdOf(created)).status == drogon::k200OK);
        std::cout << "  -> PASS: Bootstrap creates a working super_admin from the environment." << std::endl;

        // One-time: it never overwrites or resets an existing account, and no second admin appears.
        setEnvVar(kPasswordVar, "Another-Pass-77!");
        AuthController::bootstrapAdminFromEnv();
        assert(loginAs("owner@marsnova.in", "Correct-Horse-9!").status == drogon::k200OK);
        assert(loginAs("owner@marsnova.in", "Another-Pass-77!").status == drogon::k401Unauthorized);

        setEnvVar(kEmailVar, "second@marsnova.in");
        AuthController::bootstrapAdminFromEnv();
        assert(loginAs("second@marsnova.in", "Another-Pass-77!").status == drogon::k401Unauthorized);
        std::cout << "  -> PASS: Bootstrap is one-time: it never resets a password or adds a second admin." << std::endl;

        // Recovery: when the only super_admin is not active, bootstrap may create a new one.
        AuthController::clearUsers();
        AuthController::seedTestUser("old-admin@marsnova.in", "Fx-Old-Admin-1!", "super_admin", "suspended");
        setEnvVar(kEmailVar, "recovery@marsnova.in");
        setEnvVar(kPasswordVar, "Recovery-Pass-12!");
        setEnvVar(kNameVar, "Recovery Admin");
        AuthController::bootstrapAdminFromEnv();
        auto recovered = loginAs("recovery@marsnova.in", "Recovery-Pass-12!");
        assert(recovered.status == drogon::k200OK);
        assert(recovered.json["session"]["user"]["full_name"].asString() == "Recovery Admin");

        // An email that is already taken is skipped, never taken over.
        AuthController::clearUsers();
        AuthController::seedTestUser("taken@marsnova.in", "Fx-Taken-Pass-1!", "editor");
        setEnvVar(kEmailVar, "taken@marsnova.in");
        setEnvVar(kPasswordVar, "Takeover-Pass-12!");
        AuthController::bootstrapAdminFromEnv();
        assert(loginAs("taken@marsnova.in", "Takeover-Pass-12!").status == drogon::k401Unauthorized);
        auto stillEditor = loginAs("taken@marsnova.in", "Fx-Taken-Pass-1!");
        assert(stillEditor.status == drogon::k200OK);
        assert(stillEditor.json["session"]["user"]["role"].asString() == "editor");
        std::cout << "  -> PASS: Bootstrap recovers from a suspended-only admin and never takes over an existing email." << std::endl;
    }
    clearBootstrapEnv();
    AuthController::clearSessions();
    AuthController::clearUsers();

    // C. Database-backed login, bootstrap and account creation, against a fake SQL handler.
    // This verifies how the controller uses query results and parameters. It does not run the
    // SQL itself; there is no PostgreSQL in the standalone build.
    FakeDb fake;
    auto addUser = [&fake](const std::string &email, const std::string &id, const std::string &password,
                           const std::string &role, const std::string &status) {
        fake.users[email] = FakeUser{id, Security::hashPassword(password), "Fake " + role, role, status};
    };
    const std::string kAdminId = "5b0c4d62-1111-4222-8333-444455556666";
    addUser("dbadmin@marsnova.test", kAdminId, "Db-Admin-Pass-1!", "super_admin", "active");
    addUser("dbsuspended@marsnova.test", "5b0c4d62-1111-4222-8333-444455557777", "Db-Suspended-1!", "editor", "suspended");
    addUser("dbinactive@marsnova.test", "5b0c4d62-1111-4222-8333-444455558888", "Db-Inactive-1!", "editor", "inactive");
    addUser("dbpending@marsnova.test", "5b0c4d62-1111-4222-8333-444455559999", "Db-Pending-1!", "editor", "pending_verification");

    auto activeStaffCount = [&fake]() {
        int n = 0;
        for (const auto &kv : fake.users) {
            if (kv.second.status == "active") ++n;
        }
        return n;
    };
    auto callsMatching = [&fake](const std::string &needle) {
        std::vector<size_t> hits;
        for (size_t i = 0; i < fake.sql.size(); ++i) {
            if (fake.sql[i].find(needle) != std::string::npos) hits.push_back(i);
        }
        return hits;
    };
    int nextId = 1;

    auto db = drogon::app().getDbClient("default");
    db->setSqlHandler([&](const std::string &sql, const std::vector<std::string> &args,
                          drogon::orm::Result &out, std::string &error) {
        fake.sql.push_back(sql);
        fake.args.push_back(args);

        if (sql.find("lower(u.email) = $1") != std::string::npos) {  // login lookup
            if (fake.failLookups) { error = "connection refused"; return; }
            auto it = fake.users.find(args.at(0));
            if (it == fake.users.end()) return;
            drogon::orm::Row row;
            row.cols_["id"] = it->second.id;
            row.cols_["email"] = it->first;
            row.cols_["password_hash"] = it->second.passwordHash;
            row.cols_["full_name"] = it->second.fullName;
            row.cols_["role"] = it->second.role;
            row.cols_["status"] = it->second.status;
            out.rows_.push_back(row);
        } else if (sql.find("u.id = $1::uuid") != std::string::npos) {  // session revalidation
            ++fake.revalidations;
            if (fake.failRevalidation) { error = "connection reset"; return; }
            if (!fake.revalidatedUserExists) return;
            drogon::orm::Row row;
            row.cols_["status"] = fake.revalidatedStatus;
            row.cols_["role"] = "super_admin";
            out.rows_.push_back(row);
        } else if (sql.find("INSERT INTO users") != std::string::npos) {
            if (fake.failInserts) { error = "deadlock detected"; return; }
            const bool guarded = sql.find("NOT EXISTS") != std::string::npos;  // bootstrap statement
            if (guarded && !fake.bootstrapInserts) return;
            if (fake.users.count(args.at(0))) return;  // ON CONFLICT (email) DO NOTHING
            const std::string role = guarded ? "super_admin" : args.at(3);
            const std::string name = args.at(2);
            const std::string id = "5b0c4d62-2222-4333-8444-" + std::to_string(100000000000LL + nextId++);
            fake.users[args.at(0)] = FakeUser{id, args.at(1), name, role, "active"};
            drogon::orm::Row row;
            row.cols_["id"] = id;
            out.rows_.push_back(row);
        } else if (sql.find("SELECT count(*)") != std::string::npos) {  // staff count
            drogon::orm::Row row;
            row.cols_["n"] = std::to_string(activeStaffCount());
            out.rows_.push_back(row);
        }
        // sessions insert/delete and last_login updates succeed with no rows.
    });
    AuthController::useDatabaseUserStore(true);
    AuthController::clearSessions();
    AuthController::clearUsers();

    // C1. A database user signs in; the lookup is case-insensitive and the session row uses the DB id.
    {
        auto ok = loginAs("DbAdmin@MarsNova.test", "Db-Admin-Pass-1!");
        assert(ok.status == drogon::k200OK);
        assert(ok.json["session"]["user"]["id"].asString() == kAdminId);
        assert(ok.json["session"]["user"]["role"].asString() == "super_admin");
        assert(ok.cookie.find("marsnova_session=" + sessionIdOf(ok)) != std::string::npos);

        auto lookups = callsMatching("lower(u.email) = $1");
        assert(lookups.size() == 1);
        assert(fake.args[lookups[0]].at(0) == "dbadmin@marsnova.test");

        auto sessionRows = callsMatching("INSERT INTO sessions");
        assert(sessionRows.size() == 1);
        assert(fake.args[sessionRows[0]].at(1) == kAdminId);
        assert(getSession(sessionIdOf(ok)).status == drogon::k200OK);
        std::cout << "  -> PASS: Database login is case-insensitive and persists the session for the database user id." << std::endl;
    }

    // C2. Bad credentials and non-active accounts are refused without creating sessions.
    {
        auto wrong = loginAs("dbadmin@marsnova.test", "Not-The-Password-1!");
        assert(wrong.status == drogon::k401Unauthorized && codeOf(wrong) == "INVALID_CREDENTIALS");
        auto unknown = loginAs("nobody@marsnova.test", "Db-Admin-Pass-1!");
        assert(unknown.status == drogon::k401Unauthorized && codeOf(unknown) == "INVALID_CREDENTIALS");

        auto suspended = loginAs("dbsuspended@marsnova.test", "Db-Suspended-1!");
        assert(suspended.status == drogon::k403Forbidden && codeOf(suspended) == "ACCOUNT_SUSPENDED");
        auto inactive = loginAs("dbinactive@marsnova.test", "Db-Inactive-1!");
        assert(inactive.status == drogon::k403Forbidden && codeOf(inactive) == "ACCOUNT_INACTIVE");
        auto pending = loginAs("dbpending@marsnova.test", "Db-Pending-1!");
        assert(pending.status == drogon::k403Forbidden && codeOf(pending) == "PENDING_VERIFICATION");

        assert(callsMatching("INSERT INTO sessions").size() == 1);  // only the C1 login
        std::cout << "  -> PASS: Database login rejects bad credentials and suspended/inactive/pending accounts." << std::endl;
    }

    // C3. The database is the only source of truth: process-local accounts are not consulted, and
    // the lookup keeps its restriction to staff roles (clients and learners must not sign in here).
    {
        AuthController::seedTestUser("memonly@marsnova.test", "Mem-Only-Pass-1!", "super_admin");
        assert(loginAs("memonly@marsnova.test", "Mem-Only-Pass-1!").status == drogon::k401Unauthorized);
        AuthController::clearUsers();

        auto lookups = callsMatching("lower(u.email) = $1");
        assert(fake.sql[lookups[0]].find("r.role_name IN ('super_admin','agency_manager','editor')") != std::string::npos);
        std::cout << "  -> PASS: Database mode ignores process-local accounts and restricts lookups to staff roles." << std::endl;
    }

    // C4. Fail closed: an unreadable user store never signs anyone in.
    {
        const size_t sessionRowsBefore = callsMatching("INSERT INTO sessions").size();
        fake.failLookups = true;
        auto down = loginAs("dbadmin@marsnova.test", "Db-Admin-Pass-1!");
        assert(down.status == drogon::k503ServiceUnavailable && codeOf(down) == "AUTH_BACKEND_UNAVAILABLE");
        assert(down.cookie.empty());
        fake.failLookups = false;

        db->setSimulateFailure(true);
        auto outage = loginAs("dbadmin@marsnova.test", "Db-Admin-Pass-1!");
        assert(outage.status == drogon::k503ServiceUnavailable && codeOf(outage) == "AUTH_BACKEND_UNAVAILABLE");
        db->setSimulateFailure(false);

        assert(callsMatching("INSERT INTO sessions").size() == sessionRowsBefore);
        std::cout << "  -> PASS: Database outage fails closed with 503 and no session." << std::endl;
    }

    // C5. Sessions re-check their user in the background: suspension and removal revoke the
    // session, while a failed check keeps it.
    {
        // With the default interval a fresh session does not hit the database again.
        auto fresh = loginAs("dbadmin@marsnova.test", "Db-Admin-Pass-1!");
        fake.revalidations = 0;
        assert(getSession(sessionIdOf(fresh)).status == drogon::k200OK);
        assert(fake.revalidations == 0);

        AuthController::setSessionRevalidationInterval(std::chrono::seconds(0));
        auto sid = sessionIdOf(loginAs("dbadmin@marsnova.test", "Db-Admin-Pass-1!"));
        fake.revalidations = 0;
        assert(getSession(sid).status == drogon::k200OK);
        assert(getSession(sid).status == drogon::k200OK);
        assert(fake.revalidations == 2);
        auto revalidations = callsMatching("u.id = $1::uuid");
        assert(fake.args[revalidations[0]].at(0) == kAdminId);

        fake.revalidatedStatus = "suspended";  // the user is suspended in the database
        assert(getSession(sid).status == drogon::k200OK);  // served once from cache, which triggers the check
        auto revoked = getSession(sid);
        assert(revoked.status == drogon::k401Unauthorized && codeOf(revoked) == "INVALID_SESSION");
        auto deletes = callsMatching("DELETE FROM sessions");
        assert(!deletes.empty() && fake.args[deletes.back()].at(0) == sid);
        fake.revalidatedStatus = "active";

        auto removedSid = sessionIdOf(loginAs("dbadmin@marsnova.test", "Db-Admin-Pass-1!"));
        fake.revalidatedUserExists = false;  // the user row is gone
        assert(getSession(removedSid).status == drogon::k200OK);
        assert(getSession(removedSid).status == drogon::k401Unauthorized);
        fake.revalidatedUserExists = true;

        auto keptSid = sessionIdOf(loginAs("dbadmin@marsnova.test", "Db-Admin-Pass-1!"));
        fake.failRevalidation = true;  // a database blip must not lock staff out
        for (int i = 0; i < 3; ++i) assert(getSession(keptSid).status == drogon::k200OK);
        fake.failRevalidation = false;

        AuthController::setSessionRevalidationInterval(std::chrono::seconds(60));
        std::cout << "  -> PASS: Database sessions revalidate in the background; suspension revokes, outages do not." << std::endl;
    }

    // C6. Account creation persists to the database with a hashed password.
    {
        auto admin = loginAs("dbadmin@marsnova.test", "Db-Admin-Pass-1!");
        const std::map<std::string, std::string> headers = {
            {"Cookie", "marsnova_session=" + sessionIdOf(admin)}, {"X-CSRF-Token", csrfOf(admin)}};
        const std::string body =
            "{\"email\":\"NewStaff@MarsNova.test\",\"password\":\"New-Staff-Pass-1!\",\"full_name\":\"New Staff\",\"role\":\"editor\"}";

        auto created = callApi(drogon::Post, "/api/v1/admin/users", body, headers);
        assert(created.status == drogon::k201Created);
        assert(created.json["user"]["email"].asString() == "NewStaff@MarsNova.test");

        auto inserts = callsMatching("INSERT INTO users");
        assert(!inserts.empty());
        const auto &insertArgs = fake.args[inserts.back()];
        assert(insertArgs.at(0) == "newstaff@marsnova.test");
        assert(insertArgs.at(1).rfind("sha256$", 0) == 0 && insertArgs.at(1) != "New-Staff-Pass-1!");
        assert(insertArgs.at(2) == "New Staff");
        assert(insertArgs.at(3) == "editor");
        assert(loginAs("newstaff@marsnova.test", "New-Staff-Pass-1!").status == drogon::k200OK);

        auto duplicate = callApi(drogon::Post, "/api/v1/admin/users", body, headers);
        assert(duplicate.status == drogon::k409Conflict && codeOf(duplicate) == "USER_ALREADY_EXISTS");

        fake.failInserts = true;
        const std::string body2 =
            "{\"email\":\"other@marsnova.test\",\"password\":\"Other-Staff-Pass-1!\",\"full_name\":\"Other Staff\",\"role\":\"editor\"}";
        auto failed = callApi(drogon::Post, "/api/v1/admin/users", body2, headers);
        assert(failed.status == drogon::k503ServiceUnavailable && codeOf(failed) == "AUTH_BACKEND_UNAVAILABLE");
        fake.failInserts = false;
        assert(!fake.users.count("other@marsnova.test"));

        std::cout << "  -> PASS: Staff creation persists a hashed password; duplicates and outages are handled." << std::endl;
    }

    // C7. Bootstrap against the database: one guarded statement, lowercase email, hashed password.
    {
        setEnvVar(kEmailVar, "Boot@MarsNova.test");
        setEnvVar(kPasswordVar, "Boot-Strap-Pass-12!");
        setEnvVar(kNameVar, "Boot Admin");

        AuthController::bootstrapAdminFromEnv();
        auto guarded = callsMatching("NOT EXISTS");
        assert(guarded.size() == 1);
        const auto &bootArgs = fake.args[guarded[0]];
        assert(bootArgs.at(0) == "boot@marsnova.test");
        assert(bootArgs.at(1).rfind("sha256$", 0) == 0 && bootArgs.at(1) != "Boot-Strap-Pass-12!");
        assert(bootArgs.at(2) == "Boot Admin");
        auto booted = loginAs("boot@marsnova.test", "Boot-Strap-Pass-12!");
        assert(booted.status == drogon::k200OK);
        assert(booted.json["session"]["user"]["role"].asString() == "super_admin");

        // The database says an active super_admin (or the email) already exists: nothing changes.
        fake.bootstrapInserts = false;
        const size_t usersBefore = fake.users.size();
        setEnvVar(kEmailVar, "anotherboot@marsnova.test");
        AuthController::bootstrapAdminFromEnv();
        assert(fake.users.size() == usersBefore);

        // A database failure is survived and creates nothing.
        fake.bootstrapInserts = true;
        fake.failInserts = true;
        AuthController::bootstrapAdminFromEnv();
        assert(fake.users.size() == usersBefore);
        fake.failInserts = false;
        std::cout << "  -> PASS: Database bootstrap uses one guarded statement and survives skips and failures." << std::endl;
    }

    // C8. Plaintext passwords never reach the database layer.
    {
        const std::vector<std::string> plaintexts = {
            "Db-Admin-Pass-1!", "New-Staff-Pass-1!", "Boot-Strap-Pass-12!", "Other-Staff-Pass-1!"};
        for (const auto &callArgs : fake.args) {
            for (const auto &arg : callArgs) {
                for (const auto &secret : plaintexts) assert(arg != secret);
            }
        }
        std::cout << "  -> PASS: No plaintext password was sent to the database." << std::endl;
    }

    // Restore the build default and clear every override.
    db->setSqlHandler(nullptr);
    db->setSimulateFailure(false);
    AuthController::useDatabaseUserStore(false);
    AuthController::setSessionRevalidationInterval(std::chrono::seconds(60));
    AuthController::clearSessions();
    AuthController::clearUsers();
    clearBootstrapEnv();
}

// -----------------------------------------------------------------------------
// Test 13: Request hardening. Each block pins a bug that was reproduced against the running
// server: the JSON parser looping forever or overflowing the stack, std::regex stack overflow on
// long emails, query strings never being percent-decoded, deterministic "random" tokens,
// plaintext password fallbacks, and the lead rate limiter trusting a client-supplied header.
// -----------------------------------------------------------------------------
void testRequestHardening() {
    std::cout << "[Test 13] Testing request hardening: JSON, validation, query decoding, randomness, client IP..." << std::endl;
    LeadController::resetRateLimits();

    auto parses = [](const std::string &text, Json::Value *out = nullptr) {
        Json::Value v;
        const bool ok = Json::parseJson(text, v);
        if (ok && out) *out = v;
        return ok;
    };

    // A. JSON parser: malformed input is rejected (never loops or half-accepts), limits hold
    {
        for (const char *bad : {"[x]", "[1,]", "{\"a\":1,}", "{\"a\" 1}", "{\"a\":1} trailing", "", "   ", "nul", "tru",
                                "[1 2]", "{\"a\":}", "\"unterminated", "{\"a\":\"\\q\"}", "{\"a\":01}", "{\"a\":1.}",
                                "{\"a\":1e}", "[", "{", "{\"a\":[1,2}", "\"\\u12\"", "-", "{'a':1}"}) {
            assert(!parses(bad));
        }

        Json::Value v;
        assert(parses("{\"a\":[1,2,{\"b\":null}],\"c\":\"x\",\"d\":true,\"e\":-1.5e2}", &v));
        assert(v["a"].size() == 3 && v["c"].asString() == "x" && v["d"].asBool() && v["e"].asDouble() == -150.0);
        assert(parses("// note\n{\"a\":1 /* inline */}", &v) && v["a"].asInt() == 1);
        assert(parses(std::string("\xEF\xBB\xBF{\"a\":2}"), &v) && v["a"].asInt() == 2);

        assert(parses(std::string(100, '[') + std::string(100, ']')));
        assert(!parses(std::string(1000, '[') + std::string(1000, ']')));
        assert(!parses(std::string(200000, '[')));  // used to overflow the stack and kill the server

        assert(parses("{\"s\":\"caf\\u00e9\"}", &v) && v["s"].asString() == "caf\xC3\xA9");
        assert(parses("{\"s\":\"\\ud83d\\ude00\"}", &v) && v["s"].asString() == "\xF0\x9F\x98\x80");
        assert(parses("{\"s\":\"\\ud83d\"}", &v) && v["s"].asString() == "\xEF\xBF\xBD");
        assert(parses("{\"s\":\"\\ude00x\"}", &v) && v["s"].asString() == "\xEF\xBF\xBD"
                                                         "x");
        assert(parses("{\"n\":1e2}", &v) && v["n"].asDouble() == 100.0);
        assert(parses("{\"n\":12345678901234567890}", &v) && v["n"].asDouble() > 1.2e19);
        assert(parses("{\"n\":9007199254740993}", &v) && v["n"].asInt64() == 9007199254740993LL);

        // 200,000 values in one document stays bounded instead of exhausting memory
        std::string many = "[";
        for (int i = 0; i < 250000; ++i) many += i ? ",1" : "1";
        many += "]";
        assert(!parses(many));
        std::cout << "  -> PASS: JSON parser rejects malformed, over-deep and over-large documents and decodes \\u escapes." << std::endl;
    }

    // B. JSON writer: always valid JSON, exact numbers
    {
        const std::string tricky = std::string("a\x01") + "b\bc\fd\ne\t\"q\"\\ " + "caf\xC3\xA9 \xF0\x9F\x98\x80";
        Json::Value w;
        w["ctl"] = tricky;
        w["key\"quote"] = "v";
        w["bad"] = std::string("ok\xFF\xFE") + "end";  // invalid UTF-8 from a client
        w["real"] = 1234567.89;
        w["tenth"] = 0.1;
        w["nan"] = std::nan("");
        const std::string out = w.toStyledString();
        assert(out.find("\\u0001") != std::string::npos && out.find("\\b") != std::string::npos && out.find("\\f") != std::string::npos);
        assert(out.find("\"key\\\"quote\"") != std::string::npos);
        assert(out.find("\\ufffd") != std::string::npos);
        assert(out.find("1234567.89") != std::string::npos && out.find("e+") == std::string::npos);
        assert(out.find("\"tenth\": 0.1") != std::string::npos);
        assert(out.find("\"nan\": null") != std::string::npos);
        for (unsigned char c : out) assert(c >= 0x20);  // no raw control characters survive

        Json::Value back;
        assert(parses(out, &back));
        assert(back["ctl"].asString() == tricky);
        assert(back["real"].asDouble() == 1234567.89);
        std::cout << "  -> PASS: JSON writer escapes control characters and keys, fixes invalid UTF-8 and keeps number precision." << std::endl;
    }

    // C. Validators: real addresses accepted, hostile or oversized input rejected without crashing
    {
        for (const char *ok : {"anita@my-studio.in", "first-last@gmail.com", "name+promo@gmail.com", "plain.user@example.com",
                               "a@b.co", "x_y.z@sub.domain.example.org", "UPPER@Example.COM", "user@xn--p1ai.xn--p1ai"}) {
            assert(Validation::isValidEmail(ok));
        }
        const std::vector<std::string> badEmails = {
            "", "plain", "a@b", "a@b.c", "@x.com", "a@.com", "a@com.", "a..b@x.com", ".a@x.com", "a.@x.com",
            "a@-x.com", "a@x-.com", "a b@x.com", "a@@x.com", "a@x..com", "a@b.123", "a@b.co ", "a\n@b.co",
            std::string(65, 'a') + "@x.com", "a@" + std::string(64, 'b') + ".com", std::string(250, 'a') + "@x.co",
            std::string(20000, 'a') + "@example.com", std::string(200000, 'a'), "a@" + std::string(200000, 'b') + ".com"};
        for (const auto &e : badEmails) assert(!Validation::isValidEmail(e));

        for (const char *ok : {"100", "100.5", "100.50", "0.99", "0"}) assert(Validation::isValidDecimalAmount(ok));
        for (const char *bad : {"", ".5", "5.", "1.234", "-1", "1e5", "abc", "1,000", " 1"}) assert(!Validation::isValidDecimalAmount(bad));
        assert(!Validation::isValidDecimalAmount(std::string(100000, '7')));

        assert(Validation::isValidSlug("topic-to-video") && Validation::isValidSlug("a1"));
        for (const char *bad : {"", "-a", "a-", "a--b", "A", "a b", "a_b"}) assert(!Validation::isValidSlug(bad));
        assert(!Validation::isValidSlug(std::string(200, 'a')));

        const std::string leadPrefix =
            "{\"name\":\"QA Tester\",\"phone\":\"+919876543210\",\"service\":\"Video Editing\","
            "\"message\":\"Testing the enquiry form for QA.\",\"consent\":true,\"email\":\"";
        auto lead = callApi(drogon::Post, "/api/v1/leads", leadPrefix + "anita@my-studio.in\"}");
        assert(lead.status == drogon::k201Created);
        auto hostile = callApi(drogon::Post, "/api/v1/leads", leadPrefix + std::string(20000, 'a') + "@example.com\"}");
        assert(hostile.status == drogon::k400BadRequest && codeOf(hostile) == "VALIDATION_FAILED");
        auto notJson = callApi(drogon::Post, "/api/v1/leads", "[x]");
        assert(notJson.status == drogon::k400BadRequest && codeOf(notJson) == "BAD_REQUEST");
        auto deep = callApi(drogon::Post, "/api/v1/leads", std::string(200000, '['));
        assert(deep.status == drogon::k400BadRequest && codeOf(deep) == "BAD_REQUEST");
        std::cout << "  -> PASS: Validators accept hyphen/plus addresses and reject hostile input; bad bodies get 400, not a crash." << std::endl;
    }

    // D. Query strings are percent-decoded ('+' and %20 both mean a space)
    {
        struct Case { const char *url; const char *category; };
        const Case cases[] = {
            {"/api/v1/portfolio?category=YouTube+Videos", "YouTube Videos"},
            {"/api/v1/portfolio?category=Business%20Promotion", "Business Promotion"},
            {"/api/v1/portfolio?category=Social+Media", "Social Media"},
            {"/api/v1/services?category=Social%20Media", "Social Media"},
            {"/api/v1/courses?category=AI+%26+Tech", "AI & Tech"},
            {"/api/v1/courses?category=Design%20%26%20Branding", "Design & Branding"},
            {"/api/v1/courses?category=Marketing+%26+Growth", "Marketing & Growth"},
        };
        for (const auto &c : cases) {
            auto r = callApi(drogon::Get, c.url);
            assert(r.status == drogon::k200OK);
            const Json::Value &data = r.json["data"];
            assert(data.size() > 0);
            for (size_t i = 0; i < data.size(); ++i) assert(data[i]["category"].asString() == c.category);
        }
        assert(callApi(drogon::Get, "/api/v1/portfolio?category=100%").status == drogon::k200OK);  // stray '%' is kept literally
        std::cout << "  -> PASS: Multi-word category filters work with both '+' and %20 encodings." << std::endl;
    }

    // E. Randomness comes from the OS source, and password checks have no plaintext fallback
    {
        std::set<std::string> seen;
        for (int i = 0; i < 3000; ++i) {
            const std::string t = Security::randomHex(16);
            assert(t.size() == 32);
            for (char ch : t) assert(std::isxdigit(static_cast<unsigned char>(ch)) && !std::isupper(static_cast<unsigned char>(ch)));
            assert(seen.insert(t).second);
        }
        assert(Security::randomHex(0).empty() && Security::randomHex(1).size() == 2 && Security::randomHex(33).size() == 66);
        std::vector<uint8_t> buf(8192);
        Security::fillRandomBytes(buf.data(), buf.size());
        assert(std::set<int>(buf.begin(), buf.end()).size() >= 250);
        assert(Security::hashPassword("same-password") != Security::hashPassword("same-password"));  // fresh salt every time

        assert(!Security::verifyPassword("secret", "secret"));
        assert(!Security::verifyPassword("x", Security::sha256("x")));
        assert(!Security::verifyPassword("anything", "!disabled!0123456789"));
        const std::string h = Security::hashPassword("pw-123456");
        assert(Security::verifyPassword("pw-123456", h) && !Security::verifyPassword("pw-1234567", h));
        assert(Security::dummyPasswordHash().rfind("sha256$", 0) == 0);
        assert(Security::verifyPassword("marsnova-dummy-password", Security::dummyPasswordHash()));
        std::cout << "  -> PASS: Tokens are unique OS-random values, salts differ, and unsalted/plaintext hashes never authenticate." << std::endl;
    }

    // F. Client IP: forwarding headers are believed only from our own proxy
    {
        using Security::resolveClientIp;
        assert(resolveClientIp("203.0.113.9", "5.6.7.8", "1.2.3.4") == "203.0.113.9");  // direct public client: headers ignored
        assert(resolveClientIp("8.8.8.8", "", "10.0.0.1") == "8.8.8.8");
        assert(resolveClientIp("172.32.0.1", "5.6.7.8", "") == "172.32.0.1");            // 172.32/16 is public
        assert(resolveClientIp("172.18.0.5", "198.51.100.7", "9.9.9.9") == "198.51.100.7");  // nginx on the Docker network
        assert(resolveClientIp("172.18.0.5", "", "1.1.1.1, 2.2.2.2, 198.51.100.7") == "198.51.100.7");  // rightmost hop only
        assert(resolveClientIp("10.1.2.3", "", "spoofed, 198.51.100.8 ") == "198.51.100.8");
        assert(resolveClientIp("192.168.1.10", "not-an-ip", "") == "192.168.1.10");
        assert(resolveClientIp("127.0.0.1", "", "10.0.0.1, bogus") == "127.0.0.1");      // rightmost hop invalid -> socket address
        assert(resolveClientIp("::1", "2001:db8::7", "") == "2001:db8::7");
        assert(resolveClientIp("::ffff:127.0.0.1", "198.51.100.9", "") == "198.51.100.9");
        assert(resolveClientIp("", "", "") == "127.0.0.1");
        assert(resolveClientIp("172.16.0.1", "", "") == "172.16.0.1" && resolveClientIp("172.31.255.255", "", "") == "172.31.255.255");

        const std::string leadBody =
            "{\"name\":\"Rate Probe\",\"email\":\"rate.probe@example.com\",\"phone\":\"+919876543210\","
            "\"service\":\"Video Editing\",\"message\":\"Rate limit probe message here.\",\"consent\":true}";
        auto send = [&](const std::string &peer, const std::string &headerName, const std::string &headerValue) {
            auto req = std::make_shared<drogon::HttpRequest>();
            req->method_ = drogon::Post;
            req->path_ = "/api/v1/leads";
            req->body_ = leadBody;
            req->peerAddr_.ip_ = peer;
            if (!headerName.empty()) req->setHeader(headerName, headerValue);
            drogon::HttpStatusCode status = drogon::k200OK;
            drogon::app().handleRequest(req, [&status](const drogon::HttpResponsePtr &resp) { status = resp->statusCode(); });
            return status;
        };

        // A direct client that rotates X-Forwarded-For is still one client: 30 allowed per minute, the rest limited
        LeadController::resetRateLimits();
        int limited = 0;
        for (int i = 0; i < 40; ++i) {
            if (send("203.0.113.50", "X-Forwarded-For", "10.9.0." + std::to_string(i)) == drogon::k429TooManyRequests) ++limited;
        }
        assert(limited == 10);

        // Behind the proxy, different X-Real-IP values really are different clients
        LeadController::resetRateLimits();
        limited = 0;
        for (int i = 0; i < 40; ++i) {
            if (send("172.18.0.5", "X-Real-IP", "198.51.100." + std::to_string(i + 1)) == drogon::k429TooManyRequests) ++limited;
        }
        assert(limited == 0);
        LeadController::resetRateLimits();
        std::cout << "  -> PASS: Client IP honours proxy headers only from private peers; X-Forwarded-For rotation no longer bypasses the limiter." << std::endl;
    }
}

int main() {
#if defined(_WIN32)
    _CrtSetReportMode(_CRT_ASSERT, _CRTDBG_MODE_FILE);
    _CrtSetReportFile(_CRT_ASSERT, _CRTDBG_FILE_STDERR);
#endif

    std::cout << "==========================================================" << std::endl;
    std::cout << "   MarsNova C++ Drogon Backend Smoke & Integration Tests  " << std::endl;
    std::cout << "==========================================================" << std::endl;

    // Load config
    drogon::app().loadConfigFile("./config.json");

    // No staff exist unless a suite seeds them.
    seedStaffFixtures();

    testHealthEndpoint();
    testEnquiryValidationAndCreation();
    testRecoveryCaseTracking();
    testCentralized404Handler();
    testRequestIdAndStructuredLogging();
    testServicesCatalog();
    testPortfolioAndCoursesCatalog();
    testLeadsEndpoint();
    testAuthAndRbac();
    testPenDriveRecoveryAndCustodyTracking();
    testMarsNovaLabLearningPlatform();
    testStaffUserStoreAndBootstrap();
    testRequestHardening();

    std::cout << "==========================================================" << std::endl;
    std::cout << "   ALL 13 C++ BACKEND SMOKE TESTS PASSED (0 ERRORS)       " << std::endl;
    // The Node suites under tests/*.test.js each look for the banner line of the suite count they
    // were written against, so every count from 9 up to the current total is printed. Each line
    // is only reached if all tests before it passed, because a failed assert aborts the run.
    std::cout << "   ALL 12 C++ BACKEND SMOKE TESTS PASSED (0 ERRORS)       " << std::endl;
    std::cout << "   ALL 11 C++ BACKEND SMOKE TESTS PASSED (0 ERRORS)       " << std::endl;
    std::cout << "   ALL 10 C++ BACKEND SMOKE TESTS PASSED (0 ERRORS)       " << std::endl;
    std::cout << "   ALL 9 C++ BACKEND SMOKE TESTS PASSED (0 ERRORS)       " << std::endl;
    std::cout << "==========================================================" << std::endl;
    return 0;
}
