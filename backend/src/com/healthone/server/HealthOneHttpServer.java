package com.healthone.server;

import com.healthone.config.ServerConfig;
import com.healthone.server.filter.CorsFilter;
import com.healthone.server.filter.RequestLoggingFilter;
import com.sun.net.httpserver.HttpContext;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.util.concurrent.Executors;

/**
 * Embedded Java HTTP Server orchestrating API handlers and Static File Web serving.
 * Demonstrates:
 * - Java SE com.sun.net.httpserver
 * - Multi-threaded HTTP Dispatcher
 * - Filter Chains
 */
public class HealthOneHttpServer {

    private final ServerConfig config;
    private final HttpHandlerRegistry apiRegistry;
    private final StaticFileHandler staticFileHandler;
    private HttpServer server;

    public HealthOneHttpServer(ServerConfig config, HttpHandlerRegistry apiRegistry, StaticFileHandler staticFileHandler) {
        this.config = config;
        this.apiRegistry = apiRegistry;
        this.staticFileHandler = staticFileHandler;
    }

    public void start() throws IOException {
        int port = config.getPort();
        server = HttpServer.create(new InetSocketAddress(port), 0);

        // Attach API context with CORS & Logging filters
        HttpContext apiContext = server.createContext("/api", apiRegistry);
        apiContext.getFilters().add(new CorsFilter());
        apiContext.getFilters().add(new RequestLoggingFilter());

        // Attach Static Web Context (serves frontend SPA)
        HttpContext rootContext = server.createContext("/", staticFileHandler);
        rootContext.getFilters().add(new CorsFilter());

        // Multi-threaded executor pool
        server.setExecutor(Executors.newVirtualThreadPerTaskExecutor() != null
                ? Executors.newVirtualThreadPerTaskExecutor()
                : Executors.newFixedThreadPool(16));

        server.start();
    }

    public void stop() {
        if (server != null) {
            server.stop(1);
        }
    }
}
