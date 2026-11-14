package com.ecms_web_application.OC01.service.impl;

import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Nơi lưu tạm mật khẩu được sinh cho tài khoản học viên mới trong lúc thanh toán.
 * Mật khẩu chỉ tồn tại trong bộ nhớ, được lấy ra một lần để gửi kèm email hóa đơn
 * (listener AFTER_COMMIT) rồi xóa ngay — không bao giờ ghi plaintext xuống DB.
 */
@Component
public class TemporaryCredentialStore {

    private static final Duration TTL = Duration.ofMinutes(30);
    private static final String UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final String LOWER = "abcdefghijkmnopqrstuvwxyz";
    private static final String DIGITS = "23456789";
    private static final String SYMBOLS = "!@#$%&*";
    private static final String ALL = UPPER + LOWER + DIGITS + SYMBOLS;
    private static final int PASSWORD_LENGTH = 12;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final Map<String, Entry> store = new ConcurrentHashMap<>();

    /** Sinh mật khẩu tạm mới cho email và giữ lại để gửi kèm email sau khi giao dịch commit. */
    public String issue(String email) {
        String key = normalize(email);
        if (key == null) {
            return null;
        }
        String password = generatePassword();
        store.put(key, new Entry(password, Instant.now().plus(TTL)));
        return password;
    }

    /** Lấy và xóa mật khẩu tạm; trả về null nếu không có hoặc đã hết hạn. */
    public String consume(String email) {
        String key = normalize(email);
        if (key == null) {
            return null;
        }
        Entry entry = store.remove(key);
        if (entry == null || entry.expiresAt().isBefore(Instant.now())) {
            return null;
        }
        return entry.password();
    }

    /** Read once for sending; credentials are removed only after the email succeeds. */
    public String peek(String email) {
        String key = normalize(email);
        if (key == null) return null;
        Entry entry = store.get(key);
        if (entry == null) return null;
        if (entry.expiresAt().isBefore(Instant.now())) {
            store.remove(key, entry);
            return null;
        }
        return entry.password();
    }

    private String generatePassword() {
        StringBuilder password = new StringBuilder(PASSWORD_LENGTH);
        password.append(pick(UPPER));
        password.append(pick(LOWER));
        password.append(pick(DIGITS));
        password.append(pick(SYMBOLS));
        while (password.length() < PASSWORD_LENGTH) {
            password.append(pick(ALL));
        }
        // Fisher-Yates để vị trí các nhóm ký tự không cố định.
        for (int i = password.length() - 1; i > 0; i--) {
            int j = RANDOM.nextInt(i + 1);
            char tmp = password.charAt(i);
            password.setCharAt(i, password.charAt(j));
            password.setCharAt(j, tmp);
        }
        return password.toString();
    }

    private char pick(String source) {
        return source.charAt(RANDOM.nextInt(source.length()));
    }

    private String normalize(String email) {
        if (email == null || email.isBlank()) {
            return null;
        }
        return email.trim().toLowerCase();
    }

    private record Entry(String password, Instant expiresAt) { }
}
