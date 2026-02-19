package com.emobility.station.service;

import com.emobility.station.entity.ChargingStation;
import com.emobility.station.repository.ChargingStationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Service for managing station imports from Open Charge Map
 * Supports scheduled automatic imports and manual triggers
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class StationImportService {

    private final OpenChargeMapService openChargeMapService;
    private final ChargingStationRepository stationRepository;
    
    // Store import job status
    private final Map<String, ImportJobStatus> importJobs = new ConcurrentHashMap<>();

    /**
     * Scheduled import for Bulgaria - runs daily at 2 AM
     */
    @Scheduled(cron = "0 0 2 * * ?") // Daily at 2 AM
    public void scheduledImportBulgaria() {
        log.info("Starting scheduled import for Bulgaria");
        importStations("BG", true);
    }

    /**
     * Start import and return job ID synchronously
     * The actual import runs asynchronously
     */
    public String startImport(String countryCode, boolean isScheduled) {
        String jobId = countryCode + "-" + System.currentTimeMillis();
        ImportJobStatus status = new ImportJobStatus(jobId, countryCode, isScheduled);
        status.setStatus("PENDING");
        status.setStartedAt(LocalDateTime.now());
        importJobs.put(jobId, status);
        
        // Start async import
        importStationsAsync(jobId, countryCode);
        
        return jobId;
    }

    /**
     * Async import execution
     */
    @Async
    private void importStationsAsync(String jobId, String countryCode) {
        ImportJobStatus status = importJobs.get(jobId);
        if (status == null) {
            log.error("Job {} not found", jobId);
            return;
        }
        
        try {
            status.setStatus("RUNNING");
            
            log.info("Starting import for country: {} (jobId: {})", countryCode, jobId);
            
            var result = openChargeMapService.importStationsFromOpenChargeMap(countryCode);
            
            status.setStatus("COMPLETED");
            status.setCompletedAt(LocalDateTime.now());
            status.setImported(result.getImported());
            status.setUpdated(result.getUpdated());
            status.setSkipped(result.getSkipped());
            status.setMessage(String.format("Successfully imported %d stations, updated %d", 
                    result.getImported(), result.getUpdated()));
            
            log.info("Import completed for {} (jobId: {}): imported={}, updated={}, skipped={}", 
                    countryCode, jobId, result.getImported(), result.getUpdated(), result.getSkipped());
            
        } catch (Exception e) {
            status.setStatus("FAILED");
            status.setCompletedAt(LocalDateTime.now());
            status.setMessage("Import failed: " + e.getMessage());
            log.error("Import failed for country: {} (jobId: {})", countryCode, jobId, e);
        }
    }

    /**
     * Manual import trigger (for scheduled imports)
     */
    @Async
    public void importStations(String countryCode, boolean isScheduled) {
        startImport(countryCode, isScheduled);
    }

    /**
     * Get import job status
     */
    public ImportJobStatus getImportStatus(String jobId) {
        return importJobs.get(jobId);
    }

    /**
     * Get latest import status for country
     */
    public ImportJobStatus getLatestImportStatus(String countryCode) {
        return importJobs.values().stream()
                .filter(job -> job.getCountryCode().equals(countryCode))
                .filter(job -> job.getStartedAt() != null)
                .max((a, b) -> a.getStartedAt().compareTo(b.getStartedAt()))
                .orElse(null);
    }

    /**
     * Get all import jobs
     */
    public Map<String, ImportJobStatus> getAllImportJobs() {
        return importJobs;
    }

    /**
     * Get station count by country
     */
    public long getStationCount(String countryCode) {
        return stationRepository.findAll().stream()
                .filter(s -> countryCode.equalsIgnoreCase(s.getCountry()))
                .count();
    }

    public static class ImportJobStatus {
        private String jobId;
        private String countryCode;
        private boolean scheduled;
        private String status; // PENDING, RUNNING, COMPLETED, FAILED
        
        @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
        private LocalDateTime startedAt;
        
        @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
        private LocalDateTime completedAt;
        private int imported;
        private int updated;
        private int skipped;
        private String message;

        public ImportJobStatus(String jobId, String countryCode, boolean scheduled) {
            this.jobId = jobId;
            this.countryCode = countryCode;
            this.scheduled = scheduled;
            this.status = "PENDING";
        }

        // Getters and setters
        public String getJobId() { return jobId; }
        public void setJobId(String jobId) { this.jobId = jobId; }
        public String getCountryCode() { return countryCode; }
        public void setCountryCode(String countryCode) { this.countryCode = countryCode; }
        public boolean isScheduled() { return scheduled; }
        public void setScheduled(boolean scheduled) { this.scheduled = scheduled; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public LocalDateTime getStartedAt() { return startedAt; }
        public void setStartedAt(LocalDateTime startedAt) { this.startedAt = startedAt; }
        public LocalDateTime getCompletedAt() { return completedAt; }
        public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }
        public int getImported() { return imported; }
        public void setImported(int imported) { this.imported = imported; }
        public int getUpdated() { return updated; }
        public void setUpdated(int updated) { this.updated = updated; }
        public int getSkipped() { return skipped; }
        public void setSkipped(int skipped) { this.skipped = skipped; }
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
    }
}
