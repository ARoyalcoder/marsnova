cmake_minimum_required(VERSION 3.15)
project(marsnova_backend CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find Drogon or fall back to standalone compatibility
find_package(Drogon CONFIG QUIET)

if(Drogon_FOUND)
    message(STATUS "Found Drogon package: ${Drogon_DIR}")
    add_executable(marsnova_backend
        main.cc
        controllers/EnquiryController.cc
        controllers/RecoveryController.cc
        controllers/HealthController.cc
        controllers/CatalogController.cc
        controllers/LeadController.cc
        controllers/AuthController.cc
        controllers/QuotationController.cc
        controllers/ProjectController.cc
        controllers/ContentController.cc
        controllers/LearningController.cc
        services/WhatsAppNotificationService.cc
    )
    target_include_directories(marsnova_backend PRIVATE ${CMAKE_CURRENT_SOURCE_DIR})
    target_link_libraries(marsnova_backend PRIVATE Drogon::Drogon)
else()
    message(STATUS "Drogon package not found; configuring standalone compatibility build")
    add_executable(marsnova_backend
        main.cc
        controllers/EnquiryController.cc
        controllers/RecoveryController.cc
        controllers/HealthController.cc
        controllers/CatalogController.cc
        controllers/LeadController.cc
        controllers/AuthController.cc
        controllers/QuotationController.cc
        controllers/ProjectController.cc
        controllers/ContentController.cc
        controllers/LearningController.cc
        services/WhatsAppNotificationService.cc
        compat/drogon_standalone.cc
    )
    target_include_directories(marsnova_backend PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/compat
        ${CMAKE_CURRENT_SOURCE_DIR}
    )
    if(WIN32)
        target_link_libraries(marsnova_backend PRIVATE ws2_32)
    endif()
endif()

# Standalone smoke test executable
add_executable(smoke_test
    tests/smoke_test.cc
    controllers/EnquiryController.cc
    controllers/RecoveryController.cc
    controllers/HealthController.cc
    controllers/CatalogController.cc
    controllers/LeadController.cc
    controllers/AuthController.cc
    controllers/QuotationController.cc
    controllers/ProjectController.cc
    controllers/ContentController.cc
    controllers/LearningController.cc
    services/WhatsAppNotificationService.cc
    compat/drogon_standalone.cc
)
target_include_directories(smoke_test PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/compat
    ${CMAKE_CURRENT_SOURCE_DIR}
)
if(WIN32)
    target_link_libraries(smoke_test PRIVATE ws2_32)
endif()

# Standalone concurrency benchmark executable
add_executable(benchmark
    benchmark.cc
    controllers/EnquiryController.cc
    controllers/RecoveryController.cc
    controllers/HealthController.cc
    controllers/CatalogController.cc
    controllers/LeadController.cc
    controllers/AuthController.cc
    controllers/QuotationController.cc
    controllers/ProjectController.cc
    controllers/ContentController.cc
    controllers/LearningController.cc
    services/WhatsAppNotificationService.cc
    compat/drogon_standalone.cc
)
target_include_directories(benchmark PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/compat
    ${CMAKE_CURRENT_SOURCE_DIR}
)
if(WIN32)
    target_link_libraries(benchmark PRIVATE ws2_32)
endif()
