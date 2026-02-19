package com.emobility.station.iso15118;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.security.cert.X509Certificate;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * ISO 15118 Plug & Charge Service
 * Handles certificate-based authentication for EV charging
 * Documentation: https://www.iso.org/standard/55366.html
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ISO15118Service {

    // Store vehicle certificates and contract certificates
    private final Map<String, VehicleCertificate> vehicleCertificates = new ConcurrentHashMap<>();
    private final Map<String, ContractCertificate> contractCertificates = new ConcurrentHashMap<>();

    /**
     * Validate vehicle certificate during Plug & Charge handshake
     * @param vehicleCertificate Vehicle's certificate
     * @return true if certificate is valid
     */
    public boolean validateVehicleCertificate(X509Certificate vehicleCertificate) {
        try {
            // Verify certificate chain
            // In production, validate against V2G Root CA
            vehicleCertificate.checkValidity();
            
            String vehicleId = extractVehicleId(vehicleCertificate);
            log.info("Vehicle certificate validated for vehicle: {}", vehicleId);
            
            vehicleCertificates.put(vehicleId, new VehicleCertificate(vehicleId, vehicleCertificate));
            return true;
        } catch (Exception e) {
            log.error("Vehicle certificate validation failed", e);
            return false;
        }
    }

    /**
     * Get contract certificate for vehicle (for billing)
     * @param vehicleId Vehicle identifier
     * @return Contract certificate if available
     */
    public ContractCertificate getContractCertificate(String vehicleId) {
        return contractCertificates.get(vehicleId);
    }

    /**
     * Store contract certificate for vehicle
     */
    public void storeContractCertificate(String vehicleId, ContractCertificate contractCert) {
        contractCertificates.put(vehicleId, contractCert);
        log.info("Contract certificate stored for vehicle: {}", vehicleId);
    }

    /**
     * Process Plug & Charge authentication
     * @param vehicleCertificate Vehicle certificate
     * @param contractCertificate Contract certificate (optional)
     * @return Authentication result
     */
    public PlugAndChargeResult authenticate(X509Certificate vehicleCertificate, X509Certificate contractCertificate) {
        if (!validateVehicleCertificate(vehicleCertificate)) {
            return PlugAndChargeResult.failed("Invalid vehicle certificate");
        }

        String vehicleId = extractVehicleId(vehicleCertificate);
        
        if (contractCertificate != null) {
            ContractCertificate contractCert = new ContractCertificate(vehicleId, contractCertificate);
            storeContractCertificate(vehicleId, contractCert);
            return PlugAndChargeResult.success(vehicleId, true);
        }

        return PlugAndChargeResult.success(vehicleId, false);
    }

    private String extractVehicleId(X509Certificate certificate) {
        // Extract vehicle ID from certificate subject
        String subject = certificate.getSubjectDN().getName();
        // In real implementation, parse subject DN properly
        return subject.contains("CN=") ? subject.split("CN=")[1].split(",")[0] : "unknown";
    }

    // Inner classes for certificate management
    public static class VehicleCertificate {
        private final String vehicleId;
        private final X509Certificate certificate;

        public VehicleCertificate(String vehicleId, X509Certificate certificate) {
            this.vehicleId = vehicleId;
            this.certificate = certificate;
        }

        public String getVehicleId() { return vehicleId; }
        public X509Certificate getCertificate() { return certificate; }
    }

    public static class ContractCertificate {
        private final String vehicleId;
        private final X509Certificate certificate;

        public ContractCertificate(String vehicleId, X509Certificate certificate) {
            this.vehicleId = vehicleId;
            this.certificate = certificate;
        }

        public String getVehicleId() { return vehicleId; }
        public X509Certificate getCertificate() { return certificate; }
    }

    public static class PlugAndChargeResult {
        private final boolean success;
        private final String vehicleId;
        private final boolean hasContract;
        private final String errorMessage;

        private PlugAndChargeResult(boolean success, String vehicleId, boolean hasContract, String errorMessage) {
            this.success = success;
            this.vehicleId = vehicleId;
            this.hasContract = hasContract;
            this.errorMessage = errorMessage;
        }

        public static PlugAndChargeResult success(String vehicleId, boolean hasContract) {
            return new PlugAndChargeResult(true, vehicleId, hasContract, null);
        }

        public static PlugAndChargeResult failed(String errorMessage) {
            return new PlugAndChargeResult(false, null, false, errorMessage);
        }

        public boolean isSuccess() { return success; }
        public String getVehicleId() { return vehicleId; }
        public boolean hasContract() { return hasContract; }
        public String getErrorMessage() { return errorMessage; }
    }
}
