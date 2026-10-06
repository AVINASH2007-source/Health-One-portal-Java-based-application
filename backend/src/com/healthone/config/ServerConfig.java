package com.healthone.config;

/**
 * Singleton Configuration Manager for Health-One server.
 * Demonstrates:
 * - Singleton Design Pattern (Thread-safe Double-Checked Locking or Initialization on Demand)
 */
public class ServerConfig {

    private static volatile ServerConfig instance;

    private final int port;
    private final String serverHost;
    private final String webStaticDir;
    private final String appName;
    private final String version;
    private final boolean debugMode;

    private ServerConfig() {
        this.port = getEnvInt("PORT", 8080);
        this.serverHost = getEnvString("HOST", "0.0.0.0");
        this.webStaticDir = getEnvString("STATIC_DIR", "dist");
        this.appName = "Health-One Emergency & Digital Health Portal";
        this.version = "2.0.0-JAVA";
        this.debugMode = Boolean.parseBoolean(getEnvString("DEBUG", "true"));
    }

    public static ServerConfig getInstance() {
        if (instance == null) {
            synchronized (ServerConfig.class) {
                if (instance == null) {
                    instance = new ServerConfig();
                }
            }
        }
        return instance;
    }

    public int getPort() { return port; }
    public String getServerHost() { return serverHost; }
    public String getWebStaticDir() { return webStaticDir; }
    public String getAppName() { return appName; }
    public String getVersion() { return version; }
    public boolean isDebugMode() { return debugMode; }

    private static String getEnvString(String key, String defaultVal) {
        String val = System.getenv(key);
        return (val != null && !val.isBlank()) ? val : defaultVal;
    }

    private static int getEnvInt(String key, int defaultVal) {
        String val = System.getenv(key);
        if (val != null && !val.isBlank()) {
            try {
                return Integer.parseInt(val.trim());
            } catch (NumberFormatException ignored) {}
        }
        return defaultVal;
    }
}
