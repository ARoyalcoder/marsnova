#pragma once
#include <string>
#include <vector>
#include <map>
#include <sstream>
#include <iostream>
#include <memory>
#include <iomanip>
#include <cmath>
#include <cerrno>
#include <cstdio>
#include <cstdlib>
#include <cstring>

namespace Json {

enum ValueType {
    nullValue = 0,
    intValue,
    uintValue,
    realValue,
    stringValue,
    booleanValue,
    arrayValue,
    objectValue
};

namespace detail {

// JSON string output: escapes quotes, backslashes and every control character, and replaces any
// invalid UTF-8 byte sequence with U+FFFD, so the result is always valid JSON no matter what text
// a client submitted.
inline void writeString(std::ostream &os, const std::string &s) {
    static const char *hex = "0123456789abcdef";
    os << '"';
    for (size_t i = 0; i < s.size();) {
        const unsigned char c = static_cast<unsigned char>(s[i]);
        if (c == '"') { os << "\\\""; ++i; }
        else if (c == '\\') { os << "\\\\"; ++i; }
        else if (c == '\n') { os << "\\n"; ++i; }
        else if (c == '\r') { os << "\\r"; ++i; }
        else if (c == '\t') { os << "\\t"; ++i; }
        else if (c == '\b') { os << "\\b"; ++i; }
        else if (c == '\f') { os << "\\f"; ++i; }
        else if (c < 0x20) { os << "\\u00" << hex[c >> 4] << hex[c & 0x0f]; ++i; }
        else if (c < 0x80) { os << static_cast<char>(c); ++i; }
        else {
            int len = 0;
            if (c >= 0xC2 && c <= 0xDF) len = 2;
            else if (c >= 0xE0 && c <= 0xEF) len = 3;
            else if (c >= 0xF0 && c <= 0xF4) len = 4;
            bool ok = len > 0 && i + static_cast<size_t>(len) <= s.size();
            for (int k = 1; ok && k < len; ++k) ok = (static_cast<unsigned char>(s[i + k]) & 0xC0) == 0x80;
            if (ok && len >= 3) {
                const unsigned char c1 = static_cast<unsigned char>(s[i + 1]);
                if (len == 3 && ((c == 0xE0 && c1 < 0xA0) || (c == 0xED && c1 >= 0xA0))) ok = false;  // overlong / surrogate
                if (len == 4 && ((c == 0xF0 && c1 < 0x90) || (c == 0xF4 && c1 >= 0x90))) ok = false;  // overlong / > U+10FFFF
            }
            if (ok) { os.write(s.data() + i, len); i += static_cast<size_t>(len); }
            else { os << "\\ufffd"; ++i; }
        }
    }
    os << '"';
}

// Shortest decimal text that parses back to exactly the same double (the default stream
// precision of 6 digits silently rounded 1234567.89 to "1.23457e+06"). NaN and Infinity are not
// valid JSON, so they become null.
inline std::string formatDouble(double d) {
    if (!std::isfinite(d)) return "null";
    char buf[40];
    for (int precision = 15; precision <= 17; ++precision) {
        std::snprintf(buf, sizeof(buf), "%.*g", precision, d);
        if (std::strtod(buf, nullptr) == d) break;
    }
    return buf;
}

}  // namespace detail

class Value {
public:
    ValueType type_{nullValue};
    std::string str_val_{""};
    long long int_val_{0};
    double real_val_{0.0};
    bool bool_val_{false};
    std::vector<Value> arr_val_{};
    std::map<std::string, Value> obj_val_{};

    Value() : type_(nullValue) {}
    Value(ValueType t) : type_(t) {}
    Value(const std::string &s) : type_(stringValue), str_val_(s) {}
    Value(const char *s) : type_(stringValue), str_val_(s ? s : "") {}
    Value(int i) : type_(intValue), int_val_(i), real_val_(i) {}
    Value(long long i) : type_(intValue), int_val_(i), real_val_(static_cast<double>(i)) {}
    Value(double d) : type_(realValue), real_val_(d), int_val_(static_cast<long long>(d)) {}
    Value(bool b) : type_(booleanValue), bool_val_(b) {}

    Value &operator[](const std::string &key) {
        if (type_ != objectValue) {
            type_ = objectValue;
            obj_val_.clear();
        }
        return obj_val_[key];
    }

    const Value &operator[](const std::string &key) const {
        static const Value nullVal;
        auto it = obj_val_.find(key);
        if (it != obj_val_.end()) return it->second;
        return nullVal;
    }

    Value &operator[](const char *key) {
        return (*this)[std::string(key)];
    }

    const Value &operator[](const char *key) const {
        return (*this)[std::string(key)];
    }

