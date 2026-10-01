//
//  ChallengeHandler.swift
//  ThreeDS
//
//  Created by kevin on 9/10/24.
//
import Ravelin3DS

class ChallengeHandler: ChallengeStatusReceiver {
    let sessionId: String
    let authenticationResponse: AuthenticationResponse
    let transactionStatusMap = [
        "Y": "successful",
        "A": "attempted",
        "N": "failed",
        "U": "unavailable",
        "R": "rejected",
    ]
    let onCompleted: (ChallengeResponse) -> Void
    let onFailure: (ChallengeResponse) -> Void

    init(
        sessionId: String,
        authenticationResponse: AuthenticationResponse,
        onCompleted: @escaping (ChallengeResponse) -> Void,
        onFailure: @escaping (ChallengeResponse) -> Void
    ) {
        self.sessionId = sessionId
        self.authenticationResponse = authenticationResponse
        self.onCompleted = onCompleted
        self.onFailure = onFailure
    }

    func completed(completionEvent: CompletionEvent) {
        if let transactionStatus = transactionStatusMap[completionEvent.getTransactionStatus()] {
            Logger.log("challenge completed with status: \(transactionStatus)")
            onCompleted(
                ChallengeResponse(
                    id: sessionId,
                    status: transactionStatus,
                    details: authenticationResponse.authenticationStatusReason
                )
            )
        } else {
            Logger.log("challenge failed successfully")
        }
    }

    func cancelled() {
        Logger.log("challenge cancelled")
        onFailure(
            ChallengeResponse(
                id: sessionId,
                status: "N",
                details: "Challenge cancelled"))
    }

    func timedout() {
        Logger.log("challenge timed out")
        onFailure(
            ChallengeResponse(
                id: sessionId,
                status: "N",
                details: "Challenge timed out"))
    }

    func protocolError(protocolErrorEvent: ProtocolErrorEvent) {
        Logger.log("challenge protocol error: \(protocolErrorEvent.getErrorMessage())")
        onFailure(
            ChallengeResponse(
                id: sessionId,
                status: "N",
                details: "ProtocolError \(protocolErrorEvent.getErrorMessage())"
            )
        )
    }

    func runtimeError(runtimeErrorEvent: RuntimeErrorEvent) {
        Logger.log("challenge runtime error: \(runtimeErrorEvent.getErrorMessage())")
        onFailure(
            ChallengeResponse(
                id: sessionId,
                status: "N",
                details: "RuntimeError \(runtimeErrorEvent.getErrorMessage())"
            )
        )
    }
}
