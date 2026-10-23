#include <iostream>
#include <vector>
#include <thread>
#include <atomic>
#include <chrono>
#include <numeric>
#include <algorithm>
#include <iomanip>
#include <fstream>
#include <sstream>
#include <drogon/drogon.h>

struct BenchmarkResult {
    std::string endpoint;
    int concurrency{0};
    int totalRequests{0};
    int successfulRequests{0};
    int failedRequests{0};
    double durationSeconds{0.0};
    double throughputReqSec{0.0};
    double minLatencyMs{0.0};
    double avgLatencyMs{0.0};
    double p50LatencyMs{0.0};
    double p95LatencyMs{0.0};
    double p99LatencyMs{0.0};
    double maxLatencyMs{0.0};
    double errorRatePercent{0.0};
};

BenchmarkResult runTier(const std::string &endpoint, int concurrency, int totalRequests) {
    std::vector<std::vector<double>> threadLatencies(concurrency);
    std::atomic<int> successCount{0};
    std::atomic<int> failureCount{0};

    int reqsPerThread = totalRequests / concurrency;
    int remainder = totalRequests % concurrency;

    auto startTime = std::chrono::high_resolution_clock::now();
    std::vector<std::thread> workers;
    workers.reserve(concurrency);

    for (int t = 0; t < concurrency; ++t) {
        int count = reqsPerThread + (t < remainder ? 1 : 0);
        workers.emplace_back([&, t, count]() {
            threadLatencies[t].reserve(count);
            for (int i = 0; i < count; ++i) {
                auto req = std::make_shared<drogon::HttpRequest>();
                req->method_ = drogon::Get;
                req->path_ = endpoint;
                req->setHeader("X-Request-Id", "BENCH-" + std::to_string(t) + "-" + std::to_string(i));

                auto reqStart = std::chrono::high_resolution_clock::now();
                bool ok = false;

                drogon::app().handleRequest(req, [&](const drogon::HttpResponsePtr &resp) {
                    if (resp && resp->statusCode() == drogon::k200OK) {
                        ok = true;
                    }
                });

                auto reqEnd = std::chrono::high_resolution_clock::now();
                double latMs = std::chrono::duration<double, std::milli>(reqEnd - reqStart).count();
                threadLatencies[t].push_back(latMs);

                if (ok) {
                    successCount.fetch_add(1, std::memory_order_relaxed);
                } else {
                    failureCount.fetch_add(1, std::memory_order_relaxed);
                }
            }
        });
    }

    for (auto &w : workers) {
        if (w.joinable()) {
            w.join();
        }
    }

    auto endTime = std::chrono::high_resolution_clock::now();
    double totalDurationSec = std::chrono::duration<double>(endTime - startTime).count();

    // Aggregate latencies
    std::vector<double> allLatencies;
    allLatencies.reserve(totalRequests);
    for (const auto &tl : threadLatencies) {
        allLatencies.insert(allLatencies.end(), tl.begin(), tl.end());
    }
    std::sort(allLatencies.begin(), allLatencies.end());

    BenchmarkResult res;
    res.endpoint = endpoint;
    res.concurrency = concurrency;
    res.totalRequests = totalRequests;
    res.successfulRequests = successCount.load();
    res.failedRequests = failureCount.load();
    res.durationSeconds = totalDurationSec;
    res.throughputReqSec = (totalDurationSec > 0.0) ? (totalRequests / totalDurationSec) : 0.0;
    res.errorRatePercent = (totalRequests > 0) ? (100.0 * res.failedRequests / totalRequests) : 0.0;

    if (!allLatencies.empty()) {
        res.minLatencyMs = allLatencies.front();
        res.maxLatencyMs = allLatencies.back();
        double sum = std::accumulate(allLatencies.begin(), allLatencies.end(), 0.0);
        res.avgLatencyMs = sum / allLatencies.size();

        size_t idx50 = static_cast<size_t>(allLatencies.size() * 0.50);
        size_t idx95 = static_cast<size_t>(allLatencies.size() * 0.95);
        size_t idx99 = static_cast<size_t>(allLatencies.size() * 0.99);

        if (idx50 >= allLatencies.size()) idx50 = allLatencies.size() - 1;
        if (idx95 >= allLatencies.size()) idx95 = allLatencies.size() - 1;
        if (idx99 >= allLatencies.size()) idx99 = allLatencies.size() - 1;

        res.p50LatencyMs = allLatencies[idx50];
        res.p95LatencyMs = allLatencies[idx95];
        res.p99LatencyMs = allLatencies[idx99];
    }

    return res;
}

