package com.healthone.concurrency;

import java.util.concurrent.*;
import java.util.function.Supplier;

/**
 * Thread Manager for asynchronous tasks and concurrency.
 * Demonstrates:
 * - Concurrency Framework (ExecutorService, ThreadPoolExecutor)
 * - CompletableFuture asynchronous pipelines
 * - Thread pool lifecycle & graceful shutdown
 */
public class ThreadManager {

    private static final ThreadManager INSTANCE = new ThreadManager();

    private final ExecutorService ioExecutor;
    private final ExecutorService computationalExecutor;
    private final ScheduledExecutorService scheduledExecutor;

    private ThreadManager() {
        int cores = Runtime.getRuntime().availableProcessors();
        this.ioExecutor = Executors.newFixedThreadPool(Math.max(4, cores * 2), new NamedThreadFactory("HealthOne-IO-Worker"));
        this.computationalExecutor = Executors.newFixedThreadPool(Math.max(2, cores), new NamedThreadFactory("HealthOne-Compute-Worker"));
        this.scheduledExecutor = Executors.newScheduledThreadPool(2, new NamedThreadFactory("HealthOne-Scheduled-Worker"));
    }

    public static ThreadManager getInstance() {
        return INSTANCE;
    }

    public <T> CompletableFuture<T> supplyAsync(Supplier<T> supplier) {
        return CompletableFuture.supplyAsync(supplier, computationalExecutor);
    }

    public CompletableFuture<Void> runAsync(Runnable runnable) {
        return CompletableFuture.runAsync(runnable, ioExecutor);
    }

    public void scheduleRecurring(Runnable task, long initialDelay, long period, TimeUnit unit) {
        scheduledExecutor.scheduleAtFixedRate(task, initialDelay, period, unit);
    }

    public void shutdown() {
        ioExecutor.shutdown();
        computationalExecutor.shutdown();
        scheduledExecutor.shutdown();
        try {
            if (!ioExecutor.awaitTermination(3, TimeUnit.SECONDS)) ioExecutor.shutdownNow();
            if (!computationalExecutor.awaitTermination(3, TimeUnit.SECONDS)) computationalExecutor.shutdownNow();
            if (!scheduledExecutor.awaitTermination(3, TimeUnit.SECONDS)) scheduledExecutor.shutdownNow();
        } catch (InterruptedException e) {
            ioExecutor.shutdownNow();
            computationalExecutor.shutdownNow();
            scheduledExecutor.shutdownNow();
            Thread.currentThread().interrupt();
        }
    }

    private static class NamedThreadFactory implements ThreadFactory {
        private final String prefix;
        private int count = 1;

        public NamedThreadFactory(String prefix) {
            this.prefix = prefix;
        }

        @Override
        public Thread newThread(Runnable r) {
            Thread thread = new Thread(r, prefix + "-" + (count++));
            thread.setDaemon(true);
            return thread;
        }
    }
}
