package com.healthone.concurrency;

import java.util.concurrent.CompletableFuture;
import java.util.function.Function;

/**
 * Utility for chaining async health computations using CompletableFuture.
 */
public class AsyncHealthTask {

    public static <T, R> CompletableFuture<R> computeAsync(T input, Function<T, R> computation) {
        return ThreadManager.getInstance().supplyAsync(() -> computation.apply(input));
    }
}
