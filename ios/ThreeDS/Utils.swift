//
//  ChallengeViewImplementation.swift
//  ThreeDS
//
//  Created by kevin on 9/10/24.
//
import Ravelin3DS

class ChallengeViewImplementation: ChallengeView {
    private(set) var viewController: UIViewController

    init(viewController: UIViewController) {
        self.viewController = viewController
    }
}

public struct ThreeDSWarning {
    public let message: String
}

struct RavelinKeys: Codable {
    let test: String
    let live: String
}

enum RenderOptions: String {
    case native = "01"

    func toRavelinCode() -> String {
        return self.rawValue
    }
}

enum UiTypes: String {
    case textField = "01"
    case singleSelectField = "02"
    case multiSelectField = "03"
    case oob = "04"

    func toRavelinCode() -> String {
        return self.rawValue
    }
}

enum RegionEnum {
    case EU, US
}
