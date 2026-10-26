#pragma once
// Marks the standalone compatibility build. Real Drogon does not define this, so
// code can tell whether a PostgreSQL-backed DbClient is actually available.
#define MARSNOVA_COMPAT_DROGON 1

#include <string>
#include <vector>
#include <map>
#include <memory>
#include <functional>
#include <iostream>
#include <sstream>
#include <chrono>
#include <random>
#include <algorithm>
#include <cctype>
#include "../json/json.h"
#include "../trantor/utils/Date.h"

namespace drogon {

inline bool iequals(const std::string &a, const std::string &b) {
    if (a.size() != b.size()) return false;
    return std::equal(a.begin(), a.end(), b.begin(), [](char c1, char c2) {
        return std::tolower(static_cast<unsigned char>(c1)) == std::tolower(static_cast<unsigned char>(c2));
    });
}

enum HttpMethod {
    Get = 0,
    Post,
    Head,
    Put,
    Delete,
    Options,
    Patch
};

enum HttpStatusCode {
    kUnknown = 0,
    k200OK = 200,
    k201Created = 201,
    k204NoContent = 204,
    k400BadRequest = 400,
    k401Unauthorized = 401,
    k403Forbidden = 403,
    k404NotFound = 404,
    k409Conflict = 409,
    k422UnprocessableEntity = 422,
    k429TooManyRequests = 429,
    k500InternalServerError = 500,
    k502BadGateway = 502,
    k503ServiceUnavailable = 503
};

class PeerAddr {
public:
    std::string ip_{"127.0.0.1"};
    std::string toIp() const { return ip_; }
};

class Attributes {
public:
    std::map<std::string, std::string> data_;
    void set(const std::string &k, const std::string &v) { data_[k] = v; }
    std::string get(const std::string &k) const {
        auto it = data_.find(k);
        return (it != data_.end()) ? it->second : "";
    }
};

class HttpRequest {
public:
    HttpMethod method_{Get};
    std::string path_{"/"};
    std::string query_{""};
    std::map<std::string, std::string> headers_;
    std::map<std::string, std::string> parameters_;
    std::string body_{""};
    std::shared_ptr<Json::Value> jsonPtr_{nullptr};
    PeerAddr peerAddr_{};
    std::shared_ptr<Attributes> attributes_{std::make_shared<Attributes>()};
    std::chrono::system_clock::time_point startTime_{std::chrono::system_clock::now()};

    HttpMethod method() const { return method_; }
    const std::string &path() const { return path_; }
    const std::string &query() const { return query_; }
    
    std::string getHeader(const std::string &key) const {
        for (const auto &kv : headers_) {
            if (iequals(kv.first, key)) {
                return kv.second;
            }
        }
        return "";
    }

    void setHeader(const std::string &k, const std::string &v) {
        headers_[k] = v;
    }

    const PeerAddr &peerAddr() const { return peerAddr_; }

    std::shared_ptr<Json::Value> jsonObject() const {
        if (jsonPtr_) return jsonPtr_;
        if (!body_.empty()) {
            auto val = std::make_shared<Json::Value>();
            if (Json::parseJson(body_, *val)) {
                const_cast<HttpRequest*>(this)->jsonPtr_ = val;
                return val;
            }
        }
        return nullptr;
    }

    std::shared_ptr<Attributes> attributes() const { return attributes_; }
    void setParameter(const std::string &k, const std::string &v) { parameters_[k] = v; }
    std::string getParameter(const std::string &k) const {
        auto it = parameters_.find(k);
        return it != parameters_.end() ? it->second : "";
    }
};

using HttpRequestPtr = std::shared_ptr<HttpRequest>;

class HttpResponse {
public:
    HttpStatusCode statusCode_{k200OK};
    std::string statusMessage_{"OK"};
    std::map<std::string, std::string> headers_;
    std::string body_{""};
    std::shared_ptr<Json::Value> jsonObject_{nullptr};

