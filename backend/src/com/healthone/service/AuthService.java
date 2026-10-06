package com.healthone.service;

import com.healthone.exception.EntityNotFoundException;
import com.healthone.exception.UnauthorizedAccessException;
import com.healthone.exception.ValidationException;
import com.healthone.model.enums.Role;
import com.healthone.model.records.AuthSession;
import com.healthone.model.user.DoctorUser;
import com.healthone.model.user.PatientUser;
import com.healthone.model.user.User;
import com.healthone.pattern.factory.UserFactory;
import com.healthone.repository.DoctorRepository;
import com.healthone.repository.PatientRepository;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Authentication Service managing users and active sessions.
 * Demonstrates:
 * - Thread-safe session tracking (ConcurrentHashMap)
 * - Custom exception throwing
 * - Factory Pattern invocation
 */
public class AuthService {

    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final Map<String, AuthSession> activeSessions = new ConcurrentHashMap<>();

    public AuthService(PatientRepository patientRepository, DoctorRepository doctorRepository) {
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
    }

    public AuthSession login(String email, String password, Role requestedRole) {
        if (email == null || email.isBlank()) {
            throw new ValidationException("Email address is required.");
        }

        String sanitizedEmail = email.trim().toLowerCase();
        User user = findUserByEmailAndRole(sanitizedEmail, requestedRole)
                .orElseThrow(() -> new EntityNotFoundException("Account for role " + requestedRole, sanitizedEmail));

        String token = "jwt_" + UUID.randomUUID().toString().replace("-", "");
        AuthSession session = new AuthSession(
                UUID.randomUUID().toString(),
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole(),
                token,
                LocalDateTime.now(),
                LocalDateTime.now().plusHours(24)
        );

        activeSessions.put(token, session);
        return session;
    }

    public AuthSession register(Role role, String email, String password, String fullName, String phone) {
        if (email == null || email.isBlank() || fullName == null || fullName.isBlank()) {
            throw new ValidationException("Email and full name are required.");
        }

        User newUser = UserFactory.createUser(role, email.trim(), password, fullName.trim(), phone);
        if (newUser instanceof PatientUser patient) {
            patientRepository.save(patient);
        } else if (newUser instanceof DoctorUser doctor) {
            doctorRepository.save(doctor);
        }

        return login(email, password, role);
    }

    public Optional<AuthSession> validateSession(String token) {
        if (token == null || token.isBlank()) return Optional.empty();
        AuthSession session = activeSessions.get(token);
        if (session != null && session.isValid()) {
            return Optional.of(session);
        }
        return Optional.empty();
    }

    public void logout(String token) {
        if (token != null) {
            activeSessions.remove(token);
        }
    }

    private Optional<? extends User> findUserByEmailAndRole(String email, Role role) {
        if (role == Role.PATIENT) {
            return patientRepository.findByEmail(email);
        } else if (role == Role.DOCTOR) {
            return doctorRepository.findByEmail(email);
        }
        return Optional.empty();
    }
}
