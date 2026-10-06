package com.healthone.pattern.observer;

import com.healthone.model.record.EmergencyAccessLog;
import com.healthone.model.user.PatientUser;

/**
 * Concrete Observer: SMS Notification Service to Emergency Contacts.
 */
public class SmsNotificationObserver implements EmergencyObserver {

    @Override
    public void onEmergencyAccessTriggered(EmergencyAccessLog log, PatientUser patient) {
        String contactPhone = patient.getEmergencyContactPhone();
        String contactName = patient.getEmergencyContactName();
        System.out.println(String.format(
                "[SMS BROADCAST] 🚨 Alert sent to %s (%s) for Patient %s: Emergency record access by Dr./License %s",
                contactName, contactPhone, patient.getFullName(), log.getResponderLicense()
        ));
    }

    @Override
    public String getObserverName() {
        return "SMS Emergency Dispatcher";
    }
}
