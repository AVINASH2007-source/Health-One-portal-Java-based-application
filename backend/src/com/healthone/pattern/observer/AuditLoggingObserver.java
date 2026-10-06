package com.healthone.pattern.observer;

import com.healthone.model.record.EmergencyAccessLog;
import com.healthone.model.user.PatientUser;

/**
 * Concrete Observer: HIPAA Compliance & Security Audit Logger.
 */
public class AuditLoggingObserver implements EmergencyObserver {

    @Override
    public void onEmergencyAccessTriggered(EmergencyAccessLog log, PatientUser patient) {
        System.out.println(String.format(
                "[SECURITY AUDIT] COMPLIANCE LOG #%s | Patient: %s | License: %s | Status: %s | Time: %s",
                log.getId(), patient.getId(), log.getResponderLicense(), log.getStatusBadge(), log.getAccessedAt()
        ));
    }

    @Override
    public String getObserverName() {
        return "HIPAA Compliance Audit Logger";
    }
}
