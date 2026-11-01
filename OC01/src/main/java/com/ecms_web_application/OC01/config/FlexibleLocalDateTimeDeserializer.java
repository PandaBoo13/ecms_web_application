package com.ecms_web_application.OC01.config;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Custom Jackson deserializer for LocalDateTime that flexibly handles both
 * standard SQL/space format ("yyyy-MM-dd HH:mm:ss") and ISO-8601 format.
 */
public class FlexibleLocalDateTimeDeserializer extends JsonDeserializer<LocalDateTime> {

    private static final DateTimeFormatter[] FORMATTERS = new DateTimeFormatter[] {
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"),
            DateTimeFormatter.ISO_LOCAL_DATE_TIME,
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSSSSS"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss")
    };

    @Override
    public LocalDateTime deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
        String text = p.getText();
        if (text == null || text.isBlank()) {
            return null;
        }
        text = text.trim();
        for (DateTimeFormatter formatter : FORMATTERS) {
            try {
                return LocalDateTime.parse(text, formatter);
            } catch (Exception ignored) {
            }
        }
        return LocalDateTime.parse(text);
    }
}

