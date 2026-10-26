#pragma once
#include <string>
#include <sstream>
#include <iomanip>
#include <vector>
#include <chrono>
#include <cstring>
#include <cstdint>
#include <cstdio>
#include <stdexcept>

#if defined(_WIN32)
// RtlGenRandom, exported from advapi32 under this name. Declared here instead of including
// <windows.h> so this header stays safe to include before <winsock2.h>.
extern "C" unsigned char __stdcall SystemFunction036(void *buffer, unsigned long length);
#if defined(_MSC_VER)
#pragma comment(lib, "advapi32.lib")
#endif
#endif

namespace Security {

// -----------------------------------------------------------------------------
// Constant-Time String Comparison (Timing-Attack Resistant)
// -----------------------------------------------------------------------------
inline bool constantTimeEquals(const std::string &a, const std::string &b) {
    if (a.size() != b.size()) return false;
    unsigned char result = 0;
    for (size_t i = 0; i < a.size(); ++i) {
        result |= (static_cast<unsigned char>(a[i]) ^ static_cast<unsigned char>(b[i]));
    }
    return result == 0;
}

// -----------------------------------------------------------------------------
// Standard FIPS 180-2 SHA-256 (Pure C++ Implementation, Zero Dependencies)
// -----------------------------------------------------------------------------
namespace detail {

inline uint32_t rotr(uint32_t x, uint32_t n) {
    return (x >> n) | (x << (32 - n));
}

inline uint32_t choose(uint32_t e, uint32_t f, uint32_t g) {
    return (e & f) ^ (~e & g);
}

inline uint32_t majority(uint32_t a, uint32_t b, uint32_t c) {
    return (a & b) ^ (a & c) ^ (b & c);
}

inline uint32_t sig0(uint32_t x) {
    return rotr(x, 2) ^ rotr(x, 13) ^ rotr(x, 22);
}

inline uint32_t sig1(uint32_t x) {
    return rotr(x, 6) ^ rotr(x, 11) ^ rotr(x, 25);
}

inline uint32_t theta0(uint32_t x) {
    return rotr(x, 7) ^ rotr(x, 18) ^ (x >> 3);
}

inline uint32_t theta1(uint32_t x) {
    return rotr(x, 17) ^ rotr(x, 19) ^ (x >> 10);
}

static const uint32_t K[64] = {
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
};

} // namespace detail

inline std::string sha256(const std::string &input) {
    uint32_t h0 = 0x6a09e667;
    uint32_t h1 = 0xbb67ae85;
    uint32_t h2 = 0x3c6ef372;
    uint32_t h3 = 0xa54ff53a;
    uint32_t h4 = 0x510e527f;
    uint32_t h5 = 0x9b05688c;
    uint32_t h6 = 0x1f83d9ab;
    uint32_t h7 = 0x5be0cd19;

    std::vector<uint8_t> msg(input.begin(), input.end());
    uint64_t bitLen = msg.size() * 8;

    msg.push_back(0x80);
    while ((msg.size() % 64) != 56) {
        msg.push_back(0x00);
    }

    for (int i = 7; i >= 0; --i) {
        msg.push_back(static_cast<uint8_t>((bitLen >> (i * 8)) & 0xff));
    }

    for (size_t chunk = 0; chunk < msg.size(); chunk += 64) {
        uint32_t w[64];
        for (int i = 0; i < 16; ++i) {
            w[i] = (static_cast<uint32_t>(msg[chunk + i * 4]) << 24) |
                   (static_cast<uint32_t>(msg[chunk + i * 4 + 1]) << 16) |
                   (static_cast<uint32_t>(msg[chunk + i * 4 + 2]) << 8) |
                   (static_cast<uint32_t>(msg[chunk + i * 4 + 3]));
        }
        for (int i = 16; i < 64; ++i) {
            w[i] = detail::theta1(w[i - 2]) + w[i - 7] + detail::theta0(w[i - 15]) + w[i - 16];
        }

        uint32_t a = h0;
        uint32_t b = h1;
        uint32_t c = h2;
        uint32_t d = h3;
        uint32_t e = h4;
        uint32_t f = h5;
        uint32_t g = h6;
        uint32_t h = h7;

        for (int i = 0; i < 64; ++i) {
            uint32_t t1 = h + detail::sig1(e) + detail::choose(e, f, g) + detail::K[i] + w[i];
            uint32_t t2 = detail::sig0(a) + detail::majority(a, b, c);
            h = g;
            g = f;
            f = e;
            e = d + t1;
            d = c;
            c = b;
            b = a;
            a = t1 + t2;
        }

        h0 += a;
        h1 += b;
        h2 += c;
        h3 += d;
        h4 += e;
        h5 += f;
        h6 += g;
        h7 += h;
    }

    std::ostringstream oss;
    oss << std::hex << std::setfill('0');
    oss << std::setw(8) << h0
        << std::setw(8) << h1
        << std::setw(8) << h2
        << std::setw(8) << h3
        << std::setw(8) << h4
        << std::setw(8) << h5
        << std::setw(8) << h6
        << std::setw(8) << h7;
    return oss.str();
}

// -----------------------------------------------------------------------------
// Cryptographically Strong Random Bytes / Hex Generator
// -----------------------------------------------------------------------------
// Reads straight from the operating system's CSPRNG. The previous generator seeded a Mersenne
// Twister from std::random_device, which is deterministic on MinGW (GCC < 9.2): every restart
// produced the same session IDs and CSRF tokens. Mersenne Twister output is also recoverable
// from a few hundred samples, so it is never acceptable for tokens. If the OS source fails this
// throws rather than falling back to anything weaker.
inline void fillRandomBytes(uint8_t *out, size_t n) {
#if defined(_WIN32)
    while (n > 0) {
        const unsigned long chunk = n > 65536 ? 65536UL : static_cast<unsigned long>(n);
        if (!SystemFunction036(out, chunk)) {
            throw std::runtime_error("operating system random source failed");
        }
        out += chunk;
        n -= chunk;
    }
#else
    std::FILE *f = std::fopen("/dev/urandom", "rb");
    if (!f) throw std::runtime_error("cannot open /dev/urandom");
    const size_t got = std::fread(out, 1, n, f);
    std::fclose(f);
    if (got != n) throw std::runtime_error("short read from /dev/urandom");
#endif
}

inline std::string randomHex(size_t numBytes = 16) {
    std::vector<uint8_t> bytes(numBytes);
    if (numBytes > 0) fillRandomBytes(bytes.data(), bytes.size());

    static const char *digits = "0123456789abcdef";
    std::string out;
    out.reserve(numBytes * 2);
    for (uint8_t b : bytes) {
        out.push_back(digits[b >> 4]);
        out.push_back(digits[b & 0x0f]);
    }
    return out;
}

// -----------------------------------------------------------------------------
// Secure Salted Password Hashing & Verification
// -----------------------------------------------------------------------------
inline std::string hashPassword(const std::string &password, std::string salt = "") {
    if (salt.empty()) {
        salt = randomHex(16); // 32 hex chars
    }
    // Salted digest with dual round key stretching
    std::string digest = sha256(salt + "$" + password);
    for (int i = 0; i < 1000; ++i) {
        digest = sha256(digest + "$" + salt);
    }
    return "sha256$" + salt + "$" + digest;
}

inline bool verifyPassword(const std::string &password, const std::string &storedHash) {
    if (storedHash.empty()) return false;

    // Only the salted sha256$<salt>$<hash> format authenticates. There is deliberately no fallback
    // for plaintext or unsalted values: such a fallback would let anyone who can read a stored
    // value log in by submitting that value as the password.
    if (storedHash.rfind("sha256$", 0) != 0) {
        return false;
    }

    size_t firstDollar = storedHash.find('$');
    size_t secondDollar = storedHash.find('$', firstDollar + 1);
    if (firstDollar == std::string::npos || secondDollar == std::string::npos) {
        return false;
    }

    std::string salt = storedHash.substr(firstDollar + 1, secondDollar - firstDollar - 1);
    std::string computed = hashPassword(password, salt);
    return constantTimeEquals(computed, storedHash);
}

// A valid-format hash of a throwaway password. Verifying against it costs the same as verifying a
// real account's password, so "unknown email" and "wrong password" take the same time. (The old
// guard used a malformed hash that skipped the key stretching, so it answered much faster.)
inline const std::string &dummyPasswordHash() {
    static const std::string hash = hashPassword("marsnova-dummy-password", "00000000000000000000000000000000");
    return hash;
}

// -----------------------------------------------------------------------------
// Client IP behind a reverse proxy
// -----------------------------------------------------------------------------
inline bool isPrivateOrLoopbackIp(const std::string &ip) {
    std::string v = ip;
    if (v.size() > 7 && (v.compare(0, 7, "::ffff:") == 0 || v.compare(0, 7, "::FFFF:") == 0)) v = v.substr(7);
    if (v == "::1") return true;

    unsigned a = 0, b = 0, c = 0, d = 0;
    char extra = 0;
    if (std::sscanf(v.c_str(), "%u.%u.%u.%u%c", &a, &b, &c, &d, &extra) == 4 && a < 256 && b < 256 && c < 256 && d < 256) {
        return a == 127 || a == 10 || (a == 192 && b == 168) || (a == 172 && b >= 16 && b <= 31) || (a == 169 && b == 254);
    }

    // IPv6 unique-local (fc00::/7) and link-local (fe80::/10)
    auto lower = [](char ch) { return (ch >= 'A' && ch <= 'Z') ? static_cast<char>(ch - 'A' + 'a') : ch; };
    if (v.size() >= 4 && v.find(':') != std::string::npos) {
        const char p0 = lower(v[0]), p1 = lower(v[1]), p2 = lower(v[2]);
        if (p0 == 'f' && (p1 == 'c' || p1 == 'd')) return true;
        if (p0 == 'f' && p1 == 'e' && (p2 == '8' || p2 == '9' || p2 == 'a' || p2 == 'b')) return true;
    }
    return false;
}

inline bool looksLikeIp(const std::string &s) {
    if (s.empty() || s.size() > 45) return false;
    const bool v6 = s.find(':') != std::string::npos;
    for (char ch : s) {
        const bool digit = ch >= '0' && ch <= '9';
        const bool hex = digit || (ch >= 'a' && ch <= 'f') || (ch >= 'A' && ch <= 'F');
        if (v6 ? !(hex || ch == ':' || ch == '.') : !(digit || ch == '.')) return false;
    }
    if (v6) return true;
    unsigned a = 0, b = 0, c = 0, d = 0;
    char extra = 0;
    return std::sscanf(s.c_str(), "%u.%u.%u.%u%c", &a, &b, &c, &d, &extra) == 4 && a < 256 && b < 256 && c < 256 && d < 256;
}

// The address of the real client. Forwarding headers are only believed when the TCP peer is one of
// our own proxies (a loopback or private address, e.g. the nginx gateway on the private Docker
// network). A client connecting directly can send any header it likes, so for public peers the
// socket address wins. Behind nginx the trustworthy values are X-Real-IP (nginx overwrites it with
// $remote_addr) and the RIGHTMOST X-Forwarded-For hop (what nginx appended); the left side of that
// header is whatever the client supplied.
inline std::string resolveClientIp(const std::string &peerIp, const std::string &xRealIp, const std::string &xForwardedFor) {
    const std::string peer = peerIp.empty() || peerIp == "0.0.0.0" ? std::string("127.0.0.1") : peerIp;
    if (!isPrivateOrLoopbackIp(peer)) return peer;

    auto trim = [](std::string s) {
        while (!s.empty() && (s.front() == ' ' || s.front() == '\t')) s.erase(s.begin());
        while (!s.empty() && (s.back() == ' ' || s.back() == '\t')) s.pop_back();
        return s;
    };

    const std::string real = trim(xRealIp);
    if (looksLikeIp(real)) return real;

    size_t end = xForwardedFor.size();
    while (end > 0) {
        const size_t comma = xForwardedFor.rfind(',', end - 1);
        const size_t start = comma == std::string::npos ? 0 : comma + 1;
        const std::string hop = trim(xForwardedFor.substr(start, end - start));
        if (!hop.empty()) return looksLikeIp(hop) ? hop : peer;
        if (comma == std::string::npos) break;
        end = comma;
    }
    return peer;
}

} // namespace Security
