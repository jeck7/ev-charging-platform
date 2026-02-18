package com.emobility.charging.dto;

import com.emobility.charging.entity.ChargingSession;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class ChargingSessionResponse {
    private Long id;
    private String userId;
    private Long chargingPointId;
    private String status;
    private BigDecimal energyDeliveredKwh;
    private BigDecimal costEur;
    private LocalDateTime startedAt;
    private LocalDateTime endedAt;

    public static ChargingSessionResponse from(ChargingSession s) {
        return ChargingSessionResponse.builder()
                .id(s.getId())
                .userId(s.getUserId())
                .chargingPointId(s.getChargingPointId())
                .status(s.getStatus().name())
                .energyDeliveredKwh(s.getEnergyDeliveredKwh())
                .costEur(s.getCostEur())
                .startedAt(s.getStartedAt())
                .endedAt(s.getEndedAt())
                .build();
    }
}
