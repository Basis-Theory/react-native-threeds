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

  # ios-threeds only ships through Swift Package Manager, so its sources are
  # vendored into ios/ThreeDS by scripts/vendor-threeds.sh and compiled into
  # this pod. Ravelin's binary SDK is not redistributed: it is downloaded from
  # Ravelin's release, matching the version ios-threeds pins in Package.swift,
  # and verified against that checksum.
  ravelin_url = 'https://ravelin.mycloudrepo.io/public/repositories/threeds2service-ios/release/2.0.0/Ravelin3DS.xcframework.zip'
  ravelin_sha256 = '6e2c68757ca1c6476156c6c069cfcc04998b017343034b4d30b58e660d62fc83'

  spec.prepare_command = <<-CMD
    set -e
    rm -rf Ravelin3DS.xcframework ravelin.zip
    curl -fsSL -o ravelin.zip "#{ravelin_url}"
    echo "#{ravelin_sha256}  ravelin.zip" | shasum -a 256 -c -
    ditto -x -k ravelin.zip .
    rm -f ravelin.zip
  CMD

  spec.source_files = source_files + ['ios/ThreeDS/*.swift']
  spec.vendored_frameworks = 'Ravelin3DS.xcframework'
end
