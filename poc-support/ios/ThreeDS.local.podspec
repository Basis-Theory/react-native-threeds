Pod::Spec.new do |spec|
  spec.name = "ThreeDS"
  spec.version = "1.2.1"
  spec.summary = "Basis Theory iOS 3DS SDK"
  spec.homepage = "https://github.com/Basis-Theory/ios-threeds"
  spec.license = { type: "Apache-2.0", file: "LICENSE" }
  spec.author = { "Basis Theory" => "support@basistheory.com" }
  spec.source = { git: "https://github.com/Basis-Theory/ios-threeds.git", tag: spec.version.to_s }
  # CocoaPods packaging exists only for this local bridge POC. The published SDK
  # currently remains a Swift Package and should gain an official pod or another
  # supported React Native integration before production use.
  spec.platform = :ios, "15.0"
  spec.swift_version = "5.9"
  spec.source_files = "ThreeDS/Sources/ThreeDS/**/*.swift"
  # Package.swift normally downloads this binary target. The POC vendors the
  # checksum-verified XCFramework locally so CocoaPods can link the same SDK.
  spec.vendored_frameworks = "Vendor/Ravelin3DS.xcframework"
end
