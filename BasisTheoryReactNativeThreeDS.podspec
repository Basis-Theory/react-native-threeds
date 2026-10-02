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

  # The Bridge is compiled on both architectures; the new architecture runs it
  # through React Native's interop layer, as on Android.
  source_files = [
    'ios/BasisTheoryThreeDSBridge.m',
    'ios/BasisTheoryThreeDS.swift',
  ]

  if ENV['RCT_NEW_ARCH_ENABLED'] == '1'
    # The new architecture adds the Codegen TurboModule and its Swift
    # implementation. Codegen supplies NativeBasisTheoryThreeDSSpec.
    source_files += [
      'ios/BasisTheoryThreeDSTurbo.{h,mm}',
      'ios/BasisTheoryThreeDSSwift.swift',
    ]
    install_modules_dependencies(spec)
  else
    spec.dependency 'React-Core'
  end

  # ios-threeds only ships through Swift Package Manager, so its sources are
  # vendored into ios/ThreeDS by scripts/vendor-threeds.sh and compiled into
  # this pod. Ravelin's binary SDK is not redistributed: it is downloaded from
  # Ravelin's release, matching the version ios-threeds pins in Package.swift,
  # and verified against that checksum.
  ravelin_url = 'https://ravelin.mycloudrepo.io/public/repositories/threeds2service-ios/release/2.0.0/Ravelin3DS.xcframework.zip'
  ravelin_sha256 = '6e2c68757ca1c6476156c6c069cfcc04998b017343034b4d30b58e660d62fc83'

  # CocoaPods runs this on every `pod install` for path pods, which is how apps
  # install this one from node_modules. The stamp records the verified
  # checksum, so an unchanged Ravelin isn't downloaded again.
  spec.prepare_command = <<-CMD
    set -e
    stamp=.ravelin3ds.sha256
    if [ -d Ravelin3DS.xcframework ] && [ -f "$stamp" ] && [ "$(cat "$stamp")" = "#{ravelin_sha256}" ]; then
      exit 0
    fi
    rm -rf Ravelin3DS.xcframework ravelin.zip "$stamp"
    curl -fsSL -o ravelin.zip "#{ravelin_url}"
    echo "#{ravelin_sha256}  ravelin.zip" | shasum -a 256 -c -
    ditto -x -k ravelin.zip .
    rm -f ravelin.zip
    echo "#{ravelin_sha256}" > "$stamp"
  CMD

  spec.source_files = source_files + ['ios/ThreeDS/*.swift']
  spec.vendored_frameworks = 'Ravelin3DS.xcframework'
end