int main(int argc, char *argv[]) {
    std::cout << "================================================================================" << std::endl;
    std::cout << "        MarsNova C++ Drogon API Concurrency Load Testing Benchmark              " << std::endl;
    std::cout << "================================================================================" << std::endl;

    // Load config
    drogon::app().loadConfigFile("./config.json");

    std::vector<std::string> endpoints = {
        "/api/v1/health",
        "/api/v1/services",
        "/api/v1/recovery/track/MNR-2026-8292",
        "/api/v1/lab/courses/advanced-video-production/lessons/les-avp-01"
    };

    std::vector<int> concurrencies = {10, 25, 50, 100};
    const int REQUESTS_PER_TIER = 1000;

    std::vector<BenchmarkResult> allResults;

    for (const auto &ep : endpoints) {
        std::cout << "\n--------------------------------------------------------------------------------" << std::endl;
        std::cout << " Benchmarking Endpoint: " << ep << std::endl;
        std::cout << "--------------------------------------------------------------------------------" << std::endl;
        std::cout << std::left
                  << std::setw(12) << "Clients"
                  << std::setw(12) << "Requests"
                  << std::setw(16) << "Throughput(r/s)"
                  << std::setw(10) << "Min(ms)"
                  << std::setw(10) << "Avg(ms)"
                  << std::setw(10) << "p50(ms)"
                  << std::setw(10) << "p95(ms)"
                  << std::setw(10) << "p99(ms)"
                  << std::setw(10) << "Max(ms)"
                  << std::setw(10) << "Errors"
                  << std::endl;
        std::cout << "--------------------------------------------------------------------------------" << std::endl;

        for (int c : concurrencies) {
            BenchmarkResult r = runTier(ep, c, REQUESTS_PER_TIER);
            allResults.push_back(r);

            std::cout << std::left
                      << std::setw(12) << r.concurrency
                      << std::setw(12) << r.totalRequests
                      << std::fixed << std::setprecision(1) << std::setw(16) << r.throughputReqSec
                      << std::fixed << std::setprecision(3)
                      << std::setw(10) << r.minLatencyMs
                      << std::setw(10) << r.avgLatencyMs
                      << std::setw(10) << r.p50LatencyMs
                      << std::setw(10) << r.p95LatencyMs
                      << std::setw(10) << r.p99LatencyMs
                      << std::setw(10) << r.maxLatencyMs
                      << std::setw(10) << r.failedRequests
                      << std::endl;
        }
    }

    std::cout << "================================================================================" << std::endl;
    std::cout << "   BENCHMARK COMPLETED ACROSS ALL CONCURRENCY LEVELS (10, 25, 50, 100)           " << std::endl;
    std::cout << "================================================================================" << std::endl;

    // Export JSON results for automated test suite verification
    std::ofstream jsonOut("backend/load_test_results.json");
    if (jsonOut.is_open()) {
        jsonOut << "[\n";
        for (size_t i = 0; i < allResults.size(); ++i) {
            const auto &r = allResults[i];
            jsonOut << "  {\n"
                    << "    \"endpoint\": \"" << r.endpoint << "\",\n"
                    << "    \"concurrency\": " << r.concurrency << ",\n"
                    << "    \"total_requests\": " << r.totalRequests << ",\n"
                    << "    \"successful_requests\": " << r.successfulRequests << ",\n"
                    << "    \"failed_requests\": " << r.failedRequests << ",\n"
                    << "    \"duration_seconds\": " << r.durationSeconds << ",\n"
                    << "    \"throughput_req_sec\": " << r.throughputReqSec << ",\n"
                    << "    \"min_latency_ms\": " << r.minLatencyMs << ",\n"
                    << "    \"avg_latency_ms\": " << r.avgLatencyMs << ",\n"
                    << "    \"p50_latency_ms\": " << r.p50LatencyMs << ",\n"
                    << "    \"p95_latency_ms\": " << r.p95LatencyMs << ",\n"
                    << "    \"p99_latency_ms\": " << r.p99LatencyMs << ",\n"
                    << "    \"max_latency_ms\": " << r.maxLatencyMs << ",\n"
                    << "    \"error_rate_percent\": " << r.errorRatePercent << "\n"
                    << "  }" << (i + 1 < allResults.size() ? "," : "") << "\n";
        }
        jsonOut << "]\n";
        jsonOut.close();
        std::cout << "[Benchmark] Results exported to backend/load_test_results.json" << std::endl;
    }

    return 0;
}
