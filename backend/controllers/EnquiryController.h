#pragma once
#include <drogon/HttpController.h>

class EnquiryController : public drogon::HttpController<EnquiryController> {
public:
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(EnquiryController::createEnquiry, "/api/v1/enquiries", drogon::Post, drogon::Options);
    ADD_METHOD_TO(EnquiryController::listEnquiries, "/api/v1/enquiries", drogon::Get);
    METHOD_LIST_END

    void createEnquiry(const drogon::HttpRequestPtr &req,
                       std::function<void(const drogon::HttpResponsePtr &)> &&callback);

    void listEnquiries(const drogon::HttpRequestPtr &req,
                       std::function<void(const drogon::HttpResponsePtr &)> &&callback);
};
