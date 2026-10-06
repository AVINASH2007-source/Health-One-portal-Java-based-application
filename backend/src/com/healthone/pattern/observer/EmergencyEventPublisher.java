package com.healthone.pattern.observer;

import com.healthone.model.record.EmergencyAccessLog;
import com.healthone.model.user.PatientUser;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Subject/Publisher in the Observer Design Pattern.
 * Demonstrates:
 * - Thread-safe Collections (CopyOnWriteArrayList)
 * - Decoupled broadcast event distribution
 */
public class EmergencyEventPublisher {

    private final List<EmergencyObserver> observers = new CopyOnWriteArrayList<>();

    public void subscribe(EmergencyObserver observer) {
        if (observer != null && !observers.contains(observer)) {
            observers.add(observer);
        }
    }

    public void unsubscribe(EmergencyObserver observer) {
        observers.remove(observer);
    }

    public void notifyAllObservers(EmergencyAccessLog log, PatientUser patient) {
        for (EmergencyObserver observer : observers) {
            try {
                observer.onEmergencyAccessTriggered(log, patient);
            } catch (Exception e) {
                System.err.println("[Observer Error] Failed notifying " + observer.getObserverName() + ": " + e.getMessage());
            }
        }
    }
}
