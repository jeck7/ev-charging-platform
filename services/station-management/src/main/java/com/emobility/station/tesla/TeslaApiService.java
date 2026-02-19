package com.emobility.station.tesla;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Tesla API Integration Service
 * Documentation: https://tesla-api.timdorr.com/
 * OAuth 2.0 authentication required
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TeslaApiService {

    private static final String TESLA_AUTH_URL = "https://auth.tesla.com/oauth2/v3/token";
    private static final String TESLA_API_URL = "https://owner-api.teslamotors.com/api/1";
    
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${tesla.client.id:}")
    private String teslaClientId;

    @Value("${tesla.client.secret:}")
    private String teslaClientSecret;

    /**
     * Authenticate with Tesla API using OAuth 2.0
     * @param email Tesla account email
     * @param password Tesla account password
     * @return Access token
     */
    public String authenticate(String email, String password) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

            MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
            body.add("grant_type", "password");
            body.add("client_id", teslaClientId);
            body.add("client_secret", teslaClientSecret);
            body.add("email", email);
            body.add("password", password);

            HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(TESLA_AUTH_URL, request, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                String accessToken = (String) response.getBody().get("access_token");
                log.info("Tesla authentication successful");
                return accessToken;
            }
        } catch (Exception e) {
            log.error("Tesla authentication failed", e);
        }
        return null;
    }

    /**
     * Get list of vehicles for authenticated user
     * @param accessToken OAuth access token
     * @return List of vehicles
     */
    public List<Map<String, Object>> getVehicles(String accessToken) {
        try {
            HttpHeaders headers = createAuthHeaders(accessToken);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<JsonNode> response = restTemplate.exchange(
                    TESLA_API_URL + "/vehicles",
                    HttpMethod.GET,
                    entity,
                    JsonNode.class
            );

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode responseNode = response.getBody();
                if (responseNode.has("response") && responseNode.get("response").isArray()) {
                    log.info("Fetched {} Tesla vehicles", responseNode.get("response").size());
                    return parseVehicles(responseNode.get("response"));
                }
            }
        } catch (Exception e) {
            log.error("Error fetching Tesla vehicles", e);
        }
        return List.of();
    }

    /**
     * Get vehicle charging state
     * @param accessToken OAuth access token
     * @param vehicleId Vehicle ID
     * @return Charging state data
     */
    public Map<String, Object> getChargingState(String accessToken, String vehicleId) {
        try {
            HttpHeaders headers = createAuthHeaders(accessToken);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<JsonNode> response = restTemplate.exchange(
                    TESLA_API_URL + "/vehicles/" + vehicleId + "/data_request/charge_state",
                    HttpMethod.GET,
                    entity,
                    JsonNode.class
            );

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode responseNode = response.getBody();
                if (responseNode.has("response")) {
                    return parseChargingState(responseNode.get("response"));
                }
            }
        } catch (Exception e) {
            log.error("Error fetching Tesla charging state", e);
        }
        return new HashMap<>();
    }

    /**
     * Start charging for Tesla vehicle
     * @param accessToken OAuth access token
     * @param vehicleId Vehicle ID
     * @return Success status
     */
    public boolean startCharging(String accessToken, String vehicleId) {
        try {
            HttpHeaders headers = createAuthHeaders(accessToken);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<JsonNode> response = restTemplate.exchange(
                    TESLA_API_URL + "/vehicles/" + vehicleId + "/command/charge_start",
                    HttpMethod.POST,
                    entity,
                    JsonNode.class
            );

            boolean success = response.getStatusCode().is2xxSuccessful() &&
                    response.getBody() != null &&
                    response.getBody().has("response") &&
                    response.getBody().get("response").has("result") &&
                    "true".equals(response.getBody().get("response").get("result").asText());

            log.info("Tesla charge start command: {}", success ? "success" : "failed");
            return success;
        } catch (Exception e) {
            log.error("Error starting Tesla charging", e);
            return false;
        }
    }

    /**
     * Stop charging for Tesla vehicle
     * @param accessToken OAuth access token
     * @param vehicleId Vehicle ID
     * @return Success status
     */
    public boolean stopCharging(String accessToken, String vehicleId) {
        try {
            HttpHeaders headers = createAuthHeaders(accessToken);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<JsonNode> response = restTemplate.exchange(
                    TESLA_API_URL + "/vehicles/" + vehicleId + "/command/charge_stop",
                    HttpMethod.POST,
                    entity,
                    JsonNode.class
            );

            boolean success = response.getStatusCode().is2xxSuccessful() &&
                    response.getBody() != null &&
                    response.getBody().has("response") &&
                    response.getBody().get("response").has("result") &&
                    "true".equals(response.getBody().get("response").get("result").asText());

            log.info("Tesla charge stop command: {}", success ? "success" : "failed");
            return success;
        } catch (Exception e) {
            log.error("Error stopping Tesla charging", e);
            return false;
        }
    }

    private HttpHeaders createAuthHeaders(String accessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setContentType(MediaType.APPLICATION_JSON);
        return headers;
    }

    private List<Map<String, Object>> parseVehicles(JsonNode vehiclesNode) {
        return List.of(); // TODO: Parse vehicle data
    }

    private Map<String, Object> parseChargingState(JsonNode stateNode) {
        Map<String, Object> state = new HashMap<>();
        if (stateNode.has("charging_state")) {
            state.put("chargingState", stateNode.get("charging_state").asText());
        }
        if (stateNode.has("battery_level")) {
            state.put("batteryLevel", stateNode.get("battery_level").asInt());
        }
        if (stateNode.has("charge_rate")) {
            state.put("chargeRate", stateNode.get("charge_rate").asDouble());
        }
        if (stateNode.has("time_to_full_charge")) {
            state.put("timeToFullCharge", stateNode.get("time_to_full_charge").asDouble());
        }
        return state;
    }
}
