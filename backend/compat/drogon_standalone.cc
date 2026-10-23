#include "drogon/drogon.h"
#include "../controllers/HealthController.h"
#include "../controllers/EnquiryController.h"
#include "../controllers/RecoveryController.h"
#include "../controllers/CatalogController.h"
#include "../controllers/LeadController.h"
#include "../controllers/AuthController.h"
#include "../controllers/QuotationController.h"
#include "../controllers/ProjectController.h"
#include "../controllers/ContentController.h"
#include "../controllers/LearningController.h"
#include <iostream>
#include <fstream>
#include <cstdlib>
#include <random>
#include <chrono>
#include <thread>

#if defined(_WIN32)
#include <winsock2.h>
#include <ws2tcpip.h>
#pragma comment(lib, "ws2_32.lib")
#else
#include <sys/socket.h>
#include <netinet/in.h>
#include <unistd.h>
#endif

namespace drogon {

static std::string generateRequestId() {
    static std::mt19937_64 rng(std::random_device{}());
    static std::uniform_int_distribution<uint64_t> dist;
    uint64_t r1 = dist(rng);
    uint64_t r2 = dist(rng);
    char buf[64];
    snprintf(buf, sizeof(buf), "req_%016llx%016llx", (unsigned long long)r1, (unsigned long long)r2);
    return std::string(buf);
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
                req->setParameter(token.substr(0, eq), token.substr(eq + 1));
            } else {
                req->setParameter(token, "");
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

    // -------------------------------------------------------------------------
    // Quotations Endpoints (/api/v1/quotations)
    // -------------------------------------------------------------------------
    if (p == "/api/v1/quotations") {
        QuotationController ctrl;
        if (m == HttpMethod::Post || m == HttpMethod::Options) {
            ctrl.createQuotation(req, std::move(wrappedCb));
            return;
        } else if (m == HttpMethod::Get) {
            ctrl.listQuotations(req, std::move(wrappedCb));
            return;
        }
    }

    if (p.rfind("/api/v1/quotations/", 0) == 0) {
        std::string sub = p.substr(std::string("/api/v1/quotations/").length());
        QuotationController ctrl;

        // POST /api/v1/quotations/:id/status
        size_t statusPos = sub.find("/status");
        if (statusPos != std::string::npos) {
            std::string quoteId = sub.substr(0, statusPos);
            ctrl.updateQuotationStatus(req, std::move(wrappedCb), quoteId);
            return;
        }

        // POST /api/v1/quotations/:id/revisions
        size_t revPos = sub.find("/revisions");
        if (revPos != std::string::npos) {
            std::string quoteId = sub.substr(0, revPos);
            ctrl.createQuotationRevision(req, std::move(wrappedCb), quoteId);
            return;
        }

        // GET /api/v1/quotations/:id
        if (m == HttpMethod::Get) {
            ctrl.getQuotationDetails(req, std::move(wrappedCb), sub);
            return;
        }
    }

    // -------------------------------------------------------------------------
    // Projects Endpoints (/api/v1/projects)
    // -------------------------------------------------------------------------
    if (p == "/api/v1/projects") {
        ProjectController ctrl;
        if (m == HttpMethod::Post || m == HttpMethod::Options) {
            ctrl.createProject(req, std::move(wrappedCb));
            return;
        } else if (m == HttpMethod::Get) {
            ctrl.listProjects(req, std::move(wrappedCb));
            return;
        }
    }

    if (p.rfind("/api/v1/projects/", 0) == 0) {
        std::string sub = p.substr(std::string("/api/v1/projects/").length());
        ProjectController ctrl;

        // POST /api/v1/projects/:id/status
        size_t statusPos = sub.find("/status");
        if (statusPos != std::string::npos) {
            std::string projId = sub.substr(0, statusPos);
            ctrl.updateProjectStatus(req, std::move(wrappedCb), projId);
            return;
        }

        // DELETE /api/v1/projects/:id/assignments/:userId
        size_t asgnPos = sub.find("/assignments");
        if (asgnPos != std::string::npos) {
            std::string projId = sub.substr(0, asgnPos);
            std::string afterAsgn = sub.substr(asgnPos + std::string("/assignments").length());
            if (afterAsgn.rfind("/", 0) == 0 && afterAsgn.length() > 1) {
                std::string userId = afterAsgn.substr(1);
                if (m == HttpMethod::Delete || m == HttpMethod::Options) {
                    ctrl.removeStaff(req, std::move(wrappedCb), projId, userId);
                    return;
                }
            } else {
                if (m == HttpMethod::Post || m == HttpMethod::Options) {
                    ctrl.assignStaff(req, std::move(wrappedCb), projId);
                    return;
                }
            }
        }

        // POST /api/v1/projects/:id/deliverables
        size_t delivPos = sub.find("/deliverables");
        if (delivPos != std::string::npos) {
            std::string projId = sub.substr(0, delivPos);
            ctrl.updateDeliverables(req, std::move(wrappedCb), projId);
            return;
        }

        // GET /api/v1/projects/:id
        if (m == HttpMethod::Get) {
            ctrl.getProjectDetails(req, std::move(wrappedCb), sub);
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

    if (p == "/api/v1/admin/overview") {
        AuthController ctrl;
        ctrl.getAdminOverview(req, std::move(wrappedCb));
        return;
    }

    if (p == "/api/v1/admin/quotes") {
        AuthController ctrl;
        ctrl.getAdminQuotes(req, std::move(wrappedCb));
        return;
    }

    if (p == "/api/v1/admin/users") {
        AuthController ctrl;
        ctrl.createStaffUser(req, std::move(wrappedCb));
        return;
    }

    // --- Content Management: Services ---
    if (p == "/api/v1/admin/services") {
        ContentController ctrl;
        if (m == HttpMethod::Get) ctrl.listServicesAdmin(req, std::move(wrappedCb));
        else ctrl.createService(req, std::move(wrappedCb));
        return;
    }

    if (p.rfind("/api/v1/admin/services/", 0) == 0) {
        std::string sub = p.substr(std::string("/api/v1/admin/services/").length());
        ContentController ctrl;
        size_t pubPos = sub.find("/publish");
        if (pubPos != std::string::npos) {
            std::string id = sub.substr(0, pubPos);
            ctrl.publishService(req, std::move(wrappedCb), id);
            return;
        }
        size_t archPos = sub.find("/archive");
        if (archPos != std::string::npos) {
            std::string id = sub.substr(0, archPos);
            ctrl.archiveService(req, std::move(wrappedCb), id);
            return;
        }
        if (m == HttpMethod::Delete) {
            ctrl.deleteService(req, std::move(wrappedCb), sub);
            return;
        }
        ctrl.updateService(req, std::move(wrappedCb), sub);
        return;
    }

    // --- Content Management: Portfolio ---
    if (p == "/api/v1/admin/portfolio") {
        ContentController ctrl;
        if (m == HttpMethod::Get) ctrl.listPortfolioAdmin(req, std::move(wrappedCb));
        else ctrl.createPortfolio(req, std::move(wrappedCb));
        return;
    }

    if (p.rfind("/api/v1/admin/portfolio/", 0) == 0) {
        std::string sub = p.substr(std::string("/api/v1/admin/portfolio/").length());
        ContentController ctrl;
        size_t pubPos = sub.find("/publish");
        if (pubPos != std::string::npos) {
            std::string id = sub.substr(0, pubPos);
            ctrl.publishPortfolio(req, std::move(wrappedCb), id);
            return;
        }
        size_t archPos = sub.find("/archive");
        if (archPos != std::string::npos) {
            std::string id = sub.substr(0, archPos);
            ctrl.archivePortfolio(req, std::move(wrappedCb), id);
            return;
        }
        if (m == HttpMethod::Delete) {
            ctrl.deletePortfolio(req, std::move(wrappedCb), sub);
            return;
        }
        ctrl.updatePortfolio(req, std::move(wrappedCb), sub);
        return;
    }

    // --- Content Management: Courses ---
    if (p == "/api/v1/admin/courses") {
        ContentController ctrl;
        if (m == HttpMethod::Get) ctrl.listCoursesAdmin(req, std::move(wrappedCb));
        else ctrl.createCourse(req, std::move(wrappedCb));
        return;
    }

    if (p.rfind("/api/v1/admin/courses/", 0) == 0) {
        std::string sub = p.substr(std::string("/api/v1/admin/courses/").length());
        ContentController ctrl;

        // /api/v1/admin/courses/:courseId/lessons
        size_t lesPos = sub.find("/lessons");
        if (lesPos != std::string::npos) {
            std::string courseId = sub.substr(0, lesPos);
            if (m == HttpMethod::Get) ctrl.listLessonsAdmin(req, std::move(wrappedCb), courseId);
            else ctrl.createLesson(req, std::move(wrappedCb), courseId);
            return;
        }

        size_t pubPos = sub.find("/publish");
        if (pubPos != std::string::npos) {
            std::string id = sub.substr(0, pubPos);
            ctrl.publishCourse(req, std::move(wrappedCb), id);
            return;
        }
        size_t archPos = sub.find("/archive");
        if (archPos != std::string::npos) {
            std::string id = sub.substr(0, archPos);
            ctrl.archiveCourse(req, std::move(wrappedCb), id);
            return;
        }
        if (m == HttpMethod::Delete) {
            ctrl.deleteCourse(req, std::move(wrappedCb), sub);
            return;
        }
        ctrl.updateCourse(req, std::move(wrappedCb), sub);
        return;
    }

    // --- Content Management: Lessons ---
    if (p.rfind("/api/v1/admin/lessons/", 0) == 0) {
        std::string sub = p.substr(std::string("/api/v1/admin/lessons/").length());
        ContentController ctrl;
        size_t pubPos = sub.find("/publish");
        if (pubPos != std::string::npos) {
            std::string id = sub.substr(0, pubPos);
            ctrl.publishLesson(req, std::move(wrappedCb), id);
            return;
        }
        size_t archPos = sub.find("/archive");
        if (archPos != std::string::npos) {
            std::string id = sub.substr(0, archPos);
            ctrl.archiveLesson(req, std::move(wrappedCb), id);
            return;
        }
        if (m == HttpMethod::Delete) {
            ctrl.deleteLesson(req, std::move(wrappedCb), sub);
            return;
        }
        ctrl.updateLesson(req, std::move(wrappedCb), sub);
        return;
    }

    // --- Content Management: Media Storage ---
    if (p == "/api/v1/admin/media/upload") {
        ContentController ctrl;
        ctrl.uploadMedia(req, std::move(wrappedCb));
        return;
    }

    if (p == "/api/v1/admin/media") {
        ContentController ctrl;
        ctrl.listMediaAdmin(req, std::move(wrappedCb));
        return;
    }

    // Recovery Cases Admin
    if (p == "/api/v1/admin/recovery/cases") {
        RecoveryController ctrl;
        ctrl.listCasesAdmin(req, std::move(wrappedCb));
        return;
    }

    if (p.rfind("/api/v1/admin/recovery/cases/", 0) == 0) {
        std::string sub = p.substr(std::string("/api/v1/admin/recovery/cases/").length());
        RecoveryController ctrl;
        auto slash = sub.find('/');
        if (slash == std::string::npos) {
            ctrl.getCaseAdmin(req, std::move(wrappedCb), sub);
            return;
        }
        std::string id = sub.substr(0, slash);
        std::string action = sub.substr(slash + 1);
        if (action == "physical-receipt") {
            ctrl.confirmPhysicalReceipt(req, std::move(wrappedCb), id);
            return;
        }
        if (action == "diagnosis") {
            ctrl.recordDiagnosis(req, std::move(wrappedCb), id);
            return;
        }
        if (action == "quotation") {
            ctrl.issueQuotation(req, std::move(wrappedCb), id);
            return;
        }
        if (action == "quotation-decision") {
            ctrl.decideQuotation(req, std::move(wrappedCb), id);
            return;
        }
        if (action == "transition") {
            ctrl.transitionStatus(req, std::move(wrappedCb), id);
            return;
        }
        if (action == "custody") {
            ctrl.transferCustody(req, std::move(wrappedCb), id);
            return;
        }
        if (action == "return") {
            ctrl.returnDevice(req, std::move(wrappedCb), id);
            return;
        }
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
        size_t lesPos = sub.find("/lessons/");
        if (lesPos != std::string::npos) {
            std::string courseSlug = sub.substr(0, lesPos);
            std::string lessonSlug = sub.substr(lesPos + std::string("/lessons/").length());
            ContentController ctrl;
            ctrl.getPublicLesson(req, std::move(wrappedCb), courseSlug, lessonSlug);
            return;
        }
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

    while (true) {
        sockaddr_in clientAddr{};
#if defined(_WIN32)
        int clientLen = sizeof(clientAddr);
        SOCKET clientFd = accept(serverFd, (struct sockaddr *)&clientAddr, &clientLen);
        if (clientFd == INVALID_SOCKET) {
            continue;
        }
#else
        socklen_t clientLen = sizeof(clientAddr);
        int clientFd = accept(serverFd, (struct sockaddr *)&clientAddr, &clientLen);
        if (clientFd < 0) {
            continue;
        }
#endif

        const char *ipStr = inet_ntoa(clientAddr.sin_addr);
        std::string clientIp = ipStr ? ipStr : "127.0.0.1";

        std::thread([this, clientFd, clientIp]() {
            std::string rawRequest;
            char buffer[4096];
            size_t headerEnd = std::string::npos;
            size_t expectedContentLength = 0;
            bool hasContentLength = false;
            size_t delimLen = 4;

            while (true) {
                int bytesRead = recv(clientFd, buffer, sizeof(buffer) - 1, 0);
                if (bytesRead <= 0) break;
                buffer[bytesRead] = '\0';
                rawRequest.append(buffer, bytesRead);

                if (headerEnd == std::string::npos) {
                    headerEnd = rawRequest.find("\r\n\r\n");
                    delimLen = 4;
                    if (headerEnd == std::string::npos) {
                        headerEnd = rawRequest.find("\n\n");
                        delimLen = 2;
                    }
                    if (headerEnd != std::string::npos) {
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
                        size_t bodyBytes = rawRequest.size() - (headerEnd + delimLen);
                        if (!hasContentLength || bodyBytes >= expectedContentLength) {
                            break;
                        }
                    }
                } else {
                    size_t bodyBytes = rawRequest.size() - (headerEnd + delimLen);
                    if (bodyBytes >= expectedContentLength) {
                        break;
                    }
                }
            }

            if (rawRequest.empty() || headerEnd == std::string::npos) {
#if defined(_WIN32)
                closesocket(clientFd);
#else
                close(clientFd);
#endif
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

                if (methodStr == "GET") req->method_ = drogon::Get;
                else if (methodStr == "POST") req->method_ = drogon::Post;
                else if (methodStr == "PUT") req->method_ = drogon::Put;
                else if (methodStr == "DELETE") req->method_ = drogon::Delete;
                else if (methodStr == "OPTIONS") req->method_ = drogon::Options;
                else if (methodStr == "PATCH") req->method_ = drogon::Patch;
                else if (methodStr == "HEAD") req->method_ = drogon::Head;

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

            this->handleRequest(req, [clientFd](const HttpResponsePtr &resp) {
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
                ss << resp->body_;

                std::string out = ss.str();
                send(clientFd, out.c_str(), static_cast<int>(out.size()), 0);
#if defined(_WIN32)
                closesocket(clientFd);
#else
                close(clientFd);
#endif
            });
        }).detach();
    }
}

} // namespace drogon
