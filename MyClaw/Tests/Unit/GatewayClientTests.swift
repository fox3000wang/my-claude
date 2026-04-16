import XCTest
@testable import MyClaw

final class GatewayClientTests: XCTestCase {

    // MARK: - GatewayMessage Encoding

    func testMessageEncoding() throws {
        // Given - a request message
        let message = GatewayMessage.request(method: "connect", params: [
            "minProtocol": 3,
            "maxProtocol": 3
        ])

        // When
        let data = try JSONEncoder.gateway.encode(message)

        // Then
        XCTAssertFalse(data.isEmpty, "Encoded data should not be empty")

        let jsonObject = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        XCTAssertNotNil(jsonObject, "Encoded data should be valid JSON")
        XCTAssertEqual(jsonObject?["type"] as? String, "req", "Message type should be 'req'")
        XCTAssertEqual(jsonObject?["method"] as? String, "connect", "Method should be 'connect'")
        XCTAssertNotNil(jsonObject?["id"], "Request should have an id")
    }

    func testMessageEncodingRequestWithAllFields() throws {
        // Given
        let message = GatewayMessage.request(
            id: "test_id_123",
            method: "test.method",
            params: [
                "key1": "value1",
                "key2": 42,
                "nested": ["a": 1, "b": 2]
            ]
        )

        // When
        let data = try JSONEncoder.gateway.encode(message)
        let jsonString = String(data: data, encoding: .utf8)

        // Then
        XCTAssertNotNil(jsonString, "Should produce valid UTF-8 string")
        XCTAssertTrue(jsonString!.contains("test_id_123"), "Should contain the custom id")
        XCTAssertTrue(jsonString!.contains("test.method"), "Should contain the method")
    }

    func testMessageEncodingResponse() throws {
        // Given
        let message = GatewayMessage.response(
            id: "response_id_456",
            ok: true,
            payload: ["result": "success", "code": 200]
        )

        // When
        let data = try JSONEncoder.gateway.encode(message)
        let jsonObject = try JSONSerialization.jsonObject(with: data) as? [String: Any]

        // Then
        XCTAssertEqual(jsonObject?["type"] as? String, "res", "Message type should be 'res'")
        XCTAssertEqual(jsonObject?["id"] as? String, "response_id_456", "Response id should match")
    }

    func testMessageEncodingEvent() throws {
        // Given
        let message = GatewayMessage.event(
            event: "node.event",
            payload: ["eventType": "statusUpdate", "status": "online"]
        )

        // When
        let data = try JSONEncoder.gateway.encode(message)
        let jsonObject = try JSONSerialization.jsonObject(with: data) as? [String: Any]

        // Then
        XCTAssertEqual(jsonObject?["type"] as? String, "event", "Message type should be 'event'")
        XCTAssertEqual(jsonObject?["event"] as? String, "node.event", "Event name should match")
    }

    // MARK: - GatewayMessage Decoding

    func testMessageDecoding() throws {
        // Given
        let jsonString = """
        {
            "type": "req",
            "id": "decode_test_id",
            "method": "test.decode",
            "params": {
                "param1": "value1",
                "param2": 123
            }
        }
        """

        // When
        let data = jsonString.data(using: .utf8)!
        let message = try JSONDecoder.gateway.decode(GatewayMessage.self, from: data)

        // Then
        XCTAssertEqual(message.type, .req, "Message type should be 'req'")
        XCTAssertEqual(message.id, "decode_test_id", "ID should match")
        XCTAssertEqual(message.method, "test.decode", "Method should match")
        XCTAssertNotNil(message.params, "Params should not be nil")
    }

    func testMessageDecodingResponse() throws {
        // Given
        let jsonString = """
        {
            "type": "res",
            "id": "res_decode_789",
            "payload": {
                "result": "ok",
                "timestamp": 1234567890
            }
        }
        """

        // When
        let data = jsonString.data(using: .utf8)!
        let message = try JSONDecoder.gateway.decode(GatewayMessage.self, from: data)

        // Then
        XCTAssertEqual(message.type, .res, "Message type should be 'res'")
        XCTAssertEqual(message.id, "res_decode_789", "Response id should match")
        XCTAssertNotNil(message.payload, "Payload should not be nil")
    }

