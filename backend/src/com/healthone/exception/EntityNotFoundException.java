package com.healthone.exception;

/**
 * Thrown when a requested resource is not found.
 */
public class EntityNotFoundException extends HealthOneException {

    private static final long serialVersionUID = 1L;

    public EntityNotFoundException(String entityName, Object identifier) {
        super(entityName + " with identifier '" + identifier + "' was not found.", "NOT_FOUND", 404);
    }
}
