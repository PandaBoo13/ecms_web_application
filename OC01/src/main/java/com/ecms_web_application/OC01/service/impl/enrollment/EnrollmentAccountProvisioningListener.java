package com.ecms_web_application.OC01.service.impl.enrollment;

import com.ecms_web_application.OC01.entity.Account;
import com.ecms_web_application.OC01.entity.Enrollment;
import com.ecms_web_application.OC01.entity.Role;
import com.ecms_web_application.OC01.entity.Student;
import com.ecms_web_application.OC01.entity.UserProfile;
import com.ecms_web_application.OC01.entity.course.Course;
import com.ecms_web_application.OC01.event.EnrollmentCreatedEvent;
import com.ecms_web_application.OC01.repository.AccountRepository;
import com.ecms_web_application.OC01.repository.CourseRepository;
import com.ecms_web_application.OC01.repository.EnrollmentRepository;
import com.ecms_web_application.OC01.repository.RoleRepository;
import com.ecms_web_application.OC01.repository.StudentRepository;
import com.ecms_web_application.OC01.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Slf4j
@Component
@RequiredArgsConstructor
public class EnrollmentAccountProvisioningListener {

    private final EnrollmentRepository enrollmentRepository;
    private final StudentRepository studentRepository;
    private final CourseRepository courseRepository;
    private final AccountRepository accountRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    @Value("${app.frontend.login-url:http://localhost:5174/login}")
    private String loginUrl;

    /**
     * Sau khi Ghi danh thành công (Enrollment đã commit DB):
     * 1. Kiểm tra xem Học viên đã có tài khoản hay chưa.
     * 2. Nếu chưa có -> Tạo mới Account (role STUDENT) và gửi Email thông tin đăng nhập (Mật khẩu, User, Link).
     * 3. Nếu đã có -> Gửi Email thông báo đã ghi danh thành công khóa học mới.
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onEnrollmentCreated(EnrollmentCreatedEvent event) {
        try {
            Enrollment enrollment = enrollmentRepository.findById(event.enrollmentId()).orElse(null);
            if (enrollment == null) return;

            Course course = courseRepository.findById(enrollment.getCourseId()).orElse(null);
            String courseTitle = course != null ? course.getTitle() : "Khóa học #" + enrollment.getCourseId();

            Student student = null;
            if (enrollment.getStudentId() != null) {
                student = studentRepository.findById(enrollment.getStudentId()).orElse(null);
            }
            if (student == null) {
                log.warn("[EnrollmentListener] Không tìm thấy học viên cho enrollmentId={}", event.enrollmentId());
                return;
            }

            String studentEmail = student.getEmail() != null ? student.getEmail().trim().toLowerCase() : "";
            if (studentEmail.isBlank()) {
                log.warn("[EnrollmentListener] Học viên id={} không có email", student.getId());
                return;
            }

            // Kiểm tra tài khoản hiện có
            Long userId = student.getUserId();
            Account account = null;
            if (userId != null) {
                account = accountRepository.findById(userId).orElse(null);
            }
            if (account == null) {
                account = accountRepository.findByEmail(studentEmail).orElse(null);
                if (account != null) {
                    student.setUserId(account.getId());
                    studentRepository.save(student);
                }
            }

            if (account == null) {
                // HỌC VIÊN CHƯA CÓ TÀI KHOẢN -> CẤP TÀI KHOẢN MỚI
                Role studentRole = roleRepository.findByCode("STUDENT").orElse(null);
                String rawPassword = "Password123@"; // Mật khẩu khởi tạo chuẩn

                Account newAcc = new Account();
                newAcc.setEmail(studentEmail);
                newAcc.setPasswordHash(passwordEncoder.encode(rawPassword));
                newAcc.setRole(studentRole);
                newAcc.setIsActive(true);
                newAcc.setIsLocked(false);
                newAcc.setFailedLoginCount(0);

                UserProfile profile = new UserProfile();
                profile.setAccount(newAcc);
                profile.setFullName(student.getFullName());
                profile.setPhone(student.getPhone());
                newAcc.setUserProfile(profile);

                Account savedAcc = accountRepository.save(newAcc);
                student.setUserId(savedAcc.getId());
                studentRepository.save(student);

                // GỬI EMAIL CHỨA THÔNG TIN TÀI KHOẢN (Mã học viên, Email, Mật khẩu, Link)
                emailService.sendStudentAccountCredentialsEmail(
                        studentEmail,
                        student.getFullName(),
                        student.getStudentCode(),
                        rawPassword,
                        courseTitle,
                        loginUrl
                );
                log.info("[EnrollmentListener] Đã cấp tài khoản và gửi email cho học viên mới: email={}, studentCode={}",
                        studentEmail, student.getStudentCode());
            } else {
                // HỌC VIÊN ĐÃ CÓ TÀI KHOẢN -> GỬI EMAIL THÔNG BÁO GHI DANH KHÓA HỌC MỚI
                emailService.sendEnrollmentNotificationEmail(
                        studentEmail,
                        student.getFullName(),
                        student.getStudentCode(),
                        courseTitle,
                        loginUrl
                );
                log.info("[EnrollmentListener] Học viên đã có tài khoản, gửi email thông báo ghi danh mới: email={}", studentEmail);
            }
        } catch (Exception ex) {
            log.error("[EnrollmentListener] Lỗi khi xử lý tạo tài khoản hoặc gửi email sau ghi danh: {}", ex.getMessage(), ex);
        }
    }
}
