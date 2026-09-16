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
    spec.source_files = [
      'ios/BasisTheoryThreeDSTurbo.{h,mm}',
      'ios/BasisTheoryThreeDSSwift.swift',
    ]
    install_modules_dependencies(spec)
  else
    # RN 0.74 does not need generated bindings. Compile only the handwritten
    # Bridge registration and implementation against React-Core.
    spec.source_files = [
      'ios/BasisTheoryThreeDSBridge.m',
      'ios/BasisTheoryThreeDS.swift',
    ]
    spec.dependency 'React-Core'
  end

  spec.dependency 'ThreeDS', '1.2.1'
end
