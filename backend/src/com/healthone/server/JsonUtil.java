package com.healthone.server;

import java.lang.reflect.Method;
import java.lang.reflect.RecordComponent;
import java.util.*;

/**
 * Lightweight zero-dependency JSON serialization & basic parsing utility.
 * Demonstrates:
 * - Java Reflection
 * - Modern Java Records inspection
 * - Recursive data serialization
 */
public class JsonUtil {

    public static String toJson(Object obj) {
        if (obj == null) return "null";

        if (obj instanceof String s) {
            return "\"" + escapeJson(s) + "\"";
        }
        if (obj instanceof Number || obj instanceof Boolean) {
            return obj.toString();
        }
        if (obj instanceof Enum<?> e) {
            return "\"" + e.name() + "\"";
        }
        if (obj instanceof Map<?, ?> map) {
            StringBuilder sb = new StringBuilder("{");
            boolean first = true;
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                if (!first) sb.append(",");
                sb.append("\"").append(escapeJson(String.valueOf(entry.getKey()))).append("\":");
                sb.append(toJson(entry.getValue()));
                first = false;
            }
            sb.append("}");
            return sb.toString();
        }
        if (obj instanceof Iterable<?> iterable) {
            StringBuilder sb = new StringBuilder("[");
            boolean first = true;
            for (Object item : iterable) {
                if (!first) sb.append(",");
                sb.append(toJson(item));
                first = false;
            }
            sb.append("]");
            return sb.toString();
        }
        if (obj.getClass().isArray()) {
            StringBuilder sb = new StringBuilder("[");
            Object[] arr = (Object[]) obj;
            for (int i = 0; i < arr.length; i++) {
                if (i > 0) sb.append(",");
                sb.append(toJson(arr[i]));
            }
            sb.append("]");
            return sb.toString();
        }
        if (obj.getClass().isRecord()) {
            StringBuilder sb = new StringBuilder("{");
            RecordComponent[] components = obj.getClass().getRecordComponents();
            boolean first = true;
            for (RecordComponent rc : components) {
                try {
                    if (!first) sb.append(",");
                    sb.append("\"").append(rc.getName()).append("\":");
                    Object val = rc.getAccessor().invoke(obj);
                    sb.append(toJson(val));
                    first = false;
                } catch (Exception ignored) {}
            }
            sb.append("}");
            return sb.toString();
        }

        // Generic Java Bean / POJO reflection
        StringBuilder sb = new StringBuilder("{");
        boolean first = true;
        for (Method method : obj.getClass().getMethods()) {
            String name = method.getName();
            if (method.getParameterCount() == 0 && !name.equals("getClass")) {
                String propName = null;
                if (name.startsWith("get") && name.length() > 3) {
                    propName = Character.toLowerCase(name.charAt(3)) + name.substring(4);
                } else if (name.startsWith("is") && name.length() > 2) {
                    propName = Character.toLowerCase(name.charAt(2)) + name.substring(3);
                }
                if (propName != null) {
                    try {
                        Object val = method.invoke(obj);
                        if (!first) sb.append(",");
                        sb.append("\"").append(propName).append("\":").append(toJson(val));
                        first = false;
                    } catch (Exception ignored) {}
                }
            }
        }
        sb.append("}");
        return sb.toString();
    }

    public static Map<String, String> parseSimpleJson(String json) {
        Map<String, String> map = new HashMap<>();
        if (json == null || json.isBlank()) return map;
        String trimmed = json.trim();
        if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
            trimmed = trimmed.substring(1, trimmed.length() - 1);
        }

        // Simple token parser for top-level string/number keys
        String[] pairs = trimmed.split(",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)");
        for (String pair : pairs) {
            String[] kv = pair.split(":", 2);
            if (kv.length == 2) {
                String key = kv[0].trim().replaceAll("^\"|\"$", "");
                String value = kv[1].trim().replaceAll("^\"|\"$", "");
                map.put(key, value);
            }
        }
        return map;
    }

    private static String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\b", "\\b")
                .replace("\f", "\\f")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }
}