    Value &operator[](int index) {
        return (*this)[static_cast<size_t>(index)];
    }

    const Value &operator[](int index) const {
        return (*this)[static_cast<size_t>(index)];
    }

    Value &operator[](size_t index) {
        if (type_ != arrayValue) {
            type_ = arrayValue;
            arr_val_.clear();
        }
        if (index >= arr_val_.size()) {
            arr_val_.resize(index + 1);
        }
        return arr_val_[index];
    }

    const Value &operator[](size_t index) const {
        static const Value nullVal;
        if (index < arr_val_.size()) return arr_val_[index];
        return nullVal;
    }

    void append(const Value &val) {
        if (type_ != arrayValue) {
            type_ = arrayValue;
        }
        arr_val_.push_back(val);
    }

    size_t size() const {
        if (type_ == arrayValue) return arr_val_.size();
        if (type_ == objectValue) return obj_val_.size();
        return 0;
    }

    bool isMember(const std::string &key) const {
        return obj_val_.find(key) != obj_val_.end();
    }

    Value get(const std::string &key, const Value &defaultValue) const {
        auto it = obj_val_.find(key);
        if (it != obj_val_.end()) return it->second;
        return defaultValue;
    }

    std::string asString() const {
        if (type_ == stringValue) return str_val_;
        if (type_ == intValue) return std::to_string(int_val_);
        if (type_ == realValue) return std::to_string(real_val_);
        if (type_ == booleanValue) return bool_val_ ? "true" : "false";
        return "";
    }

    int asInt() const {
        if (type_ == intValue) return static_cast<int>(int_val_);
        if (type_ == realValue) return static_cast<int>(real_val_);
        if (type_ == stringValue) {
            try { return std::stoi(str_val_); } catch (...) { return 0; }
        }
        if (type_ == booleanValue) return bool_val_ ? 1 : 0;
        return 0;
    }

    long long asInt64() const {
        if (type_ == intValue) return int_val_;
        if (type_ == realValue) return static_cast<long long>(real_val_);
        if (type_ == stringValue) {
            try { return std::stoll(str_val_); } catch (...) { return 0; }
        }
        if (type_ == booleanValue) return bool_val_ ? 1 : 0;
        return 0;
    }

    double asDouble() const {
        if (type_ == realValue) return real_val_;
        if (type_ == intValue) return static_cast<double>(int_val_);
        if (type_ == stringValue) {
            try { return std::stod(str_val_); } catch (...) { return 0.0; }
        }
        return 0.0;
    }

    bool asBool() const {
        if (type_ == booleanValue) return bool_val_;
        if (type_ == intValue) return int_val_ != 0;
        if (type_ == stringValue) return str_val_ == "true" || str_val_ == "1";
        return false;
    }

    bool isObject() const { return type_ == objectValue; }
    bool isArray() const { return type_ == arrayValue; }
    bool isString() const { return type_ == stringValue; }
    bool isBool() const { return type_ == booleanValue; }
    bool isInt() const { return type_ == intValue; }
    bool isNumeric() const { return type_ == intValue || type_ == realValue; }
    bool isNull() const { return type_ == nullValue; }

    std::string toStyledString() const {
        std::ostringstream ss;
        writeJson(ss, 0);
        return ss.str();
    }

    // Simple JSON serializer
    void writeJson(std::ostream &os, int indent = 0) const {
        switch (type_) {
            case nullValue: os << "null"; break;
            case booleanValue: os << (bool_val_ ? "true" : "false"); break;
            case intValue: os << int_val_; break;
            case realValue: os << detail::formatDouble(real_val_); break;
            case stringValue: {
                detail::writeString(os, str_val_);
                break;
            }
            case arrayValue: {
                os << "[";
                for (size_t i = 0; i < arr_val_.size(); ++i) {
                    if (i > 0) os << ", ";
                    arr_val_[i].writeJson(os, indent + 2);
                }
                os << "]";
                break;
            }
            case objectValue: {
                os << "{";
                size_t i = 0;
                for (const auto &kv : obj_val_) {
                    if (i++ > 0) os << ", ";
                    detail::writeString(os, kv.first);
                    os << ": ";
                    kv.second.writeJson(os, indent + 2);
                }
                os << "}";
                break;
            }
        }
    }
};

namespace detail {

// Strict RFC 8259 parser (plus // and /* */ comments and a leading UTF-8 BOM, which jsoncpp also
// accepts). Every loop either consumes input or fails, nesting depth and node count are capped,
// and any syntax error makes parseJson return false. The previous parser never advanced on an
// unexpected character inside an array, so a 3-byte body such as `[x]` spun a thread forever
// while appending to memory, and 20,000 nested `[` overflowed the stack and killed the process.
class Parser {
public:
    explicit Parser(const std::string &text) : s_(text) {}

