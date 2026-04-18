Pod::Spec.new do |s|
  s.name         = "pretext-rn"
  s.version      = "0.1.0-alpha"
  s.summary      = "Synchronous text measurement for React Native using JSI"
  s.license      = { :type => "MIT" }
  s.authors      = { "pretext-rn" => "" }
  s.homepage     = "https://github.com/aku47z/pretext-rn"
  s.platforms    = { :ios => "13.0" }
  s.source       = { :git => "https://github.com/aku47z/pretext-rn.git", :tag => s.version }

  s.source_files = "ios/**/*.{h,m,mm}", "cpp/**/*.{h,cpp}"
  s.compiler_flags = "-std=c++17"

  s.dependency "React-Core"
  s.dependency "React-jsi"

  s.pod_target_xcconfig = {
    "CLANG_CXX_LANGUAGE_STANDARD" => "c++17",
    "HEADER_SEARCH_PATHS" => "$(PODS_TARGET_SRCROOT)/cpp"
  }
end
