package com.talentsphere.shared.resilience;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class N1QueryOptimizer {

    private final EntityManager entityManager;

    public <T, ID> List<T> fetchByIds(List<ID> ids, Function<List<ID>, List<T>> batchLoader) {
        if (ids == null || ids.isEmpty()) {
            return new ArrayList<>();
        }

        return fetchByIds(ids, batchLoader, 100);
    }

    public <T, ID> List<T> fetchByIds(List<ID> ids, Function<List<ID>, List<T>> batchLoader, int batchSize) {
        if (ids == null || ids.isEmpty()) {
            return new ArrayList<>();
        }

        List<T> results = new ArrayList<>();

        for (int i = 0; i < ids.size(); i += batchSize) {
            List<ID> batch = ids.subList(i, Math.min(i + batchSize, ids.size()));
            List<T> batchResults = batchLoader.apply(batch);
            results.addAll(batchResults);
        }

        return results;
    }

    public <T, ID> List<T> batchLoad(Class<T> entityClass, List<ID> ids) {
        if (ids == null || ids.isEmpty()) {
            return new ArrayList<>();
        }

        String jpql = "SELECT e FROM " + entityClass.getSimpleName() + " e WHERE e.id IN :ids";
        List<T> results = entityManager.createQuery(jpql, entityClass)
                .setParameter("ids", ids)
                .getResultList();

        log.debug("Batch loaded {} {}s for {} IDs", results.size(), entityClass.getSimpleName(), ids.size());

        return results;
    }

    public <T, K> Map<K, T> batchLoadAsMap(Class<T> entityClass, List<K> keys, java.util.function.Function<K, T> loader) {
        return keys.stream()
                .collect(Collectors.toMap(
                        k -> k,
                        k -> loader.apply(k)
                ));
    }

    public static class QueryBatcher {
        private final List<Object> ids = new ArrayList<>();
        private final int batchSize;
        private final Function<List<Object>, List<?>> batchLoader;

        public QueryBatcher(int batchSize, Function<List<Object>, List<?>> batchLoader) {
            this.batchSize = batchSize;
            this.batchLoader = batchLoader;
        }

        public QueryBatcher add(Object id) {
            ids.add(id);
            if (ids.size() >= batchSize) {
                flush();
            }
            return this;
        }

        public List<?> flush() {
            if (ids.isEmpty()) {
                return new ArrayList<>();
            }

            List<?> results = batchLoader.apply(new ArrayList<>(ids));
            ids.clear();
            return results;
        }

        public int size() {
            return ids.size();
        }
    }
}