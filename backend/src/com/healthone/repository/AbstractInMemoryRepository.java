package com.healthone.repository;

import com.healthone.model.common.Identifiable;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Predicate;
import java.util.stream.Collectors;

/**
 * Abstract Generic Repository implementing in-memory persistence.
 * Demonstrates:
 * - Thread-safe ConcurrentHashMap
 * - Java Streams API for functional queries (filter, collect)
 * - Generics with recursive type bounds
 */
public abstract class AbstractInMemoryRepository<T extends Identifiable<ID>, ID extends Serializable> implements Repository<T, ID> {

    protected final Map<ID, T> storage = new ConcurrentHashMap<>();

    @Override
    public T save(T entity) {
        if (entity == null || entity.getId() == null) {
            throw new IllegalArgumentException("Entity and its ID cannot be null");
        }
        storage.put(entity.getId(), entity);
        return entity;
    }

    @Override
    public Optional<T> findById(ID id) {
        if (id == null) return Optional.empty();
        return Optional.ofNullable(storage.get(id));
    }

    @Override
    public List<T> findAll() {
        return new ArrayList<>(storage.values());
    }

    @Override
    public List<T> findByFilter(Predicate<T> predicate) {
        return storage.values().stream()
                .filter(predicate)
                .collect(Collectors.toList());
    }

    @Override
    public boolean deleteById(ID id) {
        if (id == null) return false;
        return storage.remove(id) != null;
    }

    @Override
    public boolean existsById(ID id) {
        return id != null && storage.containsKey(id);
    }

    @Override
    public long count() {
        return storage.size();
    }

    @Override
    public void clear() {
        storage.clear();
    }
}
