#include "drogon/drogon.h"
#include "../controllers/HealthController.h"
#include "../controllers/EnquiryController.h"
#include "../controllers/RecoveryController.h"
#include "../controllers/CatalogController.h"
#include "../controllers/LeadController.h"
#include "../controllers/AuthController.h"
#include "../controllers/LearningController.h"
#include "../utils/Security.h"
#include <iostream>
#include <fstream>
#include <cstdlib>
#include <cctype>
#include <atomic>
#include <random>
#include <chrono>
#include <thread>

#if defined(_WIN32)
#include <winsock2.h>
#include <ws2tcpip.h>
#pragma comment(lib, "ws2_32.lib")
#else
#include <sys/socket.h>
#include <sys/time.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#endif

namespace drogon {

static std::string generateRequestId() {
    // Not a secret, but it must not repeat after a restart (std::random_device is deterministic on
    // MinGW), so it comes from the operating system's random source like every other token.
    return "req_" + Security::randomHex(16);
}

// Percent-decoding for query strings (application/x-www-form-urlencoded, where '+' means space).
// The shim used to hand the raw text to the controllers, so "category=Social+Media" or
// "category=Business%20Promotion" never matched the stored value "Social Media" and every
// multi-word filter on the Services, Portfolio and Lab pages returned nothing.
static std::string urlDecode(const std::string &in) {
    auto hexVal = [](char c) -> int {
        if (c >= '0' && c <= '9') return c - '0';
        if (c >= 'a' && c <= 'f') return c - 'a' + 10;
        if (c >= 'A' && c <= 'F') return c - 'A' + 10;
        return -1;
    };
    std::string out;
    out.reserve(in.size());
    for (size_t i = 0; i < in.size(); ++i) {
        const char c = in[i];
        if (c == '+') {
            out.push_back(' ');
        } else if (c == '%' && i + 2 < in.size() && hexVal(in[i + 1]) >= 0 && hexVal(in[i + 2]) >= 0) {
            out.push_back(static_cast<char>(hexVal(in[i + 1]) * 16 + hexVal(in[i + 2])));
            i += 2;
        } else {
            out.push_back(c);
        }
    }
    return out;
}

void HttpAppFramework::loadConfigFile(const std::string &path) {
    configPath_ = path;
    std::ifstream f(path);
    if (!f.is_open() && (path == "./config.json" || path == "config.json")) {
        f.open("backend/config.json");
    }
    if (f.is_open()) {
        std::stringstream ss;
        ss << f.rdbuf();
        Json::parseJson(ss.str(), config_);
    }

    // Keep secrets out of source control: override config with environment variables
    const char *dbHost = std::getenv("DB_HOST");
    const char *dbPort = std::getenv("DB_PORT");
    const char *dbName = std::getenv("DB_NAME");
    const char *dbUser = std::getenv("DB_USER");
    const char *dbPass = std::getenv("DB_PASSWORD");
    const char *appPort = std::getenv("PORT");

    if (config_["db_clients"].isArray() && config_["db_clients"].size() > 0) {
        if (dbHost) config_["db_clients"][0]["host"] = dbHost;
        if (dbPort) config_["db_clients"][0]["port"] = std::stoi(dbPort);
        if (dbName) config_["db_clients"][0]["dbname"] = dbName;
        if (dbUser) config_["db_clients"][0]["user"] = dbUser;
        if (dbPass) config_["db_clients"][0]["passwd"] = dbPass;
    }

    if (appPort && config_["listeners"].isArray() && config_["listeners"].size() > 0) {
        config_["listeners"][0]["port"] = std::stoi(appPort);
    }
}

void HttpAppFramework::handleRequest(const HttpRequestPtr &req, std::function<void(const HttpResponsePtr &)> &&cb) {
    // 1. Beginning Advice: Request ID extraction or generation
    std::string reqId = req->getHeader("X-Request-Id");
    if (reqId.empty()) {
        reqId = generateRequestId();
    }
    req->attributes()->set("request_id", reqId);

    for (const auto &advice : beginningAdvices_) {
        advice(req);
    }

    auto wrappedCb = [this, req, reqId, userCb = std::move(cb)](const HttpResponsePtr &resp) {
        // Ensure X-Request-Id is on response
        resp->addHeader("X-Request-Id", reqId);

        // Execute post handling advices (CORS, custom headers, logging)
        for (const auto &advice : postHandlingAdvices_) {
            advice(req, resp);
        }

        // CORS is decided by the application's post-handling advice (main.cc), which checks the
        // request Origin against an allowlist. This used to echo ANY Origin back with
        // Access-Control-Allow-Credentials: true, which let any website make authenticated
        // cross-origin requests; the cors_allowed_origins setting was loaded but never read.
        userCb(resp);
    };

    // Parse query string into parameters
    const std::string &rawPath = req->path();
    size_t qIndex = rawPath.find('?');
    std::string p = (qIndex != std::string::npos) ? rawPath.substr(0, qIndex) : rawPath;
    std::string query = (qIndex != std::string::npos) ? rawPath.substr(qIndex + 1) : "";

    if (!query.empty()) {
        std::istringstream ss(query);
        std::string token;
        while (std::getline(ss, token, '&')) {
            size_t eq = token.find('=');
            if (eq != std::string::npos) {
                req->setParameter(urlDecode(token.substr(0, eq)), urlDecode(token.substr(eq + 1)));
            } else {
                req->setParameter(urlDecode(token), "");
            }
        }
    }

    HttpMethod m = req->method();

    // Universal preflight OPTIONS handler
    if (m == HttpMethod::Options) {
        auto resp = HttpResponse::newHttpResponse();
        resp->setStatusCode(k200OK);
        wrappedCb(resp);
        return;
    }

    // Favicon handler
    if (p == "/favicon.ico") {
        auto resp = HttpResponse::newHttpResponse();
        resp->setStatusCode(k204NoContent);
        wrappedCb(resp);
        return;
    }

    // 2. Dispatch to controllers
    if (p == "/api/v1/health") {
        HealthController ctrl;
        ctrl.checkHealth(req, std::move(wrappedCb));
        return;
    }

    if (p == "/api/v1/enquiries") {
        EnquiryController ctrl;
        if (m == HttpMethod::Post || m == HttpMethod::Options) {
            ctrl.createEnquiry(req, std::move(wrappedCb));
            return;
        } else if (m == HttpMethod::Get) {
            ctrl.listEnquiries(req, std::move(wrappedCb));
            return;
        }
    }

    if (p == "/api/v1/leads") {
        LeadController ctrl;
        if (m == HttpMethod::Post || m == HttpMethod::Options) {
            ctrl.createLead(req, std::move(wrappedCb));
            return;
        } else if (m == HttpMethod::Get) {
            ctrl.listLeads(req, std::move(wrappedCb));
            return;
        }
    }

    if (p.rfind("/api/v1/leads/", 0) == 0) {
        std::string sub = p.substr(std::string("/api/v1/leads/").length());
        LeadController ctrl;

        // POST /api/v1/leads/:id/notes
        size_t notesPos = sub.find("/notes");
        if (notesPos != std::string::npos) {
            std::string leadId = sub.substr(0, notesPos);
            ctrl.addLeadNote(req, std::move(wrappedCb), leadId);
            return;
        }

        // PATCH / PUT /api/v1/leads/:id/status
        size_t statusPos = sub.find("/status");
        if (statusPos != std::string::npos) {
            std::string leadId = sub.substr(0, statusPos);
            ctrl.updateLeadStatus(req, std::move(wrappedCb), leadId);
            return;
        }

        // GET /api/v1/leads/:id
        if (m == HttpMethod::Get) {
            ctrl.getLeadDetails(req, std::move(wrappedCb), sub);
            return;
        }
    }

    if (p == "/api/v1/auth/login") {
        AuthController ctrl;
        ctrl.login(req, std::move(wrappedCb));
        return;
    }

    if (p == "/api/v1/auth/logout") {
        AuthController ctrl;
        ctrl.logout(req, std::move(wrappedCb));
        return;
    }

    if (p == "/api/v1/auth/session" || p == "/api/v1/auth/me") {
        AuthController ctrl;
        ctrl.getSession(req, std::move(wrappedCb));
        return;
    }

    if (p == "/api/v1/admin/users") {
        AuthController ctrl;
        ctrl.createStaffUser(req, std::move(wrappedCb));
        return;
    }

    if (p == "/api/v1/services") {
        CatalogController ctrl;
        ctrl.getServices(req, std::move(wrappedCb));
        return;
    }

    if (p.rfind("/api/v1/services/", 0) == 0) {
        std::string slug = p.substr(std::string("/api/v1/services/").length());
        CatalogController ctrl;
        ctrl.getServiceBySlug(req, std::move(wrappedCb), slug);
        return;
    }

    if (p == "/api/v1/portfolio") {
        CatalogController ctrl;
        ctrl.getPortfolio(req, std::move(wrappedCb));
        return;
    }

    if (p == "/api/v1/courses") {
        CatalogController ctrl;
        ctrl.getCourses(req, std::move(wrappedCb));
        return;
    }

    if (p.rfind("/api/v1/courses/", 0) == 0) {
        std::string sub = p.substr(std::string("/api/v1/courses/").length());
        CatalogController ctrl;
        ctrl.getCourseBySlug(req, std::move(wrappedCb), sub);
        return;
    }

    if (p == "/api/v1/recovery/intake") {
        RecoveryController ctrl;
        ctrl.createCase(req, std::move(wrappedCb));
        return;
    }

    if (p.rfind("/api/v1/recovery/track/", 0) == 0) {
        std::string caseId = p.substr(std::string("/api/v1/recovery/track/").length());
        RecoveryController ctrl;
        ctrl.trackCase(req, std::move(wrappedCb), caseId);
        return;
    }

    if (p.rfind("/api/v1/recovery/", 0) == 0) {
        std::string caseId = p.substr(std::string("/api/v1/recovery/").length());
        RecoveryController ctrl;
        ctrl.trackCase(req, std::move(wrappedCb), caseId);
        return;
    }

    // MarsNova Lab Learning System Routes
    if (p == "/api/v1/lab/auth/register") {
        marsnova::LearningController ctrl;
        ctrl.registerStudent(req, std::move(wrappedCb));
        return;
    }

    if (p == "/api/v1/lab/auth/login") {
        marsnova::LearningController ctrl;
        ctrl.loginStudent(req, std::move(wrappedCb));
        return;
    }

    if (p == "/api/v1/lab/auth/logout") {
        marsnova::LearningController ctrl;
        ctrl.logoutStudent(req, std::move(wrappedCb));
        return;
    }

    if (p == "/api/v1/lab/auth/me") {
        marsnova::LearningController ctrl;
        ctrl.getStudentProfile(req, std::move(wrappedCb));
        return;
    }

    if (p == "/api/v1/lab/my-enrolments") {
        marsnova::LearningController ctrl;
        ctrl.getMyEnrolments(req, std::move(wrappedCb));
        return;
    }

    if (p.rfind("/api/v1/lab/courses/", 0) == 0) {
        std::string sub = p.substr(std::string("/api/v1/lab/courses/").length());
        size_t enrPos = sub.find("/enroll");
        if (enrPos != std::string::npos) {
            std::string slug = sub.substr(0, enrPos);
            marsnova::LearningController ctrl;
            ctrl.enrollInCourse(req, std::move(wrappedCb), slug);
            return;
        }

        size_t lesPos = sub.find("/lessons/");
        if (lesPos != std::string::npos) {
            std::string slug = sub.substr(0, lesPos);
            std::string lessonId = sub.substr(lesPos + std::string("/lessons/").length());
            marsnova::LearningController ctrl;
            ctrl.getLessonContent(req, std::move(wrappedCb), slug, lessonId);
            return;
        }
    }

    if (p.rfind("/api/v1/lab/lessons/", 0) == 0) {
        std::string sub = p.substr(std::string("/api/v1/lab/lessons/").length());
        size_t progPos = sub.find("/progress");
        if (progPos != std::string::npos) {
            std::string lessonId = sub.substr(0, progPos);
            marsnova::LearningController ctrl;
            ctrl.updateLessonProgress(req, std::move(wrappedCb), lessonId);
            return;
        }
    }

    // 3. Centralized 404 Handler
    if (custom404Handler_) {
        custom404Handler_(req, std::move(wrappedCb));
    } else {
        Json::Value err;
        err["error"] = "Endpoint not found";
        err["code"] = "NOT_FOUND";
        err["path"] = req->path();
        err["request_id"] = reqId;
        auto resp = HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(k404NotFound);
        wrappedCb(resp);
    }
}

// -----------------------------------------------------------------------------
// Connection handling limits. Every connection gets its own thread and the old reader accepted
// any header or body size with no timeout, so a few idle sockets or one huge Content-Length could
// exhaust threads or memory.
// -----------------------------------------------------------------------------
#if defined(_WIN32)
using SocketHandle = SOCKET;
#else
using SocketHandle = int;
#endif

static std::atomic<int> s_activeConnections{0};
static const int kMaxConnections = 256;
static const size_t kMaxHeaderBytes = 16 * 1024;
static const int kRecvTimeoutMs = 30000;

static void closeSocketHandle(SocketHandle fd) {
#if defined(_WIN32)
    closesocket(fd);
#else
    close(fd);
#endif
}

static void setRecvTimeout(SocketHandle fd, int ms);

// Closing a socket that still has unread request data makes TCP send a reset, and a reset can
// destroy the error response that was just written, so a client that sent too much would see a
// dropped connection instead of the 413/431 explaining why. Half-close first, then discard
// whatever is still arriving for a bounded time/size, then close.
static void gracefulClose(SocketHandle fd) {
#if defined(_WIN32)
    shutdown(fd, SD_SEND);
#else
    shutdown(fd, SHUT_WR);
#endif
    setRecvTimeout(fd, 1000);
    char sink[4096];
    size_t drained = 0;
    while (drained < (1u << 20)) {
        const int n = static_cast<int>(recv(fd, sink, sizeof(sink), 0));
        if (n <= 0) break;
        drained += static_cast<size_t>(n);
    }
    closeSocketHandle(fd);
}

static void setRecvTimeout(SocketHandle fd, int ms) {
#if defined(_WIN32)
    DWORD timeout = static_cast<DWORD>(ms);
    setsockopt(fd, SOL_SOCKET, SO_RCVTIMEO, reinterpret_cast<const char *>(&timeout), sizeof(timeout));
#else
    struct timeval tv;
    tv.tv_sec = ms / 1000;
    tv.tv_usec = (ms % 1000) * 1000;
    setsockopt(fd, SOL_SOCKET, SO_RCVTIMEO, &tv, sizeof(tv));
#endif
}

static void sendAll(SocketHandle fd, const std::string &data) {
    size_t sent = 0;
    while (sent < data.size()) {
        const int n = static_cast<int>(send(fd, data.data() + sent, static_cast<int>(data.size() - sent), 0));
        if (n <= 0) return;
        sent += static_cast<size_t>(n);
    }
}

static void sendSimpleResponse(SocketHandle fd, int status, const char *reason, const std::string &jsonBody) {
    std::ostringstream ss;
    ss << "HTTP/1.1 " << status << " " << reason << "\r\n"
       << "Content-Type: application/json; charset=utf-8\r\n"
       << "Content-Length: " << jsonBody.size() << "\r\n"
       << "Connection: close\r\n\r\n"
       << jsonBody;
    sendAll(fd, ss.str());
}

// Parses sizes such as "25M", "512k" or "1048576" (the format of client_max_body_size).
static size_t parseSizeLimit(const std::string &text, size_t fallback) {
    size_t i = 0;
    unsigned long long n = 0;
    bool any = false;
    while (i < text.size() && std::isdigit(static_cast<unsigned char>(text[i]))) {
        n = n * 10 + static_cast<unsigned long long>(text[i] - '0');
        any = true;
        ++i;
        if (n > (1ULL << 40)) return fallback;
    }
    if (!any) return fallback;
    unsigned long long multiplier = 1;
    if (i < text.size()) {
        const char unit = static_cast<char>(std::tolower(static_cast<unsigned char>(text[i])));
        if (unit == 'k') multiplier = 1024ULL;
        else if (unit == 'm') multiplier = 1024ULL * 1024ULL;
        else if (unit == 'g') multiplier = 1024ULL * 1024ULL * 1024ULL;
    }
    const unsigned long long total = n * multiplier;
    if (total == 0 || total > (1ULL << 31)) return fallback;
    return static_cast<size_t>(total);
}

void HttpAppFramework::run() {
    std::string host = "0.0.0.0";
    int port = 8080;
    if (config_["listeners"].isArray() && config_["listeners"].size() > 0) {
        if (config_["listeners"][0]["port"].isInt()) {
            port = config_["listeners"][0]["port"].asInt();
        }
        if (config_["listeners"][0]["address"].isString()) {
            host = config_["listeners"][0]["address"].asString();
        }
    }
    const char *envPort = std::getenv("PORT");
    if (envPort && *envPort) {
        try { port = std::stoi(envPort); } catch (...) {}
    }

#if defined(_WIN32)
    WSADATA wsaData;
    int wsaRes = WSAStartup(MAKEWORD(2, 2), &wsaData);
    if (wsaRes != 0) {
        std::cerr << "[MarsNova Standalone] Failed to initialize Winsock: " << wsaRes << std::endl;
        return;
    }
    SOCKET serverFd = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    if (serverFd == INVALID_SOCKET) {
        std::cerr << "[MarsNova Standalone] socket() failed: " << WSAGetLastError() << std::endl;
        WSACleanup();
        return;
    }
    int opt = 1;
    setsockopt(serverFd, SOL_SOCKET, SO_REUSEADDR, (const char *)&opt, sizeof(opt));
#else
    int serverFd = socket(AF_INET, SOCK_STREAM, 0);
    if (serverFd < 0) {
        std::cerr << "[MarsNova Standalone] socket() failed" << std::endl;
        return;
    }
    int opt = 1;
    setsockopt(serverFd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));
#endif

