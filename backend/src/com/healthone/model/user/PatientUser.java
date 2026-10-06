package com.healthone.model.user;

import com.healthone.model.common.Exportable;
import com.healthone.model.enums.BloodGroup;
import com.healthone.model.enums.Role;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Patient User entity demonstrating:
 * - Builder Design Pattern
 * - Java Collections Framework (List, defensive unmodifiable copying)
 * - Inheritance (extends User)
 * - Polymorphism (implements Exportable)
 */
public class PatientUser extends User implements Exportable {

    private static final long serialVersionUID = 1L;

    private String patientNumber; // e.g., P-8821
    private LocalDate dateOfBirth;
    private String gender;
    private BloodGroup bloodGroup;
    private double heightCm;
    private double weightKg;
    private String emergencyContactName;
    private String emergencyContactPhone;
    private String emergencyContactRelation;
    private String organDonorStatus;
    private List<String> allergies;
    private List<String> chronicConditions;
    private List<String> activeMedications;
    private List<String> surgeries;
    private String primaryPhysician;
    private String preferredLanguage;

    private PatientUser(Builder builder) {
        super(builder.id, builder.email, builder.passwordHash, builder.fullName, builder.phone, Role.PATIENT);
        this.patientNumber = builder.patientNumber;
        this.dateOfBirth = builder.dateOfBirth;
        this.gender = builder.gender;
        this.bloodGroup = builder.bloodGroup;
        this.heightCm = builder.heightCm;
        this.weightKg = builder.weightKg;
        this.emergencyContactName = builder.emergencyContactName;
        this.emergencyContactPhone = builder.emergencyContactPhone;
        this.emergencyContactRelation = builder.emergencyContactRelation;
        this.organDonorStatus = builder.organDonorStatus;
        this.allergies = new ArrayList<>(builder.allergies);
        this.chronicConditions = new ArrayList<>(builder.chronicConditions);
        this.activeMedications = new ArrayList<>(builder.activeMedications);
        this.surgeries = new ArrayList<>(builder.surgeries);
        this.primaryPhysician = builder.primaryPhysician;
        this.preferredLanguage = builder.preferredLanguage;
    }

    public static Builder builder() {
        return new Builder();
    }

    // Encapsulated Getters & Setters
    public String getPatientNumber() { return patientNumber; }
    public void setPatientNumber(String patientNumber) { this.patientNumber = patientNumber; }

