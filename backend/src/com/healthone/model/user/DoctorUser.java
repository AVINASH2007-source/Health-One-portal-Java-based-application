package com.healthone.model.user;

import com.healthone.model.enums.DepartmentType;
import com.healthone.model.enums.Role;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Doctor User entity representing medical professionals.
 * Demonstrates:
 * - Inheritance
 * - Encapsulation
 * - Collections
 */
public class DoctorUser extends User {

    private static final long serialVersionUID = 1L;

    private String licenseNumber;
    private String specialization;
    private DepartmentType department;
    private String hospitalAffiliation;
    private int yearsOfExperience;
    private double rating;
    private int totalPatientsTreated;
    private List<String> availableDays;
    private String consultingHours;

    public DoctorUser(String id, String email, String passwordHash, String fullName, String phone,
                      String licenseNumber, String specialization, DepartmentType department,
                      String hospitalAffiliation, int yearsOfExperience, double rating) {
        super(id, email, passwordHash, fullName, phone, Role.DOCTOR);
        this.licenseNumber = licenseNumber;
        this.specialization = specialization;
        this.department = department;
        this.hospitalAffiliation = hospitalAffiliation;
        this.yearsOfExperience = yearsOfExperience;
        this.rating = rating;
        this.totalPatientsTreated = 1200;
        this.availableDays = new ArrayList<>(List.of("Monday", "Tuesday", "Wednesday", "Thursday", "Friday"));
        this.consultingHours = "09:00 AM - 05:00 PM";
    }

    public String getLicenseNumber() { return licenseNumber; }
    public void setLicenseNumber(String licenseNumber) { this.licenseNumber = licenseNumber; }

    public String getSpecialization() { return specialization; }
    public void setSpecialization(String specialization) { this.specialization = specialization; }

    public DepartmentType getDepartment() { return department; }
    public void setDepartment(DepartmentType department) { this.department = department; }

    public String getHospitalAffiliation() { return hospitalAffiliation; }
    public void setHospitalAffiliation(String hospitalAffiliation) { this.hospitalAffiliation = hospitalAffiliation; }

    public int getYearsOfExperience() { return yearsOfExperience; }
    public void setYearsOfExperience(int yearsOfExperience) { this.yearsOfExperience = yearsOfExperience; }

    public double getRating() { return rating; }
    public void setRating(double rating) { this.rating = rating; }

    public int getTotalPatientsTreated() { return totalPatientsTreated; }
    public void setTotalPatientsTreated(int totalPatientsTreated) { this.totalPatientsTreated = totalPatientsTreated; }

    public List<String> getAvailableDays() { return Collections.unmodifiableList(availableDays); }
    public void setAvailableDays(List<String> availableDays) { this.availableDays = new ArrayList<>(availableDays); }

    public String getConsultingHours() { return consultingHours; }
    public void setConsultingHours(String consultingHours) { this.consultingHours = consultingHours; }

    @Override
    public String getRoleSpecificBadge() {
        return "Dr. " + fullName + " (" + specialization + " - " + licenseNumber + ")";
    }
}
