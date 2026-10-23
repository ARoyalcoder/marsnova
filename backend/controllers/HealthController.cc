#include "HealthController.h"
#include <drogon/drogon.h>

void HealthController::checkHealth(const drogon::HttpRequestPtr &req,
                                   std::function<void(const drogon::HttpResponsePtr &)> &&callback) {
    if (req->method() == drogon::Options) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        callback(resp);
        return;
    }

    std::string reqId = req->attributes()->get("request_id");
    if (reqId.empty()) {
        reqId = req->getHeader("X-Request-Id");
    }

    Json::Value json;
    json["status"] = "online";
    json["service"] = "MarsNova C++ Drogon API";
    json["version"] = "1.0.0";
    json["timestamp"] = trantor::Date::now().toFormattedString(false);
    if (!reqId.empty()) {
        json["request_id"] = reqId;
    }

    auto dbClient = drogon::app().getDbClient("default");
    json["database"]["status"] = dbClient ? "connected" : "unavailable";
    json["database"]["client"] = "default";

    auto resp = drogon::HttpResponse::newHttpJsonResponse(json);
    callback(resp);
}
