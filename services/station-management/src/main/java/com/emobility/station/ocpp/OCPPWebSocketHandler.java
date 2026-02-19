package com.emobility.station.ocpp;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * OCPP WebSocket Handler for Charge Point communication
 * OCPP 1.6/2.0 protocol implementation
 * Documentation: https://www.openchargealliance.org/
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class OCPPWebSocketHandler extends TextWebSocketHandler {

    private final ObjectMapper objectMapper;
    private final Map<String, WebSocketSession> chargePointSessions = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String chargePointId = extractChargePointId(session);
        chargePointSessions.put(chargePointId, session);
        log.info("Charge Point connected: {} from {}", chargePointId, session.getRemoteAddress());
        
        // Send welcome message (OCPP BootNotification response)
        sendBootNotificationResponse(session, chargePointId);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String chargePointId = extractChargePointId(session);
        String payload = message.getPayload();
        
        log.debug("Received OCPP message from {}: {}", chargePointId, payload);
        
        try {
            JsonNode jsonNode = objectMapper.readTree(payload);
            String action = jsonNode.has(0) ? jsonNode.get(0).asText() : "";
            String messageId = jsonNode.has(1) ? jsonNode.get(1).asText() : "";
            
            handleOCPPMessage(chargePointId, action, jsonNode, session);
        } catch (Exception e) {
            log.error("Error processing OCPP message from {}", chargePointId, e);
            sendErrorResponse(session, "NotSupported", "Invalid message format");
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String chargePointId = extractChargePointId(session);
        chargePointSessions.remove(chargePointId);
        log.info("Charge Point disconnected: {} - {}", chargePointId, status);
    }

    private void handleOCPPMessage(String chargePointId, String action, JsonNode payload, WebSocketSession session) throws IOException {
        switch (action) {
            case "BootNotification":
                handleBootNotification(chargePointId, payload, session);
                break;
            case "StatusNotification":
                handleStatusNotification(chargePointId, payload);
                break;
            case "MeterValues":
                handleMeterValues(chargePointId, payload);
                break;
            case "StartTransaction":
                handleStartTransaction(chargePointId, payload, session);
                break;
            case "StopTransaction":
                handleStopTransaction(chargePointId, payload, session);
                break;
            case "Heartbeat":
                handleHeartbeat(chargePointId, session);
                break;
            default:
                log.warn("Unsupported OCPP action: {} from {}", action, chargePointId);
                sendErrorResponse(session, "NotSupported", "Action not supported: " + action);
        }
    }

    private void handleBootNotification(String chargePointId, JsonNode payload, WebSocketSession session) throws IOException {
        log.info("BootNotification received from {}", chargePointId);
        // OCPP BootNotification response: [3, "uniqueId", {"status":"Accepted","currentTime":"2026-02-19T...","interval":300}]
        String response = String.format("[3,\"%s\",{\"status\":\"Accepted\",\"currentTime\":\"%s\",\"interval\":300}]",
                payload.has(1) ? payload.get(1).asText() : chargePointId,
                java.time.Instant.now().toString());
        session.sendMessage(new TextMessage(response));
    }

    private void handleStatusNotification(String chargePointId, JsonNode payload) {
        log.info("StatusNotification received from {}", chargePointId);
        // Update charge point status in database
        // TODO: Implement status update
    }

    private void handleMeterValues(String chargePointId, JsonNode payload) {
        log.debug("MeterValues received from {}", chargePointId);
        // Store meter values for billing
        // TODO: Implement meter values storage
    }

    private void handleStartTransaction(String chargePointId, JsonNode payload, WebSocketSession session) throws IOException {
        log.info("StartTransaction received from {}", chargePointId);
        // OCPP StartTransaction response: [3, "transactionId", {"idTagInfo":{"status":"Accepted"}}]
        String transactionId = String.valueOf(System.currentTimeMillis());
        String response = String.format("[3,\"%s\",{\"idTagInfo\":{\"status\":\"Accepted\"}}]",
                payload.has(1) ? payload.get(1).asText() : transactionId);
        session.sendMessage(new TextMessage(response));
    }

    private void handleStopTransaction(String chargePointId, JsonNode payload, WebSocketSession session) throws IOException {
        log.info("StopTransaction received from {}", chargePointId);
        // OCPP StopTransaction response: [3, "transactionId", {"idTagInfo":{"status":"Accepted"}}]
        String response = String.format("[3,\"%s\",{\"idTagInfo\":{\"status\":\"Accepted\"}}]",
                payload.has(1) ? payload.get(1).asText() : "unknown");
        session.sendMessage(new TextMessage(response));
    }

    private void handleHeartbeat(String chargePointId, WebSocketSession session) throws IOException {
        log.debug("Heartbeat received from {}", chargePointId);
        // OCPP Heartbeat response: [3, "uniqueId", {"currentTime":"2026-02-19T..."}]
        String response = String.format("[3,\"%s\",{\"currentTime\":\"%s\"}]",
                chargePointId, java.time.Instant.now().toString());
        session.sendMessage(new TextMessage(response));
    }

    private void sendBootNotificationResponse(WebSocketSession session, String chargePointId) throws IOException {
        String response = String.format("[3,\"%s\",{\"status\":\"Accepted\",\"currentTime\":\"%s\",\"interval\":300}]",
                chargePointId, java.time.Instant.now().toString());
        session.sendMessage(new TextMessage(response));
    }

    private void sendErrorResponse(WebSocketSession session, String errorCode, String errorDescription) throws IOException {
        String response = String.format("[4,\"\",{\"errorCode\":\"%s\",\"errorDescription\":\"%s\"}]",
                errorCode, errorDescription);
        session.sendMessage(new TextMessage(response));
    }

    private String extractChargePointId(WebSocketSession session) {
        // Extract from URI: /ocpp/{chargePointId}
        String uri = session.getUri().toString();
        String[] parts = uri.split("/");
        return parts.length > 0 ? parts[parts.length - 1] : "unknown-" + session.getId();
    }

    public void sendRemoteStartTransaction(String chargePointId, int connectorId, String idTag) {
        WebSocketSession session = chargePointSessions.get(chargePointId);
        if (session != null && session.isOpen()) {
            try {
                // OCPP RemoteStartTransaction: [2, "uniqueId", "RemoteStartTransaction", {"connectorId":1,"idTag":"user123"}]
                String messageId = String.valueOf(System.currentTimeMillis());
                String message = String.format("[2,\"%s\",\"RemoteStartTransaction\",{\"connectorId\":%d,\"idTag\":\"%s\"}]",
                        messageId, connectorId, idTag);
                session.sendMessage(new TextMessage(message));
                log.info("Sent RemoteStartTransaction to {}", chargePointId);
            } catch (IOException e) {
                log.error("Error sending RemoteStartTransaction to {}", chargePointId, e);
            }
        } else {
            log.warn("Charge Point {} not connected", chargePointId);
        }
    }

    public void sendRemoteStopTransaction(String chargePointId, int transactionId) {
        WebSocketSession session = chargePointSessions.get(chargePointId);
        if (session != null && session.isOpen()) {
            try {
                // OCPP RemoteStopTransaction: [2, "uniqueId", "RemoteStopTransaction", {"transactionId":123}]
                String messageId = String.valueOf(System.currentTimeMillis());
                String message = String.format("[2,\"%s\",\"RemoteStopTransaction\",{\"transactionId\":%d}]",
                        messageId, transactionId);
                session.sendMessage(new TextMessage(message));
                log.info("Sent RemoteStopTransaction to {}", chargePointId);
            } catch (IOException e) {
                log.error("Error sending RemoteStopTransaction to {}", chargePointId, e);
            }
        } else {
            log.warn("Charge Point {} not connected", chargePointId);
        }
    }
}
