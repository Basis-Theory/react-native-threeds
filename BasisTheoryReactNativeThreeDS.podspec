require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |spec|
  spec.name         = 'BasisTheoryReactNativeThreeDS'
  spec.version      = package['version']
  spec.summary      = package['description']
  spec.homepage     = package['repository']['url']
  spec.license      = package['license']
  spec.authors      = package['author']
  spec.platforms    = { :ios => '15.0' }
  spec.source       = { :git => package['repository']['url'], :tag => spec.version.to_s }
  spec.swift_version = '5.9'

  if ENV['RCT_NEW_ARCH_ENABLED'] == '1'
    # The TurboModule host compiles the Codegen adapter and its Swift
    # implementation. Codegen supplies NativeBasisTheoryThreeDSSpec.
    source_files = [
      'ios/BasisTheoryThreeDSTurbo.{h,mm}',
      'ios/BasisTheoryThreeDSSwift.swift',
    ]
    install_modules_dependencies(spec)
  else
    # RN 0.74 does not need generated bindings. Compile only the handwritten
    # Bridge registration and implementation against React-Core.
    source_files = [
      'ios/BasisTheoryThreeDSBridge.m',
      'ios/BasisTheoryThreeDS.swift',
    ]
    spec.dependency 'React-Core'
  end

  # ThreeDS (github.com/Basis-Theory/ios-threeds) is a pure Swift Package
  # Manager package — it has no CocoaPods podspec, public or private, so
  # `spec.dependency 'ThreeDS'` cannot resolve it. Vendor its source and
  # binary framework directly instead of depending on it as a Pod.
  #
  # threeds_tag is the only thing to update by hand when ios-threeds ships a
  # new release. The Ravelin `.xcframework` URL is read out of that tag's own
  # Package.swift rather than hardcoded here, so it can never drift out of
  # sync with whichever ThreeDS version threeds_tag selects.
  threeds_tag = '1.2.1'

  spec.prepare_command = <<-CMD
    set -e
    rm -rf .threeds-src Ravelin3DS.xcframework ravelin.zip
    git clone --branch #{threeds_tag} --depth 1 https://github.com/Basis-Theory/ios-threeds.git .threeds-src
    RAVELIN_URL=$(grep -oE 'https://[^"]+\.zip' .threeds-src/ThreeDS/Package.swift | head -1)
    curl -L -o ravelin.zip "$RAVELIN_URL"
    ditto -x -k ravelin.zip .
    rm -f ravelin.zip
  CMD

  spec.source_files = source_files + ['.threeds-src/ThreeDS/Sources/ThreeDS/*.swift']
  spec.vendored_frameworks = 'Ravelin3DS.xcframework'
  spec.preserve_paths = ['.threeds-src/**/*']
end