    bool parse(Value &out) {
        if (s_.size() >= 3 && static_cast<unsigned char>(s_[0]) == 0xEF && static_cast<unsigned char>(s_[1]) == 0xBB &&
            static_cast<unsigned char>(s_[2]) == 0xBF) {
            i_ = 3;
        }
        if (!skipSpace() || i_ >= s_.size()) return false;
        Value v;
        if (!parseValue(v, 0)) return false;
        if (!skipSpace() || i_ != s_.size()) return false;  // trailing garbage
        out = std::move(v);
        return true;
    }

private:
    static constexpr int kMaxDepth = 128;
    static constexpr size_t kMaxNodes = 200000;

    const std::string &s_;
    size_t i_{0};
    size_t nodes_{0};

    static bool isDigit(char c) { return c >= '0' && c <= '9'; }

    // Returns false only for an unterminated block comment.
    bool skipSpace() {
        for (;;) {
            while (i_ < s_.size() && (s_[i_] == ' ' || s_[i_] == '\t' || s_[i_] == '\n' || s_[i_] == '\r')) ++i_;
            if (i_ + 1 < s_.size() && s_[i_] == '/' && s_[i_ + 1] == '/') {
                while (i_ < s_.size() && s_[i_] != '\n') ++i_;
                continue;
            }
            if (i_ + 1 < s_.size() && s_[i_] == '/' && s_[i_ + 1] == '*') {
                const size_t end = s_.find("*/", i_ + 2);
                if (end == std::string::npos) return false;
                i_ = end + 2;
                continue;
            }
            return true;
        }
    }

    bool matchLiteral(const char *literal) {
        const size_t len = std::strlen(literal);
        if (s_.compare(i_, len, literal) == 0) {
            i_ += len;
            return true;
        }
        return false;
    }

    bool parseValue(Value &out, int depth) {
        if (depth > kMaxDepth || ++nodes_ > kMaxNodes) return false;
        if (!skipSpace() || i_ >= s_.size()) return false;
        const char c = s_[i_];
        if (c == '{') return parseObject(out, depth + 1);
        if (c == '[') return parseArray(out, depth + 1);
        if (c == '"') {
            std::string str;
            if (!parseString(str)) return false;
            out = Value(str);
            return true;
        }
        if (matchLiteral("true")) { out = Value(true); return true; }
        if (matchLiteral("false")) { out = Value(false); return true; }
        if (matchLiteral("null")) { out = Value(); return true; }
        return parseNumber(out);
    }

    bool parseObject(Value &out, int depth) {
        out = Value(objectValue);
        ++i_;  // '{'
        if (!skipSpace()) return false;
        if (i_ < s_.size() && s_[i_] == '}') { ++i_; return true; }
        for (;;) {
            if (!skipSpace() || i_ >= s_.size() || s_[i_] != '"') return false;
            std::string key;
            if (!parseString(key)) return false;
            if (!skipSpace() || i_ >= s_.size() || s_[i_] != ':') return false;
            ++i_;
            Value child;
            if (!parseValue(child, depth)) return false;
            out.obj_val_[key] = std::move(child);
            if (!skipSpace() || i_ >= s_.size()) return false;
            if (s_[i_] == ',') { ++i_; continue; }
            if (s_[i_] == '}') { ++i_; return true; }
            return false;
        }
    }

    bool parseArray(Value &out, int depth) {
        out = Value(arrayValue);
        ++i_;  // '['
        if (!skipSpace()) return false;
        if (i_ < s_.size() && s_[i_] == ']') { ++i_; return true; }
        for (;;) {
            Value child;
            if (!parseValue(child, depth)) return false;
            out.arr_val_.push_back(std::move(child));
            if (!skipSpace() || i_ >= s_.size()) return false;
            if (s_[i_] == ',') { ++i_; continue; }
            if (s_[i_] == ']') { ++i_; return true; }
            return false;
        }
    }

    bool parseHex4(unsigned &cp) {
        if (i_ + 4 > s_.size()) return false;
        unsigned v = 0;
        for (int k = 0; k < 4; ++k) {
            const char h = s_[i_ + static_cast<size_t>(k)];
            v <<= 4;
            if (h >= '0' && h <= '9') v |= static_cast<unsigned>(h - '0');
            else if (h >= 'a' && h <= 'f') v |= static_cast<unsigned>(h - 'a' + 10);
            else if (h >= 'A' && h <= 'F') v |= static_cast<unsigned>(h - 'A' + 10);
            else return false;
        }
        i_ += 4;
        cp = v;
        return true;
    }

