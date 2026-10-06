package com.healthone.pattern.observer;

import com.healthone.model.record.EmergencyAccessLog;
import com.healthone.model.user.PatientUser;

/**
 * Observer interface for emergency broadcast events.
 * Demonstrates:
 * - Observer Design Pattern
 */
public interface EmergencyObserver {
    void onEmergencyAccessTriggered(EmergencyAccessLog log, PatientUser patient);
    String getObserverName();
}