    public LocalDate getDateOfBirth() { return dateOfBirth; }
    public void setDateOfBirth(LocalDate dateOfBirth) { this.dateOfBirth = dateOfBirth; }

    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }

    public BloodGroup getBloodGroup() { return bloodGroup; }
    public void setBloodGroup(BloodGroup bloodGroup) { this.bloodGroup = bloodGroup; }

    public double getHeightCm() { return heightCm; }
    public void setHeightCm(double heightCm) { this.heightCm = heightCm; }

    public double getWeightKg() { return weightKg; }
    public void setWeightKg(double weightKg) { this.weightKg = weightKg; }

    public String getEmergencyContactName() { return emergencyContactName; }
    public void setEmergencyContactName(String emergencyContactName) { this.emergencyContactName = emergencyContactName; }

    public String getEmergencyContactPhone() { return emergencyContactPhone; }
    public void setEmergencyContactPhone(String emergencyContactPhone) { this.emergencyContactPhone = emergencyContactPhone; }

    public String getEmergencyContactRelation() { return emergencyContactRelation; }
    public void setEmergencyContactRelation(String emergencyContactRelation) { this.emergencyContactRelation = emergencyContactRelation; }

    public String getOrganDonorStatus() { return organDonorStatus; }
    public void setOrganDonorStatus(String organDonorStatus) { this.organDonorStatus = organDonorStatus; }

    public List<String> getAllergies() { return Collections.unmodifiableList(allergies); }
    public void setAllergies(List<String> allergies) { this.allergies = new ArrayList<>(allergies); }
    public void addAllergy(String allergy) { if (allergy != null) this.allergies.add(allergy); }

    public List<String> getChronicConditions() { return Collections.unmodifiableList(chronicConditions); }
    public void setChronicConditions(List<String> conditions) { this.chronicConditions = new ArrayList<>(conditions); }
    public void addChronicCondition(String condition) { if (condition != null) this.chronicConditions.add(condition); }

    public List<String> getActiveMedications() { return Collections.unmodifiableList(activeMedications); }
    public void setActiveMedications(List<String> medications) { this.activeMedications = new ArrayList<>(medications); }

    public List<String> getSurgeries() { return Collections.unmodifiableList(surgeries); }
    public void setSurgeries(List<String> surgeries) { this.surgeries = new ArrayList<>(surgeries); }
    public void addSurgery(String surgery) { if (surgery != null) this.surgeries.add(surgery); }

    public String getPrimaryPhysician() { return primaryPhysician; }
    public void setPrimaryPhysician(String primaryPhysician) { this.primaryPhysician = primaryPhysician; }

    public String getPreferredLanguage() { return preferredLanguage; }
    public void setPreferredLanguage(String preferredLanguage) { this.preferredLanguage = preferredLanguage; }

    public double calculateBmi() {
        if (heightCm <= 0) return 0;
        double heightInMeters = heightCm / 100.0;
        return weightKg / (heightInMeters * heightInMeters);
    }

    @Override
    public String getRoleSpecificBadge() {
        return "Patient [" + (patientNumber != null ? patientNumber : id) + "] Blood: " + (bloodGroup != null ? bloodGroup.getSymbol() : "N/A");
    }

    @Override
    public String toJson() {
        return String.format(
            "{\"id\":\"%s\",\"patientNumber\":\"%s\",\"fullName\":\"%s\",\"bloodGroup\":\"%s\",\"allergies\":%d}",
            id, patientNumber, fullName, bloodGroup != null ? bloodGroup.getSymbol() : "", allergies.size()
        );
    }

    @Override
    public String toCsvRow() {
        return String.format("%s,%s,%s,%s,%.1f,%.1f", id, patientNumber, fullName, bloodGroup, heightCm, weightKg);
    }

    @Override
    public String toFormattedSummary() {
        return String.format("Patient %s (%s) | DOB: %s | Blood: %s | BMI: %.1f",
            fullName, patientNumber, dateOfBirth, bloodGroup != null ? bloodGroup.getSymbol() : "N/A", calculateBmi());
    }

    // Builder Pattern Implementation
    public static class Builder {
        private String id;
        private String email;
        private String passwordHash;
        private String fullName;
        private String phone;
        private String patientNumber;
        private LocalDate dateOfBirth;
        private String gender = "Not Specified";
        private BloodGroup bloodGroup = BloodGroup.O_POSITIVE;
        private double heightCm = 175.0;
        private double weightKg = 70.0;
        private String emergencyContactName = "";
        private String emergencyContactPhone = "";
        private String emergencyContactRelation = "Family";
        private String organDonorStatus = "Registered Donor";
        private List<String> allergies = new ArrayList<>();
        private List<String> chronicConditions = new ArrayList<>();
        private List<String> activeMedications = new ArrayList<>();
        private List<String> surgeries = new ArrayList<>();
        private String primaryPhysician = "Dr. Sarah Jenkins";
        private String preferredLanguage = "English (US)";

        public Builder id(String id) { this.id = id; return this; }
        public Builder email(String email) { this.email = email; return this; }
        public Builder passwordHash(String passwordHash) { this.passwordHash = passwordHash; return this; }
        public Builder fullName(String fullName) { this.fullName = fullName; return this; }
        public Builder phone(String phone) { this.phone = phone; return this; }
        public Builder patientNumber(String patientNumber) { this.patientNumber = patientNumber; return this; }
        public Builder dateOfBirth(LocalDate dateOfBirth) { this.dateOfBirth = dateOfBirth; return this; }
        public Builder gender(String gender) { this.gender = gender; return this; }
        public Builder bloodGroup(BloodGroup bloodGroup) { this.bloodGroup = bloodGroup; return this; }
        public Builder heightCm(double heightCm) { this.heightCm = heightCm; return this; }
        public Builder weightKg(double weightKg) { this.weightKg = weightKg; return this; }
        public Builder emergencyContactName(String name) { this.emergencyContactName = name; return this; }
        public Builder emergencyContactPhone(String phone) { this.emergencyContactPhone = phone; return this; }
        public Builder emergencyContactRelation(String rel) { this.emergencyContactRelation = rel; return this; }
        public Builder organDonorStatus(String status) { this.organDonorStatus = status; return this; }
        public Builder allergies(List<String> allergies) { if (allergies != null) this.allergies = allergies; return this; }
        public Builder chronicConditions(List<String> conditions) { if (conditions != null) this.chronicConditions = conditions; return this; }
        public Builder activeMedications(List<String> meds) { if (meds != null) this.activeMedications = meds; return this; }
        public Builder surgeries(List<String> surgeries) { if (surgeries != null) this.surgeries = surgeries; return this; }
        public Builder primaryPhysician(String physician) { this.primaryPhysician = physician; return this; }
        public Builder preferredLanguage(String language) { this.preferredLanguage = language; return this; }

        public PatientUser build() {
            return new PatientUser(this);
        }
    }
}
