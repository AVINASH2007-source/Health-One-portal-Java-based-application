package com.healthone.server.filter;

import com.sun.net.httpserver.Filter;
import com.sun.net.httpserver.HttpExchange;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Filter for auditing incoming HTTP exchanges.
 */
public class RequestLoggingFilter extends Filter {

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS");

    @Override
    public void doFilter(HttpExchange exchange, Chain chain) throws IOException {
        long start = System.currentTimeMillis();
        String method = exchange.getRequestMethod();
        String uri = exchange.getRequestURI().toString();
        String clientIp = exchange.getRemoteAddress().getAddress().getHostAddress();

        try {
            chain.doFilter(exchange);
        } finally {
            long duration = System.currentTimeMillis() - start;
            System.out.printf("[%s] [HTTP %s] %s -> %s (%d ms)%n",
                    LocalDateTime.now().format(FORMATTER),
                    method,
                    clientIp,
                    uri,
                    duration
            );
        }
    }

    @Override
    public String description() {
        return "Request Logging & Performance Filter";
    }
}
