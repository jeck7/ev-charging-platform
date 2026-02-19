package com.emobility.station.chargeprice;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class ChargepriceStationDto {
    private String id;
    private String name;
    private Double latitude;
    private Double longitude;
    private String country;
    private String address;
    private String operatorId;
    private List<ChargePointDto> chargePoints;

    @Data
    @Builder
    public static class ChargePointDto {
        private String plug;   // ccs, type2, etc.
        private Double power; // kW
    }
}