    sockaddr_in serverAddr{};
    serverAddr.sin_family = AF_INET;
    serverAddr.sin_port = htons(static_cast<uint16_t>(port));
    if (host == "0.0.0.0" || host.empty()) {
        serverAddr.sin_addr.s_addr = INADDR_ANY;
    } else {
        serverAddr.sin_addr.s_addr = inet_addr(host.c_str());
    }

    if (bind(serverFd, (struct sockaddr *)&serverAddr, sizeof(serverAddr)) < 0) {
        if (port == 8080) {
            std::cout << "[MarsNova Standalone] Port 8080 is occupied or restricted; falling back to port 8081..." << std::endl;
            port = 8081;
            serverAddr.sin_port = htons(static_cast<uint16_t>(port));
            if (bind(serverFd, (struct sockaddr *)&serverAddr, sizeof(serverAddr)) < 0) {
                std::cerr << "[MarsNova Standalone] Failed to bind to fallback port 8081." << std::endl;
#if defined(_WIN32)
                closesocket(serverFd);
                WSACleanup();
#else
                close(serverFd);
#endif
                return;
            }
        } else {
            std::cerr << "[MarsNova Standalone] bind() failed on port " << port << std::endl;
#if defined(_WIN32)
            closesocket(serverFd);
            WSACleanup();
#else
            close(serverFd);
#endif
            return;
        }
    }

