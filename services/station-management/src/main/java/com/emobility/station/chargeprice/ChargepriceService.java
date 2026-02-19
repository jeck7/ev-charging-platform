package com.emobility.station.chargeprice;

import com.emobility.station.entity.ChargingStation;
import com.emobility.station.repository.ChargingStationRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

/**
 * Integration with Chargeprice API for charging stations and price data.
 * Docs: https://chargeprice.github.io/chargeprice-api-docs/
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ChargepriceService {

    @Value("${chargeprice.api.base-url:}")
    private String baseUrl;

    @Value("${chargeprice.api.key:}")
    private String apiKey;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final ChargingStationRepository stationRepository;

    private static final double MATCH_RADIUS_DEG = 0.005; // ~500m
    private static final int PAGE_SIZE = 400;

    public boolean isConfigured() {
        return baseUrl != null && !baseUrl.isBlank() && apiKey != null && !apiKey.isBlank();
    }

    /**
     * Fetch charging stations from Chargeprice for a country (e.g. BG).
     */
    public List<ChargepriceStationDto> fetchStationsByCountry(String countryCode) {
        if (!isConfigured()) {
            log.warn("Chargeprice API not configured (base-url and key)");
            return Collections.emptyList();
        }
        List<ChargepriceStationDto> all = new ArrayList<>();
        int page = 1;
        try {
            do {
                String url = String.format("%s/v1/charging_stations?filter[country]=%s&page[size]=%d&page[number]=%d",
                        baseUrl.replaceAll("/$", ""), countryCode.toUpperCase(), PAGE_SIZE, page);
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                headers.set("Api-Key", apiKey);
                ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), String.class);
                if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                    log.warn("Chargeprice stations response not OK: {}", response.getStatusCode());
                    break;
                }
                JsonNode root = objectMapper.readTree(response.getBody());
                List<ChargepriceStationDto> pageStations = parseStationsResponse(root);
                all.addAll(pageStations);
                boolean more = root.has("meta") && root.get("meta").has("more_available")
                        && root.get("meta").get("more_available").asBoolean(false);
                if (!more || pageStations.isEmpty()) break;
                page++;
                Thread.sleep(300); // avoid rate limit
            } while (true);
            log.info("Fetched {} stations from Chargeprice for country {}", all.size(), countryCode);
        } catch (Exception e) {
            log.error("Error fetching Chargeprice stations for {}", countryCode, e);
        }
        return all;
    }

    /**
     * Get price for a charge (e.g. 30 kWh) and return as "X.XX EUR / kWh".
     */
    public Optional<String> fetchPricePerKwh(double lat, double lng, String country, String operatorId,
                                               List<ChargepriceStationDto.ChargePointDto> chargePoints) {
        if (!isConfigured() || operatorId == null || chargePoints == null || chargePoints.isEmpty()) {
            return Optional.empty();
        }
        int energyKwh = 30;
        try {
            Map<String, Object> payload = buildChargePriceRequest(lat, lng, country, operatorId, chargePoints, energyKwh);
            String url = baseUrl.replaceAll("/$", "") + "/v1/charge_prices";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Api-Key", apiKey);
            HttpEntity<String> entity = new HttpEntity<>(objectMapper.writeValueAsString(payload), headers);
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                return Optional.empty();
            }
            JsonNode root = objectMapper.readTree(response.getBody());
            return parsePricePerKwh(root, energyKwh);
        } catch (Exception e) {
            log.debug("Chargeprice price request failed for {}: {}", operatorId, e.getMessage());
            return Optional.empty();
        }
    }

    /**
     * Enrich our stations with prices from Chargeprice: match by lat/lng and set usageCost.
     */
    public int enrichStationsWithPrices(String countryCode) {
        if (!isConfigured()) return 0;
        List<ChargepriceStationDto> cpStations = fetchStationsByCountry(countryCode);
        if (cpStations.isEmpty()) return 0;
        List<ChargingStation> ours = stationRepository.findAll();
        int updated = 0;
        for (ChargingStation station : ours) {
            if (station.getLatitude() == null || station.getLongitude() == null) continue;
            Optional<ChargepriceStationDto> match = findNearestChargepriceStation(cpStations,
                    station.getLatitude().doubleValue(), station.getLongitude().doubleValue());
            if (match.isEmpty()) continue;
            ChargepriceStationDto cp = match.get();
            Optional<String> priceOpt = fetchPricePerKwh(
                    cp.getLatitude(), cp.getLongitude(),
                    cp.getCountry() != null ? cp.getCountry() : countryCode,
                    cp.getOperatorId(), cp.getChargePoints());
            if (priceOpt.isPresent()) {
                station.setUsageCost(priceOpt.get());
                stationRepository.save(station);
                updated++;
            }
            try { Thread.sleep(250); } catch (InterruptedException e) { Thread.currentThread().interrupt(); break; }
        }
        log.info("Enriched {} stations with Chargeprice prices for {}", updated, countryCode);
        return updated;
    }

    private Optional<ChargepriceStationDto> findNearestChargepriceStation(List<ChargepriceStationDto> stations, double lat, double lng) {
        ChargepriceStationDto best = null;
        double bestDist = MATCH_RADIUS_DEG;
        for (ChargepriceStationDto s : stations) {
            if (s.getLatitude() == null || s.getLongitude() == null) continue;
            double dLat = Math.abs(s.getLatitude() - lat);
            double dLng = Math.abs(s.getLongitude() - lng);
            if (dLat <= MATCH_RADIUS_DEG && dLng <= MATCH_RADIUS_DEG) {
                double dist = Math.hypot(dLat, dLng);
                if (dist < bestDist) {
                    bestDist = dist;
                    best = s;
                }
            }
        }
        return Optional.ofNullable(best);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> buildChargePriceRequest(double lat, double lng, String country, String operatorId,
                                                        List<ChargepriceStationDto.ChargePointDto> chargePoints, int energyKwh) {
        List<Map<String, Object>> cps = new ArrayList<>();
        for (ChargepriceStationDto.ChargePointDto cp : chargePoints) {
            cps.add(Map.of("power", cp.getPower() != null ? cp.getPower() : 22, "plug", cp.getPlug() != null ? cp.getPlug() : "type2"));
        }
        Map<String, Object> station = new HashMap<>();
        station.put("latitude", lat);
        station.put("longitude", lng);
        station.put("country", country != null ? country : "BG");
        station.put("network", operatorId);
        station.put("charge_points", cps);
        Map<String, Object> options = Map.of("energy", energyKwh, "duration", 30, "currency", "EUR");
        Map<String, Object> data = new HashMap<>();
        data.put("type", "charge_price_request");
        data.put("attributes", Map.of("data_adapter", "chargeprice", "station", station, "options", options));
        return Map.of("data", data);
    }

    private Optional<String> parsePricePerKwh(JsonNode root, int energyKwh) {
        if (!root.has("data") || !root.get("data").isArray() || root.get("data").size() == 0) {
            return Optional.empty();
        }
        JsonNode first = root.get("data").get(0);
        if (!first.has("attributes") || !first.get("attributes").has("charge_point_prices")) {
            return Optional.empty();
        }
        JsonNode prices = first.get("attributes").get("charge_point_prices");
        if (!prices.isArray() || prices.size() == 0) return Optional.empty();
        JsonNode firstPrice = prices.get(0);
        if (!firstPrice.has("price") || firstPrice.get("price").isNull()) return Optional.empty();
        double total = firstPrice.get("price").asDouble();
        if (total <= 0 || energyKwh <= 0) return Optional.empty();
        double perKwh = total / energyKwh;
        JsonNode attrs = first.get("attributes");
        String currency = attrs.has("currency") ? attrs.get("currency").asText("EUR") : "EUR";
        String formatted = BigDecimal.valueOf(perKwh).setScale(2, RoundingMode.HALF_UP) + " " + currency + " / kWh";
        return Optional.of(formatted);
    }

    private List<ChargepriceStationDto> parseStationsResponse(JsonNode root) {
        List<ChargepriceStationDto> list = new ArrayList<>();
        if (!root.has("data") || !root.get("data").isArray()) return list;
        for (JsonNode item : root.get("data")) {
            JsonNode attrs = item.has("attributes") ? item.get("attributes") : null;
            if (attrs == null) continue;
            String id = item.has("id") ? item.get("id").asText() : null;
            String name = attrs.has("name") ? attrs.get("name").asText() : null;
            Double lat = attrs.has("latitude") ? attrs.get("latitude").asDouble() : null;
            Double lng = attrs.has("longitude") ? attrs.get("longitude").asDouble() : null;
            String country = attrs.has("country") ? attrs.get("country").asText() : null;
            String address = attrs.has("address") ? attrs.get("address").asText() : null;
            String operatorId = null;
            if (item.has("relationships") && item.get("relationships").has("operator")
                    && item.get("relationships").get("operator").has("data")) {
                JsonNode opData = item.get("relationships").get("operator").get("data");
                if (opData.has("id")) operatorId = opData.get("id").asText();
            }
            List<ChargepriceStationDto.ChargePointDto> cps = new ArrayList<>();
            if (attrs.has("charge_points") && attrs.get("charge_points").isArray()) {
                for (JsonNode cp : attrs.get("charge_points")) {
                    String plug = cp.has("plug") ? cp.get("plug").asText() : "type2";
                    double power = cp.has("power") ? cp.get("power").asDouble() : 22;
                    cps.add(ChargepriceStationDto.ChargePointDto.builder().plug(plug).power(power).build());
                }
            }
            list.add(ChargepriceStationDto.builder()
                    .id(id).name(name).latitude(lat).longitude(lng).country(country).address(address)
                    .operatorId(operatorId).chargePoints(cps)
                    .build());
        }
        return list;
    }
}
