🧪 [testing improvement] ChatService testing improvements

🎯 What:
- Addressed the testing gap in `ChatController.java` by adding comprehensive tests for its REST API endpoints and WebSocket `sendMessage` logic.
- Rewrote the `ChatServiceTest.java` to align with the current `ChatService` interface since the outdated test previously broke compilation when running the suite.
- Added explicit `@PathVariable("channelId")` / `@PathVariable("userId")` to `ChatController.java` endpoints to satisfy the Spring Boot parameter binding validation exception thrown during test context loading.

📊 Coverage:
- `ChatControllerTest`: Covers GET requests for `/api/v1/chat/channel/{channelId}`, `/api/v1/chat/user/{userId}`, and `/api/v1/chat/health` verifying standard JSON responses. Also tests `@MessageMapping("/chat.sendMessage")` logic by verifying that the `SimpMessagingTemplate` invokes `convertAndSend` to the correct topic for channels and `convertAndSendToUser` for DMs.
- `ChatServiceTest`: Tests all updated `ChatService` persistence logic, history retrieval, fallback circuit-breaker behaviors, and edge cases.

✨ Result:
- The tests for `chat-service` pass completely (11/11 tests pass with no failures).
- Increased overall codebase health and reliability by bridging a key missing coverage area in real-time messaging.
