package com.emobility.station.ecomovement;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;
import java.util.List;

/**
 * Integration with Eco-Movement Data API (OCPI locations + prices).
 * Docs: https://developers.eco-movement.com/
 * When token is set, can fetch locations and connector-level prices to enrich our stations.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EcoMovementService {

    @Value("${ecomovement.api.base-url:}")
    private String baseUrl;

    @Value("${ecomovement.api.token:}")
    private String token;

    private final RestTemplate restTemplate;

    public boolean isConfigured() {
        return baseUrl != null && !baseUrl.isBlank() && token != null && !token.isBlank();
    }

    /**
     * Fetch locations from Eco-Movement (OCPI) for a country. Returns raw response for now.
     * Full implementation would parse OCPI locations and match to our stations, then fetch connector prices.
     */
    public List<EcoMovementLocationDto> fetchLocationsByCountry(String countryCode) {
        if (!isConfigured()) {
            log.warn("Eco-Movement API not configured (base-url and token)");
            return Collections.emptyList();
        }
        try {
            String url = baseUrl.replaceAll("/$", "") + "/api/v2/locations?country_code=" + countryCode.toUpperCase();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Token " + token);
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), String.class);
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                log.warn("Eco-Movement locations response not OK: {}", response.getStatusCode());
                return Collections.emptyList();
            }
            // TODO: parse OCPI locations JSON and map to EcoMovementLocationDto; then enrich our stations with prices
            log.info("Eco-Movement locations fetched for {} (parsing to be extended)", countryCode);
            return Collections.emptyList();
        } catch (Exception e) {
            log.error("Error fetching Eco-Movement locations for {}", countryCode, e);
            return Collections.emptyList();
        }
    }

    /**
     * Enrich our stations with prices from Eco-Movement (match by location id or coordinates).
     */
    public int enrichStationsWithPrices(String countryCode) {
        if (!isConfigured()) return 0;
        List<EcoMovementLocationDto> locations = fetchLocationsByCountry(countryCode);
        if (locations.isEmpty()) return 0;
        // TODO: match locations to ChargingStation by lat/lng; fetch connector prices; set station.usageCost
        return 0;
    }

    /** DTO for Eco-Movement / OCPI location (minimal for future parsing). */
    public static class EcoMovementLocationDto {
        private String id;
        private Double latitude;
        private Double longitude;
        private String name;
        private String address;

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public Double getLatitude() { return latitude; }
        public void setLatitude(Double latitude) { this.latitude = latitude; }
        public Double getLongitude() { return longitude; }
        public void setLongitude(Double longitude) { this.longitude = longitude; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getAddress() { return address; }
        public void setAddress(String address) { this.address = address; }
    }
}
