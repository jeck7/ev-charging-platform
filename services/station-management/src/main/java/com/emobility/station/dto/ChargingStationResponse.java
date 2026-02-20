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

    /** За България: lat ≈ 41–44, lng ≈ 22–29. Ако са разменени, коригираме при извеждане. */
    private static final double BG_LAT_MIN = 41.0;
    private static final double BG_LAT_MAX = 44.5;
    private static final double BG_LNG_MIN = 22.0;
    private static final double BG_LNG_MAX = 29.0;

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
        BigDecimal lat = s.getLatitude();
        BigDecimal lng = s.getLongitude();
        if (lat != null && lng != null && isBulgariaSwappedCoords(lat.doubleValue(), lng.doubleValue())) {
            BigDecimal swap = lat;
            lat = lng;
            lng = swap;
        }
        String city = s.getCity();
        if (city != null && ("null".equalsIgnoreCase(city.trim()) || city.isBlank())) {
            city = null;
        }
        return ChargingStationResponse.builder()
                .id(s.getId())
                .name(s.getName())
                .address(s.getAddress())
                .city(city)
                .country(s.getCountry())
                .latitude(lat)
                .longitude(lng)
                .status(s.getStatus().name())
                .operator(s.getOperator())
                .maxPowerKw(s.getMaxPowerKw())
                .connectors(connectors)
                .usageCost(s.getUsageCost())
                .build();
    }

    /** Дали координатите са разменени за България: „lat” е в диапазона на lng (22–29), „lng” в диапазона на lat (41–44). */
    private static boolean isBulgariaSwappedCoords(double lat, double lng) {
        return lat >= BG_LNG_MIN && lat <= BG_LNG_MAX && lng >= BG_LAT_MIN && lng <= BG_LAT_MAX;
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
