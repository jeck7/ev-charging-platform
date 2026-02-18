package com.emobility.charging.repository;

import com.emobility.charging.entity.ChargingSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChargingSessionRepository extends JpaRepository<ChargingSession, Long> {
    List<ChargingSession> findByUserIdOrderByStartedAtDesc(String userId);
}
