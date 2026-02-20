package com.emobility.station.service;

import com.emobility.station.entity.ChargingStation;
import com.emobility.station.repository.ChargingStationRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Стартира Node.js скрапера за https://finescharging.com/locations и импортира резултатите в БД.
 * Изисква: Node.js в PATH и изпълнено веднъж в tools/fines-scraper: npm install && npx playwright install chromium
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FinesScraperService {

    private final ChargingStationRepository stationRepository;
    private final ObjectMapper objectMapper;

    @Value("${fines.scraper.path:tools/fines-scraper}")
    private String scraperPath;

    @Value("${fines.scraper.timeout-seconds:60}")
    private int timeoutSeconds;

    public ScrapeResult runScraperAndImport() {
        Path dir = Paths.get(scraperPath).toAbsolutePath();
        if (!Files.isDirectory(dir) || !Files.exists(dir.resolve("scrape.js"))) {
            log.warn("Fines scraper not found at {}", dir);
            return ScrapeResult.error("Scraper not found at " + dir + ". Run from project root and ensure tools/fines-scraper exists with scrape.js.");
        }
        ProcessBuilder pb = new ProcessBuilder("node", "scrape.js")
                .directory(dir.toFile())
                .redirectErrorStream(true);
        try {
            Process p = pb.start();
            String output = new String(p.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            boolean finished = p.waitFor(timeoutSeconds, TimeUnit.SECONDS);
            if (!finished) {
                p.destroyForcibly();
                return ScrapeResult.error("Scraper timed out after " + timeoutSeconds + "s");
            }
            if (p.exitValue() != 0) {
                log.warn("Scraper exited with {}: {}", p.exitValue(), output);
                return ScrapeResult.error("Scraper failed: " + (output.length() > 500 ? output.substring(0, 500) + "..." : output));
            }
            String jsonLine = extractJsonArrayLine(output);
            if (jsonLine == null || jsonLine.isEmpty()) {
                return ScrapeResult.error("Scraper output contained no JSON array. Output length: " + output.length());
            }
            return importScrapedOutput(jsonLine);
        } catch (Exception e) {
            log.error("Fines scraper error", e);
            return ScrapeResult.error(e.getMessage());
        }
    }

    /**
     * Извлича един ред с JSON масив от изхода на скрейпъра.
     * Ако целият изход е валиден JSON масив, използва се той.
     * Иначе се търси последният ред, който започва с "[" и завършва с "]" (изход от console.log).
     * Така debug съобщения на stderr (при redirectErrorStream) не развалят парсването.
     */
    private String extractJsonArrayLine(String output) {
        if (output == null) return null;
        String trimmed = output.trim();
        if (trimmed.isEmpty()) return null;
        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
            return trimmed;
        }
        String[] lines = output.split("\\r?\\n");
        for (int i = lines.length - 1; i >= 0; i--) {
            String line = lines[i].trim();
            if (line.startsWith("[") && line.endsWith("]")) {
                return line;
            }
        }
        return null;
    }

    private ScrapeResult importScrapedOutput(String jsonLine) {
        if (jsonLine == null || jsonLine.isEmpty()) {
            return ScrapeResult.error("Scraper returned empty output");
        }
        try {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> list = objectMapper.readValue(jsonLine, new TypeReference<List<Map<String, Object>>>() {});
            if (list == null) list = new ArrayList<>();
            int imported = 0;
            int updated = 0;
            for (Map<String, Object> item : list) {
                try {
                    ChargingStation s = mapToStation(item);
                    if (s == null) continue;
                    ChargingStation existing = stationRepository.findByExternalId(s.getExternalId());
                    if (existing == null) {
                        existing = stationRepository.findFirstByLatitudeAndLongitudeAndExternalIdStartingWith(
                                s.getLatitude(), s.getLongitude(), "fines-scrape-").orElse(null);
                    }
                    if (existing != null) {
                        existing.setExternalId(s.getExternalId());
                        existing.setName(s.getName());
                        existing.setAddress(s.getAddress());
                        existing.setCity(s.getCity());
                        existing.setCountry(s.getCountry());
                        existing.setLatitude(s.getLatitude());
                        existing.setLongitude(s.getLongitude());
                        existing.setOperator(s.getOperator());
                        existing.setMaxPowerKw(s.getMaxPowerKw());
                        existing.setConnectorsJson(s.getConnectorsJson());
                        stationRepository.save(existing);
                        updated++;
                    } else {
                        stationRepository.save(s);
                        imported++;
                    }
                } catch (Exception e) {
                    log.warn("Skip station: {}", e.getMessage());
                }
            }
            return new ScrapeResult(true, imported, updated, list.size(), null);
        } catch (Exception e) {
            log.error("Parse scraper output failed", e);
            return ScrapeResult.error("Invalid JSON: " + e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    private ChargingStation mapToStation(Map<String, Object> m) {
        Object lat = m.get("latitude");
        Object lng = m.get("longitude");
        if (lat == null) lat = m.get("lat");
        if (lng == null) lng = m.get("lng");
        if (lat == null || lng == null) {
            Object geom = m.get("geometry");
            if (geom instanceof Map) {
                Object coords = ((Map<String, Object>) geom).get("coordinates");
                if (coords instanceof List && ((List<?>) coords).size() >= 2) {
                    List<?> c = (List<?>) coords;
                    if (lng == null) lng = c.get(0);
                    if (lat == null) lat = c.get(1);
                }
            }
        }
        BigDecimal latitude = toBigDecimal(lat);
        BigDecimal longitude = toBigDecimal(lng);
        if (latitude == null || longitude == null) return null;
        String name = String.valueOf(m.getOrDefault("name", "Fines Charging")).trim();
        if (name.isEmpty()) name = "Fines Charging";
        String address = String.valueOf(m.getOrDefault("address", "")).trim();
        String city = String.valueOf(m.getOrDefault("city", "")).trim();
        String country = String.valueOf(m.getOrDefault("country", "BG")).trim();
        BigDecimal maxPowerKw = toBigDecimal(m.get("maxPowerKw"));
        if (maxPowerKw == null) maxPowerKw = BigDecimal.valueOf(120);
        String externalId = "fines-scrape-" + latitude.stripTrailingZeros().toPlainString() + "-" + longitude.stripTrailingZeros().toPlainString();
        String connectorsJson = parseConnectorsFromScraped(m, maxPowerKw);
        return ChargingStation.builder()
                .name(name)
                .address(address.isEmpty() ? name : address)
                .city(city.isEmpty() ? null : city)
                .country(country)
                .latitude(latitude)
                .longitude(longitude)
                .operator("Fines Charging")
                .maxPowerKw(maxPowerKw)
                .connectorsJson(connectorsJson)
                .status(ChargingStation.StationStatus.ACTIVE)
                .externalId(externalId)
                .build();
    }

    /**
     * Извлича connectorsJson от скрейпнатия обект: ако има масив "connectors" с обекти { type, powerKw, usageCost?, stationName? }, сериализира го;
     * иначе при наличие на maxPowerKw връща един CCS конектор.
     */
    @SuppressWarnings("unchecked")
    private String parseConnectorsFromScraped(Map<String, Object> m, BigDecimal maxPowerKw) {
        Object connList = m.get("connectors");
        if (connList instanceof List && !((List<?>) connList).isEmpty()) {
            List<Map<String, Object>> out = new ArrayList<>();
            for (Object item : (List<?>) connList) {
                if (!(item instanceof Map)) continue;
                Map<String, Object> conn = (Map<String, Object>) item;
                Object type = conn.get("type");
                Object powerKw = conn.get("powerKw");
                if (type == null || powerKw == null) continue;
                double kw = powerKw instanceof Number ? ((Number) powerKw).doubleValue() : Double.parseDouble(powerKw.toString());
                Map<String, Object> entry = new java.util.HashMap<>(Map.of("type", type.toString(), "powerKw", kw));
                Object usageCost = conn.get("usageCost");
                if (usageCost != null && !usageCost.toString().isBlank()) entry.put("usageCost", usageCost.toString());
                Object stationName = conn.get("stationName");
                if (stationName != null && !stationName.toString().isBlank()) entry.put("stationName", stationName.toString());
                out.add(entry);
            }
            if (!out.isEmpty()) {
                try {
                    return objectMapper.writeValueAsString(out);
                } catch (Exception ignored) {}
            }
        }
        if (maxPowerKw != null) {
            try {
                return objectMapper.writeValueAsString(List.of(
                        Map.of("type", "CCS", "powerKw", maxPowerKw.doubleValue(), "usageCost", "0.39 EUR / kWh")
                ));
            } catch (Exception ignored) {}
        }
        return null;
    }

    private static BigDecimal toBigDecimal(Object o) {
        if (o == null) return null;
        if (o instanceof Number) return BigDecimal.valueOf(((Number) o).doubleValue());
        try {
            return new BigDecimal(o.toString());
        } catch (Exception e) {
            return null;
        }
    }

    public static final class ScrapeResult {
        private final boolean success;
        private final int imported;
        private final int updated;
        private final int total;
        private final String error;

        public ScrapeResult(boolean success, int imported, int updated, int total, String error) {
            this.success = success;
            this.imported = imported;
            this.updated = updated;
            this.total = total;
            this.error = error;
        }

        static ScrapeResult error(String message) {
            return new ScrapeResult(false, 0, 0, 0, message);
        }

        public boolean isSuccess() { return success; }
        public int getImported() { return imported; }
        public int getUpdated() { return updated; }
        public int getTotal() { return total; }
        public String getError() { return error; }
    }
}
