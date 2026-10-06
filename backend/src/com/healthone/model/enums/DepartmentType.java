package com.healthone.model.enums;

/**
 * Hospital department types.
 */
public enum DepartmentType {
    CARDIOLOGY("Cardiology", "Heart & Vascular Center", 45),
    NEUROLOGY("Neurology", "Brain & Spine Institute", 30),
    ONCOLOGY("Oncology", "Cancer Care Center", 40),
    PULMONOLOGY("Pulmonology", "Respiratory Health", 25),
    EMERGENCY_TRAUMA("Emergency & Trauma", "Level 1 Trauma Center", 60),
    PEDIATRICS("Pediatrics", "Children's Health", 35),
    ORTHOPEDICS("Orthopedics", "Bone & Joint Clinic", 30),
    GENERAL_MEDICINE("General Medicine", "Internal Medicine", 50);

    private final String title;
    private final String subtitle;
    private final int defaultBedCapacity;

    DepartmentType(String title, String subtitle, int defaultBedCapacity) {
        this.title = title;
        this.subtitle = subtitle;
        this.defaultBedCapacity = defaultBedCapacity;
    }

    public String getTitle() {
        return title;
    }

    public String getSubtitle() {
        return subtitle;
    }

    public int getDefaultBedCapacity() {
        return defaultBedCapacity;
    }
}
