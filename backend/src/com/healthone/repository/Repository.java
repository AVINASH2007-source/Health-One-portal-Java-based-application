package com.healthone.repository;

import com.healthone.model.common.Identifiable;

import java.io.Serializable;
import java.util.List;
import java.util.Optional;
import java.util.function.Predicate;

/**
 * Generic CRUD Repository interface.
 * Demonstrates:
 * - Java Generics with Bounded Types (<T extends Identifiable<ID>>)
 * - Functional Predicates (Predicate<T>)
 * - Optional return types
 *
 * @param <T>  Entity type
 * @param <ID> Key type
 */
public interface Repository<T extends Identifiable<ID>, ID extends Serializable> {
    T save(T entity);
    Optional<T> findById(ID id);
    List<T> findAll();
    List<T> findByFilter(Predicate<T> predicate);
    boolean deleteById(ID id);
    boolean existsById(ID id);
    long count();
    void clear();
}
