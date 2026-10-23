#pragma once
#include <string>
#include <vector>
#include <map>
#include <sstream>
#include <iostream>
#include <memory>
#include <iomanip>

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
            case realValue: os << real_val_; break;
            case stringValue: {
                os << "\"";
                for (char c : str_val_) {
                    if (c == '"') os << "\\\"";
                    else if (c == '\\') os << "\\\\";
                    else if (c == '\n') os << "\\n";
                    else if (c == '\r') os << "\\r";
                    else if (c == '\t') os << "\\t";
                    else os << c;
                }
                os << "\"";
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
                    os << "\"" << kv.first << "\": ";
                    kv.second.writeJson(os, indent + 2);
                }
                os << "}";
                break;
            }
        }
    }
};

// Simple JSON parser
inline bool parseJson(const std::string &str, Value &root) {
    // Basic JSON parser for objects and values
    size_t i = 0;
    auto skipWhitespace = [&]() {
        while (i < str.size() && (str[i] == ' ' || str[i] == '\t' || str[i] == '\n' || str[i] == '\r')) {
            i++;
        }
    };

    std::function<Value()> parseValue;

    auto parseString = [&]() -> std::string {
        if (str[i] == '"') i++;
        std::string s;
        while (i < str.size()) {
            if (str[i] == '\\' && i + 1 < str.size()) {
                i++;
                if (str[i] == 'n') s += '\n';
                else if (str[i] == 'r') s += '\r';
                else if (str[i] == 't') s += '\t';
                else s += str[i];
            } else if (str[i] == '"') {
                i++;
                break;
            } else {
                s += str[i];
            }
            i++;
        }
        return s;
    };

    auto parseObject = [&]() -> Value {
        Value obj(objectValue);
        i++; // skip '{'
        skipWhitespace();
        if (i < str.size() && str[i] == '}') {
            i++;
            return obj;
        }
        while (i < str.size()) {
            skipWhitespace();
            if (str[i] != '"') break;
            std::string key = parseString();
            skipWhitespace();
            if (i < str.size() && str[i] == ':') i++;
            skipWhitespace();
            Value val = parseValue();
            obj[key] = val;
            skipWhitespace();
            if (i < str.size() && str[i] == ',') {
                i++;
            } else if (i < str.size() && str[i] == '}') {
                i++;
                break;
            }
        }
        return obj;
    };

    auto parseArray = [&]() -> Value {
        Value arr(arrayValue);
        i++; // skip '['
        skipWhitespace();
        if (i < str.size() && str[i] == ']') {
            i++;
            return arr;
        }
        while (i < str.size()) {
            skipWhitespace();
            Value val = parseValue();
            arr.append(val);
            skipWhitespace();
            if (i < str.size() && str[i] == ',') {
                i++;
            } else if (i < str.size() && str[i] == ']') {
                i++;
                break;
            }
        }
        return arr;
    };

    parseValue = [&]() -> Value {
        skipWhitespace();
        if (i >= str.size()) return Value();
        char c = str[i];
        if (c == '{') return parseObject();
        if (c == '[') return parseArray();
        if (c == '"') return Value(parseString());
        if (c == 't' && str.substr(i, 4) == "true") { i += 4; return Value(true); }
        if (c == 'f' && str.substr(i, 5) == "false") { i += 5; return Value(false); }
        if (c == 'n' && str.substr(i, 4) == "null") { i += 4; return Value(); }
        // Number
        size_t start = i;
        if (str[i] == '-') i++;
        while (i < str.size() && (isdigit(str[i]) || str[i] == '.' || str[i] == 'e' || str[i] == 'E')) {
            i++;
        }
        std::string numStr = str.substr(start, i - start);
        if (numStr.find('.') != std::string::npos) {
            try { return Value(std::stod(numStr)); } catch (...) { return Value(0.0); }
        } else {
            try { return Value(std::stoll(numStr)); } catch (...) { return Value(0); }
        }
    };

    skipWhitespace();
    if (i < str.size()) {
        root = parseValue();
        return true;
    }
    return false;
}

class CharReaderBuilder {
public:
    std::string newCharReader() const { return ""; }
};

} // namespace Json
