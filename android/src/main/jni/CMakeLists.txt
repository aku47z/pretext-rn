cmake_minimum_required(VERSION 3.13)

project(pretextmeasure)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

if(NOT DEFINED REACT_NATIVE_DIR)
  message(FATAL_ERROR "REACT_NATIVE_DIR must be provided by Gradle.")
endif()

add_library(pretextmeasure SHARED
  ../../../../cpp/PretextInstall.cpp
  ${REACT_NATIVE_DIR}/ReactCommon/jsi/jsi/jsi.cpp
  PretextInstallJNI.cpp
  PretextTextMeasureAndroid.cpp
)

target_include_directories(pretextmeasure PRIVATE
  ../../../../cpp
  ${REACT_NATIVE_DIR}/ReactCommon/jsi
)

find_library(log-lib log)

target_link_libraries(pretextmeasure
  ${log-lib}
  android
)
