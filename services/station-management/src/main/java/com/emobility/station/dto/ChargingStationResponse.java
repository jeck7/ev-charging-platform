package com.emobility.station.dto;

import com.emobility.station.entity.ChargingStation;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;

@Data
@Builder
public class ChargingStationResponse {
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

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
    private List<ConnectorInfo> connectors;
    /** Цена по подразбиране за локацията, напр. "0.39 EUR / kWh". */
    private String usageCost;

    public static ChargingStationResponse from(ChargingStation s) {
        List<ConnectorInfo> connectors = parseConnectorsJson(s.getConnectorsJson());
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
                .connectors(connectors)
                .usageCost(s.getUsageCost())
                .build();
    }

    private static List<ConnectorInfo> parseConnectorsJson(String connectorsJson) {
        if (connectorsJson == null || connectorsJson.isBlank()) {
            return Collections.emptyList();
        }
        try {
            List<ConnectorInfo> list = OBJECT_MAPPER.readValue(connectorsJson,
                    new TypeReference<List<ConnectorInfo>>() {});
            return list != null ? list : Collections.emptyList();
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }
}
