#pragma once
#include <chrono>
#include <string>
#include <ctime>
#include <iomanip>
#include <sstream>

namespace trantor {

class Date {
private:
    std::chrono::system_clock::time_point tp_;

public:
    Date() : tp_(std::chrono::system_clock::now()) {}
    explicit Date(std::chrono::system_clock::time_point tp) : tp_(tp) {}

    static Date now() {
        return Date(std::chrono::system_clock::now());
    }

    std::string toFormattedString(bool showMicroseconds = false) const {
        std::time_t tt = std::chrono::system_clock::to_time_t(tp_);
        std::tm tm_buf;
#if defined(_WIN32)
        gmtime_s(&tm_buf, &tt);
#else
        gmtime_r(&tt, &tm_buf);
#endif
        char buf[64];
        std::strftime(buf, sizeof(buf), "%Y-%m-%d %H:%M:%S", &tm_buf);
        return std::string(buf);
    }

    std::string toCustomedFormattedString(const std::string &fmt) const {
        std::time_t tt = std::chrono::system_clock::to_time_t(tp_);
        std::tm tm_buf;
#if defined(_WIN32)
        gmtime_s(&tm_buf, &tt);
#else
        gmtime_r(&tt, &tm_buf);
#endif
        char buf[128];
        std::strftime(buf, sizeof(buf), fmt.c_str(), &tm_buf);
        return std::string(buf);
    }
};

} // namespace trantor
