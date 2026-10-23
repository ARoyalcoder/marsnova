#include "EnquiryController.h"
#include <drogon/drogon.h>
#include <regex>

static bool isValidEmail(const std::string &email) {
    const std::regex pattern(R"((\w+)(\.{1}\w+)*@(\w+)(\.{1}\w+)+)");
    return std::regex_match(email, pattern);
}

void EnquiryController::createEnquiry(const drogon::HttpRequestPtr &req,
                                      std::function<void(const drogon::HttpResponsePtr &)> &&callback) {
    if (req->method() == drogon::Options) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        callback(resp);
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
    std::string name = json.get("name", "").asString();
    std::string email = json.get("email", "").asString();
    std::string service = json.get("service", "").asString();
    std::string message = json.get("message", "").asString();
    std::string phone = json.get("phone", "").asString();

    // Validation
    if (name.empty() || name.length() < 2) {
        Json::Value err;
        err["error"] = "Name must be at least 2 characters long";
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

    if (service.empty()) {
        Json::Value err;
        err["error"] = "Please select a service";
        err["code"] = "VALIDATION_FAILED";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    if (message.empty() || message.length() < 5) {
        Json::Value err;
        err["error"] = "Message must be at least 5 characters long";
        err["code"] = "VALIDATION_FAILED";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    auto dbClient = drogon::app().getDbClient("default");
    if (!dbClient) {
        Json::Value res;
        res["success"] = true;
        res["status"] = "ok";
        res["message"] = "Enquiry recorded successfully";
        res["whatsapp_ready"] = true;
        if (!reqId.empty()) res["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
        resp->setStatusCode(drogon::k201Created);
        callback(resp);
        return;
    }

    // Parameterized DB insert
    std::string query = "INSERT INTO enquiries (full_name, email, phone, service_interest, message, ip_address) "
                        "VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at";

    dbClient->execSqlAsync(query,
        [callback, name, service, message, reqId](const drogon::orm::Result &r) {
            std::string enquiryId = r.empty() ? "" : r[0]["id"].as<std::string>();

            // Save audit log
            auto auditDb = drogon::app().getDbClient("default");
            if (auditDb && !enquiryId.empty()) {
                auditDb->execSqlAsync(
                    "INSERT INTO audit_logs (action, entity_table, entity_id, actor, details) "
                    "VALUES ('ENQUIRY_CREATED', 'enquiries', $1, 'public_web', $2)",
                    [](const drogon::orm::Result &) {},
                    [](const drogon::orm::DrogonDbException &) {},
                    enquiryId,
                    "{\"service\":\"" + service + "\"}"
                );
            }

            Json::Value res;
            res["success"] = true;
            res["status"] = "ok";
            res["enquiry_id"] = enquiryId;
            res["message"] = "Enquiry saved to database before WhatsApp dispatch";
            res["whatsapp_ready"] = true;
            if (!reqId.empty()) res["request_id"] = reqId;

            auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
            resp->setStatusCode(drogon::k201Created);
            callback(resp);
        },
        [callback, reqId](const drogon::orm::DrogonDbException &e) {
            Json::Value err;
            err["error"] = "Database error: " + std::string(e.base().what());
            err["code"] = "DATABASE_ERROR";
            if (!reqId.empty()) err["request_id"] = reqId;
            auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
            resp->setStatusCode(drogon::k500InternalServerError);
            callback(resp);
        },
        name, email, phone, service, message, req->peerAddr().toIp()
    );
}

void EnquiryController::listEnquiries(const drogon::HttpRequestPtr &req,
                                     std::function<void(const drogon::HttpResponsePtr &)> &&callback) {
    std::string reqId = req->attributes()->get("request_id");
    if (reqId.empty()) reqId = req->getHeader("X-Request-Id");

    auto dbClient = drogon::app().getDbClient("default");
    if (!dbClient) {
        Json::Value err;
        err["error"] = "Database client unavailable";
        err["code"] = "DATABASE_UNAVAILABLE";
        if (!reqId.empty()) err["request_id"] = reqId;
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k500InternalServerError);
        callback(resp);
        return;
    }

    dbClient->execSqlAsync(
        "SELECT id, full_name, email, phone, service_interest, message, status, created_at FROM enquiries ORDER BY created_at DESC LIMIT 50",
        [callback, reqId](const drogon::orm::Result &r) {
            Json::Value list(Json::arrayValue);
            for (const auto &row : r) {
                Json::Value item;
                item["id"] = row["id"].as<std::string>();
                item["full_name"] = row["full_name"].as<std::string>();
                item["email"] = row["email"].as<std::string>();
                item["phone"] = row["phone"].as<std::string>();
                item["service_interest"] = row["service_interest"].as<std::string>();
                item["message"] = row["message"].as<std::string>();
                item["status"] = row["status"].as<std::string>();
                item["created_at"] = row["created_at"].as<std::string>();
                list.append(item);
            }
            Json::Value res;
            res["status"] = "ok";
            res["count"] = static_cast<int>(list.size());
            res["data"] = list;
            if (!reqId.empty()) res["request_id"] = reqId;
            auto resp = drogon::HttpResponse::newHttpJsonResponse(res);
            callback(resp);
        },
        [callback, reqId](const drogon::orm::DrogonDbException &e) {
            Json::Value err;
            err["error"] = "Query execution failed: " + std::string(e.base().what());
            err["code"] = "DATABASE_ERROR";
            if (!reqId.empty()) err["request_id"] = reqId;
            auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
            resp->setStatusCode(drogon::k500InternalServerError);
            callback(resp);
        }
    );
}
