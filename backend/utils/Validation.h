#pragma once
#include <string>
#include <cstddef>

// Input validators shared by every controller.
//
// They are plain linear scans with hard length caps on purpose. The std::regex versions they
// replace recurse once per input character in libstdc++, so a single request carrying a ~20 KB
// email address overflowed the stack and killed the whole server process (verified), and the
// old email pattern also rejected common real addresses such as anita@my-studio.in,
// first-last@gmail.com and name+tag@gmail.com.
namespace Validation {

namespace detail {

inline bool isAlnum(char c) {
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9');
}

inline bool isAlpha(char c) {
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
}

inline bool isDigit(char c) {
    return c >= '0' && c <= '9';
}

// Characters RFC 5322 allows in an unquoted local part (besides '.', handled separately).
inline bool isLocalChar(char c) {
    if (isAlnum(c)) return true;
    switch (c) {
        case '!': case '#': case '$': case '%': case '&': case '\'': case '*': case '+':
        case '/': case '=': case '?': case '^': case '_': case '`': case '{': case '|':
        case '}': case '~': case '-':
            return true;
        default:
            return false;
    }
}

}  // namespace detail

// RFC 5321 limits: whole address <= 254, local part <= 64, domain <= 253, labels <= 63.
inline bool isValidEmail(const std::string &email) {
    if (email.size() < 6 || email.size() > 254) return false;  // shortest real address is a@b.co

    const size_t at = email.find('@');
    if (at == std::string::npos || at == 0 || at > 64) return false;
    if (email.find('@', at + 1) != std::string::npos) return false;

    // Local part: dot-separated atoms, no leading/trailing/double dots.
    if (email[0] == '.' || email[at - 1] == '.') return false;
    for (size_t i = 0; i < at; ++i) {
        const char c = email[i];
        if (c == '.') {
            if (i > 0 && email[i - 1] == '.') return false;
        } else if (!detail::isLocalChar(c)) {
            return false;
        }
    }

    // Domain: at least two labels, each 1-63 chars of letters/digits/hyphen, not starting or
    // ending with a hyphen. The last label (TLD) is at least two chars and not all digits.
    const size_t domainStart = at + 1;
    const size_t domainLen = email.size() - domainStart;
    if (domainLen < 4 || domainLen > 253) return false;

    size_t labelStart = domainStart;
    size_t labels = 0;
    for (size_t i = domainStart; i <= email.size(); ++i) {
        if (i == email.size() || email[i] == '.') {
            const size_t len = i - labelStart;
            if (len == 0 || len > 63) return false;
            if (email[labelStart] == '-' || email[i - 1] == '-') return false;
            bool allDigits = true;
            for (size_t k = labelStart; k < i; ++k) {
                if (!detail::isAlnum(email[k]) && email[k] != '-') return false;
                if (!detail::isDigit(email[k])) allDigits = false;
            }
            ++labels;
            if (i == email.size() && (len < 2 || allDigits)) return false;
            labelStart = i + 1;
        }
    }
    return labels >= 2;
}

// Lowercase letters/digits separated by single hyphens: ^[a-z0-9]+(-[a-z0-9]+)*$
inline bool isValidSlug(const std::string &slug, size_t maxLen = 120) {
    if (slug.empty() || slug.size() > maxLen) return false;
    if (slug.front() == '-' || slug.back() == '-') return false;
    for (size_t i = 0; i < slug.size(); ++i) {
        const char c = slug[i];
        if (c == '-') {
            if (slug[i - 1] == '-') return false;
        } else if (!((c >= 'a' && c <= 'z') || detail::isDigit(c))) {
            return false;
        }
    }
    return true;
}

// Non-negative money amount with at most two decimals: ^[0-9]+(\.[0-9]{1,2})?$
inline bool isValidDecimalAmount(const std::string &raw, size_t maxLen = 32) {
    if (raw.empty() || raw.size() > maxLen) return false;
    const size_t dot = raw.find('.');
    const size_t intEnd = dot == std::string::npos ? raw.size() : dot;
    if (intEnd == 0) return false;
    for (size_t i = 0; i < intEnd; ++i) {
        if (!detail::isDigit(raw[i])) return false;
    }
    if (dot == std::string::npos) return true;
    const size_t fracLen = raw.size() - dot - 1;
    if (fracLen < 1 || fracLen > 2) return false;
    for (size_t i = dot + 1; i < raw.size(); ++i) {
        if (!detail::isDigit(raw[i])) return false;
    }
    return true;
}

}  // namespace Validation
