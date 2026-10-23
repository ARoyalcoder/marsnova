#include <drogon/drogon.h>
#include <iostream>
#include <chrono>
#include <iomanip>

int main() {
    std::cout << "[MarsNova] Initializing Drogon Backend Server..." << std::endl;
    
    // 1. Load Drogon configuration with environment overrides (keeping secrets out of source control)
    drogon::app().loadConfigFile("./config.json");
    
    // 2. Request ID Generation & Injection (Beginning Advice)
    drogon::app().registerBeginningAdvice([](const drogon::HttpRequestPtr &req) {
        std::string reqId = req->getHeader("X-Request-Id");
        if (reqId.empty()) {
            auto now = std::chrono::duration_cast<std::chrono::microseconds>(
                std::chrono::system_clock::now().time_since_epoch()
            ).count();
            reqId = "req_" + std::to_string(now);
        }
        req->attributes()->set("request_id", reqId);
    });

    // 3. Centralized Post-Handling Advice: CORS, Security Headers, Request ID & Structured Logging
    drogon::app().registerPostHandlingAdvice([](const drogon::HttpRequestPtr &req, const drogon::HttpResponsePtr &resp) {
        std::string reqId = req->attributes()->get("request_id");
        if (reqId.empty()) reqId = req->getHeader("X-Request-Id");
        if (!reqId.empty()) {
            resp->addHeader("X-Request-Id", reqId);
        }

        // Standard CORS Headers
        std::string origin = req->getHeader("Origin");
        if (origin.empty()) origin = "*";
        resp->addHeader("Access-Control-Allow-Origin", origin);
        resp->addHeader("Access-Control-Allow-Credentials", "true");
        resp->addHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        resp->addHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, X-Request-Id, X-CSRF-Token, X-XSRF-Token");
        resp->addHeader("Access-Control-Expose-Headers", "X-Request-Id, Set-Cookie");
        resp->addHeader("X-Content-Type-Options", "nosniff");

        // Structured JSON Logging
        auto durationMs = std::chrono::duration<double, std::milli>(
            std::chrono::system_clock::now() - req->startTime_
        ).count();

        std::string methodStr = "GET";
        if (req->method() == drogon::Post) methodStr = "POST";
        else if (req->method() == drogon::Put) methodStr = "PUT";
        else if (req->method() == drogon::Delete) methodStr = "DELETE";
        else if (req->method() == drogon::Options) methodStr = "OPTIONS";
        else if (req->method() == drogon::Patch) methodStr = "PATCH";
        else if (req->method() == drogon::Head) methodStr = "HEAD";

        std::cout << "{\"timestamp\":\"" << trantor::Date::now().toFormattedString(false) << "\""
                  << ",\"level\":\"INFO\""
                  << ",\"request_id\":\"" << reqId << "\""
                  << ",\"method\":\"" << methodStr << "\""
                  << ",\"path\":\"" << req->path() << "\""
                  << ",\"status\":" << static_cast<int>(resp->statusCode())
                  << ",\"duration_ms\":" << std::fixed << std::setprecision(2) << durationMs
                  << ",\"ip\":\"" << req->peerAddr().toIp() << "\"}"
                  << std::endl;
    });

    // 4. Centralized Error Handling: JSON 404 Handler
    drogon::app().setCustom404Page([](const drogon::HttpRequestPtr &req, std::function<void(const drogon::HttpResponsePtr &)> &&callback) {
        std::string reqId = req->attributes()->get("request_id");
        if (reqId.empty()) reqId = req->getHeader("X-Request-Id");

        Json::Value err;
        err["error"] = "Endpoint not found";
        err["code"] = "NOT_FOUND";
        err["path"] = req->path();
        if (!reqId.empty()) err["request_id"] = reqId;

        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k404NotFound);
        callback(resp);
    });

    std::cout << "[MarsNova] Drogon Server listening on http://0.0.0.0:8080" << std::endl;
    drogon::app().run();
    return 0;
}
