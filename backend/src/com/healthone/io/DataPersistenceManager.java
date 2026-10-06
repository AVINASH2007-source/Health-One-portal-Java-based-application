package com.healthone.io;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;

/**
 * File I/O and Persistence Manager.
 * Demonstrates:
 * - Java NIO (Path, Paths, Files)
 * - Buffered I/O Streams with try-with-resources
 * - UTF-8 character encoding
 */
public class DataPersistenceManager {

    private final Path storageDirectory;

    public DataPersistenceManager(String baseDir) {
        this.storageDirectory = Paths.get(baseDir);
        try {
            if (!Files.exists(storageDirectory)) {
                Files.createDirectories(storageDirectory);
            }
        } catch (IOException e) {
            System.err.println("Failed to initialize storage directory: " + e.getMessage());
        }
    }

    public void writeTextFile(String fileName, String content) throws IOException {
        Path targetPath = storageDirectory.resolve(fileName);
        try (BufferedWriter writer = Files.newBufferedWriter(
                targetPath,
                StandardCharsets.UTF_8,
                StandardOpenOption.CREATE,
                StandardOpenOption.TRUNCATE_EXISTING,
                StandardOpenOption.WRITE)) {
            writer.write(content);
        }
    }

    public String readTextFile(String fileName) throws IOException {
        Path targetPath = storageDirectory.resolve(fileName);
        if (!Files.exists(targetPath)) {
            return null;
        }
        StringBuilder builder = new StringBuilder();
        try (BufferedReader reader = Files.newBufferedReader(targetPath, StandardCharsets.UTF_8)) {
            String line;
            while ((line = reader.readLine()) != null) {
                builder.append(line).append(System.lineSeparator());
            }
        }
        return builder.toString();
    }
}
