package com.healthone.repository;

import com.healthone.model.enums.DepartmentType;
import com.healthone.model.user.DoctorUser;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Repository for Doctor entities.
 */
public class DoctorRepository extends AbstractInMemoryRepository<DoctorUser, String> {

    public Optional<DoctorUser> findByEmail(String email) {
        if (email == null) return Optional.empty();
        return storage.values().stream()
                .filter(d -> d.getEmail().equalsIgnoreCase(email.trim()))
                .findFirst();
    }

    public Optional<DoctorUser> findByLicenseNumber(String license) {
        if (license == null) return Optional.empty();
        return storage.values().stream()
                .filter(d -> d.getLicenseNumber().equalsIgnoreCase(license.trim()))
                .findFirst();
    }

    public List<DoctorUser> findByDepartment(DepartmentType department) {
        return storage.values().stream()
                .filter(d -> d.getDepartment() == department)
                .collect(Collectors.toList());
    }
}
