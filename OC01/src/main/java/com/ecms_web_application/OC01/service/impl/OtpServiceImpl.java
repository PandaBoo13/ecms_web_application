package com.ecms_web_application.OC01.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import com.ecms_web_application.OC01.entity.enums.OtpPurpose;
import com.ecms_web_application.OC01.service.EmailService;
import com.ecms_web_application.OC01.service.OtpService;

import java.security.SecureRandom;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Slf4j
@Service
@EnableScheduling
@RequiredArgsConstructor
public class OtpServiceImpl implements OtpService {

    private static final int OTP_LENGTH = 6;
    private static final int OTP_EXPIRY_MINUTES = 5;
    private static final int VERIFIED_EXPIRY_MINUTES = 5;
    private static final int MAX_ATTEMPTS = 5;
    private static final int LOCKOUT_MINUTES = 15;
    private static final int RESEND_COOLDOWN_SECONDS = 60;

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final EmailService emailService;

    private final Map<String, OtpData> otpStore = new ConcurrentHashMap<>();
    private final Map<String, VerifiedData> verifiedEmails = new ConcurrentHashMap<>();
    private final Map<String, AttemptData> attemptStore = new ConcurrentHashMap<>();

    @Override
    public void generateAndSend(String email, OtpPurpose purpose) {
        String otp = generateOtp();
        saveOtp(email, otp);

        if (purpose == OtpPurpose.FORGOT_PASSWORD) {
            emailService.sendOtpEmail(email, otp);
        } else {
            log.warn("[OTP] Chưa hỗ trợ purpose: {}", purpose);
            throw new UnsupportedOperationException("Chưa hỗ trợ purpose: " + purpose);
        }
    }

    @Override
    public void saveOtp(String email, String otp) {
        if (email == null || otp == null) {
            throw new IllegalArgumentException("Email và OTP không được null");
        }

        OtpData existing = otpStore.get(email);
        if (existing != null) {
            long elapsedSeconds = (System.currentTimeMillis() - existing.createdTime()) / 1000;
            if (elapsedSeconds < RESEND_COOLDOWN_SECONDS) {
                log.warn("[OTP] Rate limit — email {} vừa yêu cầu OTP {}s trước",
                        maskEmail(email), elapsedSeconds);
                throw new IllegalStateException(
                        "Vui lòng đợi " + (RESEND_COOLDOWN_SECONDS - elapsedSeconds)
                                + " giây trước khi yêu cầu OTP mới");
            }
        }

        otpStore.put(email, new OtpData(otp, System.currentTimeMillis()));
        attemptStore.put(email, new AttemptData());

        log.info("[OTP] Đã lưu OTP cho {}", maskEmail(email));
    }

    @Override
    public String getOtp(String email) {
        OtpData data = otpStore.get(email);
        if (data == null) return null;
        if (data.isExpired()) {
            otpStore.remove(email);
            return null;
        }
        return data.otp();
    }

    @Override
    public void deleteOtp(String email) {
        otpStore.remove(email);
    }

    @Override
    public boolean verify(String email, String otp, OtpPurpose purpose) {
        return isOtpValid(email, otp);
    }

    public boolean isOtpValid(String email, String otp) {
        if (email == null || otp == null) return false;

        AttemptData attempts = attemptStore.get(email);
        if (attempts != null && attempts.isLocked()) {
            log.warn("[OTP] Email {} đang bị lockout do sai quá nhiều lần", maskEmail(email));
            return false;
        }

        String storedOtp = getOtp(email);
        if (storedOtp == null) {
            log.info("[OTP] Không có OTP hoặc đã hết hạn cho {}", maskEmail(email));
            return false;
        }

        boolean matches = constantTimeEquals(storedOtp, otp);

        if (!matches) {
            int current = attemptStore
                    .computeIfAbsent(email, k -> new AttemptData())
                    .incrementAndCheck();

            log.warn("[OTP] Verify thất bại cho {} — lần thử {}/{}",
                    maskEmail(email), current, MAX_ATTEMPTS);

            if (current >= MAX_ATTEMPTS) {
                log.error("[OTP] Email {} bị lock {} phút sau {} lần sai",
                        maskEmail(email), LOCKOUT_MINUTES, current);
            }
            return false;
        }

        deleteOtp(email);
        attemptStore.remove(email);
        log.info("[OTP] Verify thành công cho {}", maskEmail(email));
        return true;
    }