    func testMessageDecodingEvent() throws {
        // Given
        let jsonString = """
        {
            "type": "event",
            "event": "pairing.pending",
            "payload": {
                "deviceId": "device_abc",
                "timestamp": 9876543210
            }
        }
        """

        // When
        let data = jsonString.data(using: .utf8)!
        let message = try JSONDecoder.gateway.decode(GatewayMessage.self, from: data)

        // Then
        XCTAssertEqual(message.type, .event, "Message type should be 'event'")
        XCTAssertEqual(message.event, "pairing.pending", "Event name should match")
        XCTAssertNotNil(message.payload, "Payload should not be nil")
    }

    func testMessageDecodingRoundTrip() throws {
        // Given - encode then decode
        let original = GatewayMessage.request(
            id: "roundtrip_123",
            method: "connect",
            params: [
                "minProtocol": 3,
                "maxProtocol": 3,
                "caps": ["camera", "screen"]
            ]
        )

        // When
        let encodedData = try JSONEncoder.gateway.encode(original)
        let decoded = try JSONDecoder.gateway.decode(GatewayMessage.self, from: encodedData)

        // Then
        XCTAssertEqual(decoded.type, original.type, "Type should match after round-trip")
        XCTAssertEqual(decoded.id, original.id, "ID should match after round-trip")
        XCTAssertEqual(decoded.method, original.method, "Method should match after round-trip")
        XCTAssertEqual(decoded.params?.count, original.params?.count,
                      "Params count should match after round-trip")
    }

    // MARK: - GatewayMessage Factory Methods

    func testRequestFactoryMethod() {
        // When
        let message = GatewayMessage.request(method: "test.factory", params: ["key": "value"])

        // Then
        XCTAssertEqual(message.type, .req)
        XCTAssertNotNil(message.id)
        XCTAssertEqual(message.method, "test.factory")
    }

    func testResponseFactoryMethod() {
        // When
        let message = GatewayMessage.response(id: "resp_123", ok: true, payload: ["status": "ok"])

        // Then
        XCTAssertEqual(message.type, .res)
        XCTAssertEqual(message.id, "resp_123")
        XCTAssertNotNil(message.payload)
    }

    func testEventFactoryMethod() {
        // When
        let message = GatewayMessage.event(event: "test.event", payload: ["data": 42])

        // Then
        XCTAssertEqual(message.type, .event)
        XCTAssertEqual(message.event, "test.event")
        XCTAssertNotNil(message.payload)
    }

    // MARK: - ConnectRequest Encoding

    func testConnectRequestEncoding() throws {
        // Given
        let deviceInfo = ConnectRequest.DeviceInfo(
            id: "device_123",
            publicKey: "pk_abc123",
            signature: "sig_xyz",
            signedAt: 1234567890,
            nonce: "nonce_123"
        )

        let connectRequest = ConnectRequest(
            minProtocol: 3,
            maxProtocol: 3,
            client: ConnectRequest.ClientInfo(
                id: "myclaw-ios",
                version: "0.1.0",
                platform: "ios",
                mode: "node"
            ),
            role: "node",
            scopes: [],
            caps: ["camera", "screen"],
            commands: ["camera.capture", "screen.share"],
            permissions: ["camera": true, "screen": true],
            auth: ConnectRequest.AuthInfo(token: "tok_test123"),
            device: deviceInfo
        )

        // When
        let data = try JSONEncoder.gateway.encode(connectRequest)
        let jsonObject = try JSONSerialization.jsonObject(with: data) as? [String: Any]

        // Then
        XCTAssertEqual(jsonObject?["min_protocol"] as? Int, 3)
        XCTAssertEqual(jsonObject?["max_protocol"] as? Int, 3)
        XCTAssertEqual(jsonObject?["role"] as? String, "node")
        XCTAssertNotNil(jsonObject?["device"], "Device info should be present")
    }
}
