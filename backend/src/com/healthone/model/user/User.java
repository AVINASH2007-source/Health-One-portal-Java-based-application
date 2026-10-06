package com.healthone.model.user;

import com.healthone.model.common.BaseEntity;
import com.healthone.model.enums.Role;

import java.util.Objects;

/**
 * Abstract Base User entity demonstrating:
 * - Inheritance (Extends BaseEntity<String>)
 * - Encapsulation (Private fields with accessors)
 * - Abstraction (Abstract methods for user-specific operations)
 */
public abstract class User extends BaseEntity<String> {

    private static final long serialVersionUID = 1L;

    protected String email;
    protected String passwordHash;
    protected String fullName;
    protected String phone;
    protected Role role;
    protected boolean active;

    protected User() {
        super();
        this.active = true;
    }

    protected User(String id, String email, String passwordHash, String fullName, String phone, Role role) {
        super(id, "SYSTEM");
        this.email = Objects.requireNonNull(email, "Email cannot be null");
        this.passwordHash = passwordHash;
        this.fullName = Objects.requireNonNull(fullName, "Full name cannot be null");
        this.phone = phone;
        this.role = Objects.requireNonNull(role, "Role cannot be null");
        this.active = true;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    /**
     * Polymorphic method to get portal dashboard URL based on user role.
     */
    public String getDashboardRoute() {
        return role.getDefaultPath();
    }

    /**
     * Abstract method to get user-specific summary/badge.
     */
    public abstract String getRoleSpecificBadge();

    @Override
    public String toString() {
        return "User{" +
                "id='" + id + '\'' +
                ", email='" + email + '\'' +
                ", fullName='" + fullName + '\'' +
                ", role=" + role +
                '}';
    }
}