    static void appendUtf8(std::string &out, unsigned cp) {
        if (cp < 0x80) {
            out.push_back(static_cast<char>(cp));
        } else if (cp < 0x800) {
            out.push_back(static_cast<char>(0xC0 | (cp >> 6)));
            out.push_back(static_cast<char>(0x80 | (cp & 0x3F)));
        } else if (cp < 0x10000) {
            out.push_back(static_cast<char>(0xE0 | (cp >> 12)));
            out.push_back(static_cast<char>(0x80 | ((cp >> 6) & 0x3F)));
            out.push_back(static_cast<char>(0x80 | (cp & 0x3F)));
        } else {
            out.push_back(static_cast<char>(0xF0 | (cp >> 18)));
            out.push_back(static_cast<char>(0x80 | ((cp >> 12) & 0x3F)));
            out.push_back(static_cast<char>(0x80 | ((cp >> 6) & 0x3F)));
            out.push_back(static_cast<char>(0x80 | (cp & 0x3F)));
        }
    }

    bool parseString(std::string &out) {
        ++i_;  // opening quote
        out.clear();
        while (i_ < s_.size()) {
            const char c = s_[i_++];
            if (c == '"') return true;
            if (c != '\\') { out.push_back(c); continue; }
            if (i_ >= s_.size()) return false;
            const char e = s_[i_++];
            switch (e) {
                case '"': out.push_back('"'); break;
                case '\\': out.push_back('\\'); break;
                case '/': out.push_back('/'); break;
                case 'b': out.push_back('\b'); break;
                case 'f': out.push_back('\f'); break;
                case 'n': out.push_back('\n'); break;
                case 'r': out.push_back('\r'); break;
                case 't': out.push_back('\t'); break;
                case 'u': {
                    unsigned cp = 0;
                    if (!parseHex4(cp)) return false;
                    if (cp >= 0xD800 && cp <= 0xDBFF) {
                        // High surrogate: combine with a following low surrogate, else U+FFFD.
                        unsigned low = 0;
                        const size_t save = i_;
                        if (i_ + 1 < s_.size() && s_[i_] == '\\' && s_[i_ + 1] == 'u') {
                            i_ += 2;
                            if (parseHex4(low) && low >= 0xDC00 && low <= 0xDFFF) {
                                cp = 0x10000 + ((cp - 0xD800) << 10) + (low - 0xDC00);
                            } else {
                                i_ = save;
                                cp = 0xFFFD;
                            }
                        } else {
                            cp = 0xFFFD;
                        }
                    } else if (cp >= 0xDC00 && cp <= 0xDFFF) {
                        cp = 0xFFFD;  // lone low surrogate
                    }
                    appendUtf8(out, cp);
                    break;
                }
                default:
                    return false;  // unknown escape
            }
        }
        return false;  // unterminated string
    }

    bool parseNumber(Value &out) {
        const size_t start = i_;
        if (i_ < s_.size() && s_[i_] == '-') ++i_;
        if (i_ >= s_.size()) return false;
        if (s_[i_] == '0') {
            ++i_;
        } else if (s_[i_] >= '1' && s_[i_] <= '9') {
            while (i_ < s_.size() && isDigit(s_[i_])) ++i_;
        } else {
            return false;
        }
        bool isReal = false;
        if (i_ < s_.size() && s_[i_] == '.') {
            isReal = true;
            ++i_;
            const size_t digits = i_;
            while (i_ < s_.size() && isDigit(s_[i_])) ++i_;
            if (i_ == digits) return false;
        }
        if (i_ < s_.size() && (s_[i_] == 'e' || s_[i_] == 'E')) {
            isReal = true;
            ++i_;
            if (i_ < s_.size() && (s_[i_] == '+' || s_[i_] == '-')) ++i_;
            const size_t digits = i_;
            while (i_ < s_.size() && isDigit(s_[i_])) ++i_;
            if (i_ == digits) return false;
        }
        const std::string text = s_.substr(start, i_ - start);
        if (!isReal) {
            errno = 0;
            const long long v = std::strtoll(text.c_str(), nullptr, 10);
            if (errno != ERANGE) { out = Value(v); return true; }
        }
        const double d = std::strtod(text.c_str(), nullptr);
        if (!std::isfinite(d)) return false;
        out = Value(d);
        return true;
    }
};

}  // namespace detail

inline bool parseJson(const std::string &str, Value &root) {
    detail::Parser parser(str);
    return parser.parse(root);
}

class CharReaderBuilder {
public:
    std::string newCharReader() const { return ""; }
};

} // namespace Json
