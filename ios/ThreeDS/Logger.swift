//
//  OSLogger.swift
//  ThreeDS
//
//  Created by kevin on 9/10/24.
//

import OSLog

enum Logger {
    private static let subsystem = Bundle.main.bundleIdentifier!
    private static let sdk = OSLog(subsystem: subsystem, category: "sdk")

    static func log(_ text: String, type: OSLogType = .default) {
        os_log("%@", log: Logger.sdk, type: type, text)
    }
}
