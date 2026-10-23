#pragma once
#include "drogon.h"

namespace drogon {

template <typename T>
class HttpController {
public:
    virtual ~HttpController() = default;
};

// Route registry macros
#define METHOD_LIST_BEGIN
#define ADD_METHOD_TO(method, path, ...)
#define METHOD_LIST_END

} // namespace drogon
