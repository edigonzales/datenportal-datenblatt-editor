package ch.so.agi.datasheet.service;

import java.util.Map;

public class ToolError extends RuntimeException {
    public final String code;
    public final Map<String, Object> details;
    public ToolError(String code, String message) { this(code, message, Map.of()); }
    public ToolError(String code, String message, Map<String, Object> details) {
        super(message); this.code = code; this.details = details;
    }
}
