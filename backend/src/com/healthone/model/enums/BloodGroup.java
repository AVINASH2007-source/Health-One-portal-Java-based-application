package com.healthone.model.enums;

import java.util.Set;

/**
 * Blood group enum with compatibility matrix.
 * Demonstrates:
 * - Complex enum methods
 * - Set collections in enum
 */
public enum BloodGroup {
    A_POSITIVE("A+"),
    A_NEGATIVE("A-"),
    B_POSITIVE("B+"),
    B_NEGATIVE("B-"),
    AB_POSITIVE("AB+"),
    AB_NEGATIVE("AB-"),
    O_POSITIVE("O+"),
    O_NEGATIVE("O-");

    private final String symbol;

    BloodGroup(String symbol) {
        this.symbol = symbol;
    }

    public String getSymbol() {
        return symbol;
    }

    public boolean canReceiveFrom(BloodGroup donor) {
        return switch (this) {
            case AB_POSITIVE -> true; // Universal recipient
            case AB_NEGATIVE -> Set.of(O_NEGATIVE, B_NEGATIVE, A_NEGATIVE, AB_NEGATIVE).contains(donor);
            case A_POSITIVE -> Set.of(O_NEGATIVE, O_POSITIVE, A_NEGATIVE, A_POSITIVE).contains(donor);
            case A_NEGATIVE -> Set.of(O_NEGATIVE, A_NEGATIVE).contains(donor);
            case B_POSITIVE -> Set.of(O_NEGATIVE, O_POSITIVE, B_NEGATIVE, B_POSITIVE).contains(donor);
            case B_NEGATIVE -> Set.of(O_NEGATIVE, B_NEGATIVE).contains(donor);
            case O_POSITIVE -> Set.of(O_NEGATIVE, O_POSITIVE).contains(donor);
            case O_NEGATIVE -> donor == O_NEGATIVE; // Universal donor
        };
    }

    public static BloodGroup fromSymbol(String symbol) {
        if (symbol == null) return O_POSITIVE;
        for (BloodGroup bg : BloodGroup.values()) {
            if (bg.symbol.equalsIgnoreCase(symbol.trim()) || bg.name().equalsIgnoreCase(symbol.trim())) {
                return bg;
            }
        }
        return O_POSITIVE;
    }
}
