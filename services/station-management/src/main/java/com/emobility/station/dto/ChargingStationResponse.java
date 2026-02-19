package com.emobility.station.dto;

import com.emobility.station.entity.ChargingStation;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class ChargingStationResponse {
    private Long id;
    private String name;
    private String address;
    private String city;
    private String country;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private String status;
    private String operator;
    private BigDecimal maxPowerKw;

    public static ChargingStationResponse from(ChargingStation s) {
        return ChargingStationResponse.builder()
                .id(s.getId())
                .name(s.getName())
                .address(s.getAddress())
                .city(s.getCity())
                .country(s.getCountry())
                .latitude(s.getLatitude())
                .longitude(s.getLongitude())
                .status(s.getStatus().name())
                .operator(s.getOperator())
                .maxPowerKw(s.getMaxPowerKw())
                .build();
    }
}
