package com.emobility.station.config;

import com.emobility.station.ocpp.OCPPWebSocketHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketConfigurer {

    private final OCPPWebSocketHandler ocppWebSocketHandler;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        // OCPP WebSocket endpoint: ws://host:port/ocpp/{chargePointId}
        registry.addHandler(ocppWebSocketHandler, "/ocpp/{chargePointId}")
                .setAllowedOrigins("*"); // In production, restrict origins
    }
}
