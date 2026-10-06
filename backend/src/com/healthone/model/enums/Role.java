package com.healthone.model.enums;

import java.util.Set;

/**
 * Enumeration representing user roles in the Health-One Portal.
 * Demonstrates:
 * - Java Enums with properties, constructors, and methods
 * - Encapsulated permission sets
 * - Enum polymorphism and helper methods
 */
public enum Role {
    PATIENT("Patient", "/patient", "ROLE_PATIENT", Set.of("VIEW_OWN_RECORDS", "BOOK_APPOINTMENT", "VIEW_TIMELINE", "DOWNLOAD_EMERGENCY_CARD")),
    DOCTOR("Doctor", "/doctor", "ROLE_DOCTOR", Set.of("VIEW_PATIENT_RECORDS", "CREATE_PRESCRIPTION", "ADD_DIAGNOSIS", "APPROVE_APPOINTMENT", "VIEW_EMERGENCY_LOGS"));

    private final String displayName;
    private final String defaultPath;
    private final String authority;
    private final Set<String> permissions;

    Role(String displayName, String defaultPath, String authority, Set<String> permissions) {
        this.displayName = displayName;
        this.defaultPath = defaultPath;
        this.authority = authority;
        this.permissions = permissions;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getDefaultPath() {
        return defaultPath;
    }

    public String getAuthority() {
        return authority;
    }

    public Set<String> getPermissions() {
        return permissions;
    }

    public boolean hasPermission(String permission) {
        return this.permissions.contains(permission);
    }

    public static Role fromString(String text) {
        if (text == null) return null;
        for (Role role : Role.values()) {
            if (role.name().equalsIgnoreCase(text) || role.displayName.equalsIgnoreCase(text)) {
                return role;
            }
        }
        throw new IllegalArgumentException("Unknown role: " + text);
    }
}
