package com.healthone.pattern.factory;

import com.healthone.model.enums.DepartmentType;
import com.healthone.model.enums.Role;
import com.healthone.model.user.DoctorUser;
import com.healthone.model.user.PatientUser;
import com.healthone.model.user.User;

import java.util.UUID;

/**
 * Factory Design Pattern for polymorphic user creation.
 */
public class UserFactory {

    public static User createUser(Role role, String email, String password, String fullName, String phone) {
        String id = UUID.randomUUID().toString().substring(0, 8);
        return switch (role) {
            case PATIENT -> PatientUser.builder()
                    .id("P-" + id)
                    .email(email)
                    .fullName(fullName)
                    .phone(phone)
                    .patientNumber("PAT-" + id.toUpperCase())
                    .build();
            case DOCTOR -> new DoctorUser(
                    "DOC-" + id,
                    email,
                    password,
                    fullName,
                    phone,
                    "LIC-" + id.toUpperCase(),
                    "General Physician",
                    DepartmentType.GENERAL_MEDICINE,
                    "Health-One Medical Center",
                    8,
                    4.9
            );
        };
    }
}