    static std::shared_ptr<HttpResponse> newHttpResponse() {
        auto resp = std::make_shared<HttpResponse>();
        resp->statusCode_ = k200OK;
        resp->statusMessage_ = "OK";
        return resp;
    }

    static std::shared_ptr<HttpResponse> newHttpJsonResponse(const Json::Value &json) {
        auto resp = std::make_shared<HttpResponse>();
        resp->statusCode_ = k200OK;
        resp->statusMessage_ = "OK";
        resp->headers_["Content-Type"] = "application/json; charset=utf-8";
        resp->jsonObject_ = std::make_shared<Json::Value>(json);
        resp->body_ = json.toStyledString();
        return resp;
    }

    void setStatusCode(HttpStatusCode code) {
        statusCode_ = code;
        switch (code) {
            case k200OK: statusMessage_ = "OK"; break;
            case k201Created: statusMessage_ = "Created"; break;
            case k204NoContent: statusMessage_ = "No Content"; break;
            case k400BadRequest: statusMessage_ = "Bad Request"; break;
            case k401Unauthorized: statusMessage_ = "Unauthorized"; break;
            case k403Forbidden: statusMessage_ = "Forbidden"; break;
            case k404NotFound: statusMessage_ = "Not Found"; break;
            case k500InternalServerError: statusMessage_ = "Internal Server Error"; break;
            default: statusMessage_ = "Status " + std::to_string(static_cast<int>(code)); break;
        }
    }

    HttpStatusCode statusCode() const { return statusCode_; }
    void addHeader(const std::string &k, const std::string &v) {
        headers_[k] = v;
    }

    std::string getHeader(const std::string &k) const {
        for (const auto &kv : headers_) {
            if (iequals(kv.first, k)) return kv.second;
        }
        return "";
    }

    void setBody(const std::string &b) { body_ = b; }
    const std::string &body() const { return body_; }
};

using HttpResponsePtr = std::shared_ptr<HttpResponse>;

namespace orm {

class ExceptionBase {
public:
    std::string msg_;
    ExceptionBase(const std::string &m) : msg_(m) {}
    const char *what() const { return msg_.c_str(); }
};

class DrogonDbException {
public:
    ExceptionBase base_;
    DrogonDbException(const std::string &m) : base_(m) {}
    const ExceptionBase &base() const { return base_; }
};

class RowField {
public:
    std::string val_;
    RowField(const std::string &v = "") : val_(v) {}
    bool isNull() const { return val_.empty(); }
    template<typename T>
    T as() const {
        std::istringstream ss(val_);
        T res{};
        ss >> res;
        return res;
    }
};

template<>
inline std::string RowField::as<std::string>() const { return val_; }

template<>
inline int RowField::as<int>() const {
    try { return std::stoi(val_); } catch (...) { return 0; }
}

class Row {
public:
    std::map<std::string, std::string> cols_;
    RowField operator[](const std::string &col) const {
        auto it = cols_.find(col);
        return RowField(it != cols_.end() ? it->second : "");
    }
};

class Result {
public:
    std::vector<Row> rows_;
    auto begin() const { return rows_.begin(); }
    auto end() const { return rows_.end(); }
    size_t size() const { return rows_.size(); }
    bool empty() const { return rows_.empty(); }
    const Row &operator[](size_t i) const { return rows_[i]; }
};

class DbClient {
public:
    bool simulateFailure_{false};
    void setSimulateFailure(bool fail) { simulateFailure_ = fail; }

    // Test hook (not part of real Drogon): lets a test answer SQL itself. Return an empty
    // `error` to deliver `out` to the success callback, or set `error` to fail the query.
    using SqlHandler = std::function<void(const std::string &sql,
                                          const std::vector<std::string> &args,
                                          Result &out,
                                          std::string &error)>;
    SqlHandler sqlHandler_;
    void setSqlHandler(SqlHandler handler) { sqlHandler_ = std::move(handler); }

