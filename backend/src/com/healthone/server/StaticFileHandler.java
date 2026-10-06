package com.healthone.server;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;

/**
 * Static file handler serving React/Vite production build assets with SPA client routing fallback.
 */
public class StaticFileHandler implements HttpHandler {

    private final String staticDir;
    private static final Map<String, String> MIME_TYPES = new HashMap<>();

    static {
        MIME_TYPES.put("html", "text/html; charset=UTF-8");
        MIME_TYPES.put("htm", "text/html; charset=UTF-8");
        MIME_TYPES.put("js", "application/javascript; charset=UTF-8");
        MIME_TYPES.put("mjs", "application/javascript; charset=UTF-8");
        MIME_TYPES.put("css", "text/css; charset=UTF-8");
        MIME_TYPES.put("json", "application/json; charset=UTF-8");
        MIME_TYPES.put("png", "image/png");
        MIME_TYPES.put("jpg", "image/jpeg");
        MIME_TYPES.put("jpeg", "image/jpeg");
        MIME_TYPES.put("gif", "image/gif");
        MIME_TYPES.put("svg", "image/svg+xml");
        MIME_TYPES.put("ico", "image/x-icon");
        MIME_TYPES.put("mp4", "video/mp4");
        MIME_TYPES.put("webm", "video/webm");
        MIME_TYPES.put("woff", "font/woff");
        MIME_TYPES.put("woff2", "font/woff2");
        MIME_TYPES.put("ttf", "font/ttf");
    }

    public StaticFileHandler(String staticDir) {
        this.staticDir = staticDir;
    }

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        String path = exchange.getRequestURI().getPath();

        // If root or empty, serve index.html
        if (path == null || path.equals("/") || path.isBlank()) {
            path = "/index.html";
        }

        // Prevent path traversal
        path = path.replace("..", "");

        Path filePath = Paths.get(staticDir, path);
        File file = filePath.toFile();

        // If requested static file doesn't exist and not an API call, fallback to index.html (SPA routing)
        if (!file.exists() || file.isDirectory()) {
            filePath = Paths.get(staticDir, "index.html");
            file = filePath.toFile();
        }

        if (!file.exists()) {
            String notFound = "<h1>404 - Health-One Web Assets Not Found</h1><p>Ensure `dist/` directory exists.</p>";
            exchange.getResponseHeaders().set("Content-Type", "text/html; charset=UTF-8");
            byte[] bytes = notFound.getBytes();
            exchange.sendResponseHeaders(404, bytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(bytes);
            }
            return;
        }

        String mimeType = getMimeType(file.getName());
        exchange.getResponseHeaders().set("Content-Type", mimeType);
        exchange.getResponseHeaders().set("Cache-Control", file.getName().endsWith(".html") ? "no-cache" : "public, max-age=86400");

        long length = file.length();
        exchange.sendResponseHeaders(200, length);

        try (FileInputStream fis = new FileInputStream(file);
             OutputStream os = exchange.getResponseBody()) {
            byte[] buffer = new byte[8192];
            int count;
            while ((count = fis.read(buffer)) > 0) {
                os.write(buffer, 0, count);
            }
        }
    }

    private String getMimeType(String fileName) {
        int dot = fileName.lastIndexOf('.');
        if (dot > 0 && dot < fileName.length() - 1) {
            String ext = fileName.substring(dot + 1).toLowerCase();
            return MIME_TYPES.getOrDefault(ext, "application/octet-stream");
        }
        return "application/octet-stream";
    }
}