    @Override
    public void markEmailAsVerified(String email) {
        verifiedEmails.put(email, new VerifiedData(System.currentTimeMillis()));
        log.info("[OTP] Đánh dấu verified cho {}", maskEmail(email));
    }

    @Override
    public boolean isEmailVerified(String email) {
        VerifiedData data = verifiedEmails.get(email);
        if (data == null) return false;
        if (data.isExpired()) {
            verifiedEmails.remove(email);
            return false;
        }
        return true;
    }

    @Override
    public void clearEmailVerified(String email) {
        verifiedEmails.remove(email);
        log.info("[OTP] Xóa verified cho {}", maskEmail(email));
    }

    @Scheduled(fixedRate = 300_000)
    public void cleanExpiredData() {
        long now = System.currentTimeMillis();

        otpStore.entrySet().removeIf(e ->
                (now - e.getValue().createdTime()) > OTP_EXPIRY_MINUTES * 60_000L);

        verifiedEmails.entrySet().removeIf(e ->
                (now - e.getValue().createdTime()) > VERIFIED_EXPIRY_MINUTES * 60_000L);

        attemptStore.entrySet().removeIf(e -> e.getValue().isLockoutExpired());

        log.debug("[OTP] Cleanup xong. otp={}, verified={}, attempts={}",
                otpStore.size(), verifiedEmails.size(), attemptStore.size());
    }

    private String generateOtp() {
        StringBuilder sb = new StringBuilder(OTP_LENGTH);
        for (int i = 0; i < OTP_LENGTH; i++) {
            sb.append(SECURE_RANDOM.nextInt(10));
        }
        return sb.toString();
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) return "***";
        String[] parts = email.split("@");
        String local = parts[0];
        String domain = parts[1];
        String masked = local.length() <= 2
                ? local.charAt(0) + "***"
                : local.substring(0, 2) + "***";
        return masked + "@" + domain;
    }

    private boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null) return false;
        if (a.length() != b.length()) return false;
        int diff = 0;
        for (int i = 0; i < a.length(); i++) {
            diff |= a.charAt(i) ^ b.charAt(i);
        }
        return diff == 0;
    }

    private static class OtpData {
        private final String otp;
        private final long createdTime;
        OtpData(String otp, long createdTime) {
            this.otp = otp;
            this.createdTime = createdTime;
        }
        String otp() { return otp; }
        long createdTime() { return createdTime; }
        boolean isExpired() {
            return (System.currentTimeMillis() - createdTime) > OTP_EXPIRY_MINUTES * 60_000L;
        }
    }

    private static class VerifiedData {
        private final long createdTime;
        VerifiedData(long createdTime) { this.createdTime = createdTime; }
        long createdTime() { return createdTime; }
        boolean isExpired() {
            return (System.currentTimeMillis() - createdTime) > VERIFIED_EXPIRY_MINUTES * 60_000L;
        }
    }

    private static class AttemptData {
        private final AtomicInteger count = new AtomicInteger(0);
        private volatile long lockedUntil = 0;

        int incrementAndCheck() {
            int current = count.incrementAndGet();
            if (current >= MAX_ATTEMPTS) {
                lockedUntil = System.currentTimeMillis() + LOCKOUT_MINUTES * 60_000L;
            }
            return current;
        }

        boolean isLocked() {
            return System.currentTimeMillis() < lockedUntil;
        }

        boolean isLockoutExpired() {
            return lockedUntil > 0 && System.currentTimeMillis() >= lockedUntil;
        }
    }
}