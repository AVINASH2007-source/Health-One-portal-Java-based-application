package com.healthone.exception;

/**
 * Thrown when an invalid medical license or invalid emergency request is received.
 */
public class EmergencyAccessDeniedException extends HealthOneException {

    private static final long serialVersionUID = 1L;

    public EmergencyAccessDeniedException(String reason) {
        super("Emergency access request was rejected: " + reason, "EMERGENCY_ACCESS_DENIED", 403);
    }
}
