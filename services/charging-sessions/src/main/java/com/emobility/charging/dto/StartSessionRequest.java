package com.emobility.charging.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class StartSessionRequest {
    @NotNull
    private String userId;
    @NotNull
    private Long chargingPointId;
}