    if (listen(serverFd, 128) < 0) {
        std::cerr << "[MarsNova Standalone] listen() failed" << std::endl;
#if defined(_WIN32)
        closesocket(serverFd);
        WSACleanup();
#else
        close(serverFd);
#endif
        return;
    }

    std::cout << "[MarsNova Standalone] Server ready and listening on http://" << (host == "0.0.0.0" ? "localhost" : host) << ":" << port << std::endl;

    // Same setting nginx and Drogon use ("app": {"client_max_body_size": "25M"}); default 10 MB.
    const size_t maxBodyBytes = parseSizeLimit(config_["app"]["client_max_body_size"].asString(), 10u * 1024u * 1024u);

    while (true) {
        sockaddr_in clientAddr{};
#if defined(_WIN32)
        int clientLen = sizeof(clientAddr);
        SOCKET clientFd = accept(serverFd, (struct sockaddr *)&clientAddr, &clientLen);
        if (clientFd == INVALID_SOCKET) {
            std::this_thread::sleep_for(std::chrono::milliseconds(10));
            continue;
        }
#else
        socklen_t clientLen = sizeof(clientAddr);
        int clientFd = accept(serverFd, (struct sockaddr *)&clientAddr, &clientLen);
        if (clientFd < 0) {
            std::this_thread::sleep_for(std::chrono::milliseconds(10));
            continue;
        }
#endif

        const char *ipStr = inet_ntoa(clientAddr.sin_addr);
        std::string clientIp = ipStr ? ipStr : "127.0.0.1";

        // One thread per connection, so cap how many can exist at once.
        if (s_activeConnections.load() >= kMaxConnections) {
            sendSimpleResponse(clientFd, 503, "Service Unavailable",
                               R"({"error":"Server is busy, please try again shortly","code":"SERVER_BUSY"})");
            closeSocketHandle(clientFd);
            continue;
        }
        s_activeConnections.fetch_add(1);

        std::thread([this, clientFd, clientIp, maxBodyBytes]() {
            struct ConnectionGuard {
                ~ConnectionGuard() { s_activeConnections.fetch_sub(1); }
            } connectionGuard;

            // A client that stops sending must not hold this thread forever.
            setRecvTimeout(clientFd, kRecvTimeoutMs);

            std::string rawRequest;
            char buffer[4096];
            size_t headerEnd = std::string::npos;
            size_t expectedContentLength = 0;
            bool hasContentLength = false;
            size_t delimLen = 4;

            while (true) {
                int bytesRead = static_cast<int>(recv(clientFd, buffer, sizeof(buffer), 0));
                if (bytesRead <= 0) break;
                rawRequest.append(buffer, static_cast<size_t>(bytesRead));

                if (headerEnd == std::string::npos) {
                    headerEnd = rawRequest.find("\r\n\r\n");
                    delimLen = 4;
                    if (headerEnd == std::string::npos) {
                        headerEnd = rawRequest.find("\n\n");
                        delimLen = 2;
                    }
                    if (headerEnd == std::string::npos) {
                        if (rawRequest.size() > kMaxHeaderBytes) {
                            sendSimpleResponse(clientFd, 431, "Request Header Fields Too Large",
                                               R"({"error":"Request headers are too large","code":"HEADERS_TOO_LARGE"})");
                            gracefulClose(clientFd);
                            return;
                        }
                        continue;
                    }
                    if (headerEnd > kMaxHeaderBytes) {
                        sendSimpleResponse(clientFd, 431, "Request Header Fields Too Large",
                                           R"({"error":"Request headers are too large","code":"HEADERS_TOO_LARGE"})");
                        gracefulClose(clientFd);
                        return;
                    }

                    std::string headersPart = rawRequest.substr(0, headerEnd);
                    std::istringstream hss(headersPart);
                    std::string line;
                    while (std::getline(hss, line)) {
                        if (!line.empty() && line.back() == '\r') line.pop_back();
                        size_t colon = line.find(':');
                        if (colon != std::string::npos) {
                            std::string hName = line.substr(0, colon);
                            std::string hVal = line.substr(colon + 1);
                            while (!hVal.empty() && (hVal.front() == ' ' || hVal.front() == '\t')) hVal.erase(0, 1);
                            while (!hVal.empty() && (hVal.back() == ' ' || hVal.back() == '\t')) hVal.pop_back();
                            if (iequals(hName, "Content-Length")) {
                                try {
                                    expectedContentLength = std::stoul(hVal);
                                    hasContentLength = true;
                                } catch (...) {}
                            }
                        }
                    }

                    if (hasContentLength && expectedContentLength > maxBodyBytes) {
                        sendSimpleResponse(clientFd, 413, "Payload Too Large",
                                           R"({"error":"Request body is too large","code":"PAYLOAD_TOO_LARGE"})");
                        gracefulClose(clientFd);
                        return;
                    }

                    size_t bodyBytes = rawRequest.size() - (headerEnd + delimLen);
                    if (!hasContentLength || bodyBytes >= expectedContentLength) {
                        break;
                    }
                } else {
                    size_t bodyBytes = rawRequest.size() - (headerEnd + delimLen);
                    if (bodyBytes >= expectedContentLength) {
                        break;
                    }
                }
            }

            if (rawRequest.empty() || headerEnd == std::string::npos) {
                closeSocketHandle(clientFd);
                return;
            }

            // The connection ended or timed out before the whole body arrived: do not run the
            // handler on a truncated body.
            if (hasContentLength && rawRequest.size() - (headerEnd + delimLen) < expectedContentLength) {
                sendSimpleResponse(clientFd, 400, "Bad Request",
                                   R"({"error":"Request body was incomplete","code":"BAD_REQUEST"})");
                closeSocketHandle(clientFd);
                return;
            }

            std::string headersPart = rawRequest.substr(0, headerEnd);
            std::string bodyPart = rawRequest.substr(headerEnd + delimLen);
            if (hasContentLength && bodyPart.size() > expectedContentLength) {
                bodyPart = bodyPart.substr(0, expectedContentLength);
            }

            auto req = std::make_shared<HttpRequest>();
            req->body_ = bodyPart;
            req->peerAddr_.ip_ = clientIp;

            std::istringstream stream(headersPart);
            std::string requestLine;
            if (std::getline(stream, requestLine)) {
                if (!requestLine.empty() && requestLine.back() == '\r') requestLine.pop_back();
                std::istringstream rls(requestLine);
                std::string methodStr, uriStr, httpVersion;
                rls >> methodStr >> uriStr >> httpVersion;

                if (methodStr.empty() || uriStr.empty()) {
                    sendSimpleResponse(clientFd, 400, "Bad Request",
                                       R"({"error":"Malformed request line","code":"BAD_REQUEST"})");
                    gracefulClose(clientFd);
                    return;
                }

                if (methodStr == "GET") req->method_ = drogon::Get;
                else if (methodStr == "POST") req->method_ = drogon::Post;
                else if (methodStr == "PUT") req->method_ = drogon::Put;
                else if (methodStr == "DELETE") req->method_ = drogon::Delete;
                else if (methodStr == "OPTIONS") req->method_ = drogon::Options;
                else if (methodStr == "PATCH") req->method_ = drogon::Patch;
                else if (methodStr == "HEAD") req->method_ = drogon::Head;
                else {
                    // Unknown methods used to fall through as GET (TRACE /api/v1/services returned data).
                    sendSimpleResponse(clientFd, 501, "Not Implemented",
                                       R"({"error":"HTTP method not implemented","code":"METHOD_NOT_IMPLEMENTED"})");
                    gracefulClose(clientFd);
                    return;
                }

                req->path_ = uriStr;
            }

            std::string headerLine;
            while (std::getline(stream, headerLine)) {
                if (!headerLine.empty() && headerLine.back() == '\r') headerLine.pop_back();
                if (headerLine.empty()) continue;
                size_t colon = headerLine.find(':');
                if (colon != std::string::npos) {
                    std::string hName = headerLine.substr(0, colon);
                    std::string hVal = headerLine.substr(colon + 1);
                    while (!hVal.empty() && (hVal.front() == ' ' || hVal.front() == '\t')) hVal.erase(0, 1);
                    while (!hVal.empty() && (hVal.back() == ' ' || hVal.back() == '\t')) hVal.pop_back();
                    req->setHeader(hName, hVal);
                }
            }

            const bool isHead = (req->method_ == drogon::Head);
            // Tracks whether an answer went out, so a late exception never writes to a socket that
            // was already closed (and may since have been reused by another connection).
            auto responded = std::make_shared<std::atomic<bool>>(false);

            try {
                this->handleRequest(req, [clientFd, isHead, responded](const HttpResponsePtr &resp) {
                    if (responded->exchange(true)) return;
                    std::ostringstream ss;
                    ss << "HTTP/1.1 " << static_cast<int>(resp->statusCode()) << " " << resp->statusMessage_ << "\r\n";
                    bool hasContentLen = false;
                    bool hasConn = false;
                    for (const auto &h : resp->headers_) {
                        ss << h.first << ": " << h.second << "\r\n";
                        if (iequals(h.first, "Content-Length")) hasContentLen = true;
                        if (iequals(h.first, "Connection")) hasConn = true;
                    }
                    if (!hasContentLen) {
                        ss << "Content-Length: " << resp->body_.size() << "\r\n";
                    }
                    if (!hasConn) {
                        ss << "Connection: close\r\n";
                    }
                    ss << "\r\n";
                    if (!isHead) {
                        ss << resp->body_;  // a HEAD response carries the headers only
                    }
                    sendAll(clientFd, ss.str());
                    closeSocketHandle(clientFd);
                });
            } catch (const std::exception &e) {
                // Never let an exception from a handler terminate the whole server process.
                std::cerr << "[MarsNova Standalone] unhandled exception while serving a request: " << e.what() << std::endl;
                if (!responded->exchange(true)) {
                    sendSimpleResponse(clientFd, 500, "Internal Server Error",
                                       R"({"error":"Internal server error","code":"INTERNAL_ERROR"})");
                    closeSocketHandle(clientFd);
                }
            } catch (...) {
                std::cerr << "[MarsNova Standalone] unknown exception while serving a request" << std::endl;
                if (!responded->exchange(true)) {
                    sendSimpleResponse(clientFd, 500, "Internal Server Error",
                                       R"({"error":"Internal server error","code":"INTERNAL_ERROR"})");
                    closeSocketHandle(clientFd);
                }
            }
        }).detach();
    }
}

} // namespace drogon