    virtual ~DbClient() = default;

    template<typename... Args>
    void execSqlAsync(
        const std::string &sql,
        std::function<void(const Result &)> &&successCallback,
        std::function<void(const DrogonDbException &)> &&errorCallback,
        Args&&... args
    ) {
        if (simulateFailure_) {
            if (errorCallback) {
                errorCallback(DrogonDbException("Simulated PostgreSQL connection failure: server closed the connection unexpectedly"));
            }
            return;
        }

        if (sqlHandler_) {
            std::vector<std::string> boundArgs;
            (boundArgs.push_back(stringifyArg(args)), ...);
            Result handled;
            std::string error;
            sqlHandler_(sql, boundArgs, handled, error);
            if (!error.empty()) {
                if (errorCallback) errorCallback(DrogonDbException(error));
            } else if (successCallback) {
                successCallback(handled);
            }
            return;
        }

        Result r;
        Row row;
        static uint64_t counter = 1000;
        std::string genId = "00000000-0000-4000-a000-" + std::to_string(++counter);
        row.cols_["id"] = genId;
        row.cols_["case_id"] = "MN-REC-8291";
        row.cols_["customer_name"] = "Verified Client";
        row.cols_["device_type"] = "SanDisk Ultra 64GB USB 3.0";
        row.cols_["issue_type"] = "Corrupted Master Boot Record";
        row.cols_["current_stage"] = "file_recovery";
        row.cols_["stage_title"] = "NAND Readout & File System Carving";
        row.cols_["progress_percentage"] = "80";
        row.cols_["files_recovered_count"] = "1248";
        row.cols_["data_size_recovered_mb"] = "14200.8";
        row.cols_["diagnostic_notes"] = "Healthy NAND read";
        row.cols_["created_at"] = "2026-10-21T10:00:00Z";
        row.cols_["updated_at"] = "2026-10-23T08:30:00Z";
        r.rows_.push_back(row);

        if (successCallback) {
            successCallback(r);
        }
    }

private:
    template<typename T>
    static std::string stringifyArg(const T &value) {
        std::ostringstream ss;
        ss << value;
        return ss.str();
    }
};

using DbClientPtr = std::shared_ptr<DbClient>;

} // namespace orm

class HttpAppFramework {
public:
    std::string configPath_{""};
    Json::Value config_{Json::objectValue};
    std::shared_ptr<orm::DbClient> dbClient_{std::make_shared<orm::DbClient>()};
    std::vector<std::function<void(const HttpRequestPtr &)>> beginningAdvices_;
    std::vector<std::function<void(const HttpRequestPtr &, const HttpResponsePtr &)>> postHandlingAdvices_;
    std::function<void(const HttpRequestPtr &, std::function<void(const HttpResponsePtr &)> &&)> custom404Handler_;

    static HttpAppFramework &instance() {
        static HttpAppFramework app;
        return app;
    }

    void loadConfigFile(const std::string &path);
    void registerBeginningAdvice(std::function<void(const HttpRequestPtr &)> &&advice) {
        beginningAdvices_.push_back(std::move(advice));
    }
    void registerPostHandlingAdvice(std::function<void(const HttpRequestPtr &, const HttpResponsePtr &)> &&advice) {
        postHandlingAdvices_.push_back(std::move(advice));
    }
    void setCustom404Page(std::function<void(const HttpRequestPtr &, std::function<void(const HttpResponsePtr &)> &&)> &&handler) {
        custom404Handler_ = std::move(handler);
    }
    std::shared_ptr<orm::DbClient> getDbClient(const std::string &name = "default") {
        return dbClient_;
    }
    const Json::Value &getCustomConfig() const {
        return config_["custom_config"];
    }

    void run();
    void handleRequest(const HttpRequestPtr &req, std::function<void(const HttpResponsePtr &)> &&cb);
};

inline HttpAppFramework &app() {
    return HttpAppFramework::instance();
}

} // namespace drogon
