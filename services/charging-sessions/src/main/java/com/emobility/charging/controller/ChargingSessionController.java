package com.emobility.charging.controller;

import com.emobility.charging.dto.ChargingSessionResponse;
import com.emobility.charging.dto.StartSessionRequest;
import com.emobility.charging.entity.ChargingSession;
import com.emobility.charging.repository.ChargingSessionRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/sessions")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ChargingSessionController {

    private final ChargingSessionRepository sessionRepository;

    @PostMapping("/start")
    public ResponseEntity<ChargingSessionResponse> startSession(@Valid @RequestBody StartSessionRequest request) {
        ChargingSession session = ChargingSession.builder()
                .userId(request.getUserId())
                .chargingPointId(request.getChargingPointId())
                .status(ChargingSession.SessionStatus.ACTIVE)
                .startedAt(LocalDateTime.now())
                .build();
        session = sessionRepository.save(session);
        return ResponseEntity.status(HttpStatus.CREATED).body(ChargingSessionResponse.from(session));
    }

    @PostMapping("/{id}/stop")
    public ResponseEntity<ChargingSessionResponse> stopSession(@PathVariable Long id) {
        return sessionRepository.findById(id)
                .map(session -> {
                    if (session.getStatus() != ChargingSession.SessionStatus.ACTIVE) {
                        return ResponseEntity.badRequest().<ChargingSessionResponse>build();
                    }
                    session.setStatus(ChargingSession.SessionStatus.COMPLETED);
                    session.setEndedAt(LocalDateTime.now());
                    session.setEnergyDeliveredKwh(java.math.BigDecimal.valueOf(25.5));
                    session.setCostEur(java.math.BigDecimal.valueOf(12.75));
                    session = sessionRepository.save(session);
                    return ResponseEntity.ok(ChargingSessionResponse.from(session));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/user/{userId}")
    public List<ChargingSessionResponse> getSessionsByUser(@PathVariable String userId) {
        return sessionRepository.findByUserIdOrderByStartedAtDesc(userId).stream()
                .map(ChargingSessionResponse::from)
                .collect(Collectors.toList());
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("UP");
    }
}
