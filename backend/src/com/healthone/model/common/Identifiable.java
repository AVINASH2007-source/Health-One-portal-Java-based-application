package com.healthone.model.common;

import java.io.Serializable;

/**
 * Generic interface representing any entity with a unique identifier.
 * Demonstrates Java Generics with bounded type parameters.
 *
 * @param <ID> the type of identifier
 */
public interface Identifiable<ID extends Serializable> {
    ID getId();
}
