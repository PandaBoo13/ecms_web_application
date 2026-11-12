package com.ecms_web_application.OC01.service.impl.certificate;

import com.ecms_web_application.OC01.config.SecurityUtils;
import com.ecms_web_application.OC01.dto.response.certificate.CertificateEligibleResponse;
import com.ecms_web_application.OC01.dto.response.certificate.CertificateFile;
import com.ecms_web_application.OC01.dto.response.certificate.CertificateResponse;
import com.ecms_web_application.OC01.dto.response.certificate.PublicCertificateResponse;
import com.ecms_web_application.OC01.entity.Certificate;
import com.ecms_web_application.OC01.entity.Enrollment;
import com.ecms_web_application.OC01.entity.Student;
import com.ecms_web_application.OC01.entity.course.Course;
import com.ecms_web_application.OC01.entity.enums.CertificateStatus;
import com.ecms_web_application.OC01.entity.enums.CourseType;
import com.ecms_web_application.OC01.entity.enums.EnrollmentStatus;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.generic.FileStorageService;
import com.ecms_web_application.OC01.repository.CertificateRepository;
import com.ecms_web_application.OC01.repository.CourseRepository;
import com.ecms_web_application.OC01.repository.EnrollmentRepository;
import com.ecms_web_application.OC01.repository.StudentRepository;
import com.ecms_web_application.OC01.service.CertificateService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CertificateServiceImpl implements CertificateService {

    private static final long MAX_PDF_BYTES = 10L * 1024 * 1024;

    private final CertificateRepository certificateRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final StudentRepository studentRepository;
    private final CourseRepository courseRepository;
    private final FileStorageService fileStorageService;

    @Override
    @Transactional(readOnly = true)
    public Page<CertificateEligibleResponse> searchEligible(String search, Long courseId, Pageable pageable) {
        requireAdmin();
        Page<Enrollment> page = enrollmentRepository.searchCertificateEligible(
                normalizeSearch(search), courseId, EnrollmentStatus.COMPLETED, CourseType.OFFLINE, pageable);
        return page.map(enrollment -> toEligibleResponse(enrollment, studentById(enrollment), courseById(enrollment)));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CertificateResponse> search(String search, CertificateStatus status, Long courseId, Pageable pageable) {
        requireAdmin();
        return certificateRepository
                .search(normalizeSearch(search), status, courseId, pageable)
                .map(CertificateResponse::from);
    }

    @Override
    @Transactional
    public CertificateResponse issue(Long enrollmentId, MultipartFile file) {
        requireAdmin();
        Long actorId = SecurityUtils.requireCurrentAccountId();
        validatePdf(file);

        Enrollment enrollment = enrollmentRepository.findById(enrollmentId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Ghi danh không tồn tại"));
        if (enrollment.getStatus() != EnrollmentStatus.COMPLETED) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Chỉ cấp chứng chỉ cho ghi danh đã hoàn thành");
        }
        if (enrollment.getStudentId() == null) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Ghi danh chưa gắn hồ sơ học viên");
        }
        if (certificateRepository.existsByEnrollmentId(enrollmentId)) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Ghi danh này đã được cấp chứng chỉ");
        }

        Course course = courseRepository.findById(enrollment.getCourseId())
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Khóa học không tồn tại"));
        if (course.getCourseType() != CourseType.OFFLINE) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Chứng chỉ chỉ áp dụng cho khóa học offline");
        }

        Student student = studentRepository.findById(enrollment.getStudentId())
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Học viên không tồn tại"));

        String storedPath;
        try {
            storedPath = fileStorageService.storePrivateFile(
                    file, fileStorageService.getStudentCertificatePath(student.getId()));
        } catch (IOException ex) {
            throw new ErrorHandler(HttpStatus.INTERNAL_SERVER_ERROR, "Không lưu được tệp chứng chỉ");
        }

        Certificate certificate = new Certificate();
        certificate.setCertificateCode(generateCertificateCode());
        certificate.setEnrollmentId(enrollment.getId());
        certificate.setStudentId(student.getId());
        certificate.setCourseId(course.getId());
        certificate.setStudentCode(student.getStudentCode());
        certificate.setStudentName(student.getFullName());
        certificate.setCourseTitle(course.getTitle());
        certificate.setFinalScore(enrollment.getFinalScore());
        certificate.setCompletedAt(enrollment.getCompletedAt());
        certificate.setStatus(CertificateStatus.ISSUED);
        certificate.setFilePath(storedPath);
        certificate.setOriginalFileName(truncate(file.getOriginalFilename(), 255));
        certificate.setIssuedAt(LocalDateTime.now());
        certificate.setIssuedBy(actorId);

        try {
            return CertificateResponse.from(certificateRepository.save(certificate));
        } catch (RuntimeException ex) {
            fileStorageService.deletePrivateFile(storedPath);
            throw ex;
        }
    }

    @Override
    @Transactional
    public CertificateResponse revoke(Long certificateId, String reason) {
        requireAdmin();
        if (!StringUtils.hasText(reason)) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Vui lòng nhập lý do thu hồi");
        }
        Certificate certificate = certificateRepository.findById(certificateId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Chứng chỉ không tồn tại"));
        if (certificate.getStatus() == CertificateStatus.REVOKED) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Chứng chỉ đã bị thu hồi");
        }
        certificate.setStatus(CertificateStatus.REVOKED);
        certificate.setRevokedAt(LocalDateTime.now());
        certificate.setRevokedBy(SecurityUtils.requireCurrentAccountId());
        certificate.setRevokeReason(reason.trim());
        return CertificateResponse.from(certificateRepository.save(certificate));
    }

    @Override
    @Transactional(readOnly = true)
    public CertificateFile getFileForAdmin(Long certificateId) {
        requireAdmin();
        return getFile(certificateRepository.findById(certificateId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Chứng chỉ không tồn tại")));
    }

    @Override
    @Transactional(readOnly = true)
    public List<CertificateResponse> listMine() {
        Student student = currentStudent();
        return certificateRepository.findByStudentIdOrderByIssuedAtDesc(student.getId())
                .stream().map(CertificateResponse::from).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public CertificateFile getFileForStudent(Long certificateId) {
        Student student = currentStudent();
        Certificate certificate = certificateRepository.findById(certificateId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Chứng chỉ không tồn tại"));
        if (!Objects.equals(certificate.getStudentId(), student.getId())) {
            throw new ErrorHandler(HttpStatus.FORBIDDEN, "Bạn không có quyền tải chứng chỉ này");
        }
        if (certificate.getStatus() == CertificateStatus.REVOKED) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Chứng chỉ đã bị thu hồi");
        }
        return getFile(certificate);
    }

    @Override
    @Transactional(readOnly = true)
    public PublicCertificateResponse verify(String certificateCode) {
        if (!StringUtils.hasText(certificateCode)) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Vui lòng nhập mã chứng chỉ");
        }
        Certificate certificate = certificateRepository
                .findByCertificateCode(certificateCode.trim().toUpperCase(Locale.ROOT))
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Không tìm thấy chứng chỉ với mã này"));
        return new PublicCertificateResponse(
                certificate.getCertificateCode(),
                certificate.getStudentName(),
                certificate.getCourseTitle(),
                certificate.getIssuedAt(),
                certificate.getStatus(),
                certificate.getRevokedAt()
        );
    }

    // ============================================================
    // HELPERS
    // ============================================================

    private void requireAdmin() {
        if (!SecurityUtils.hasRole("ADMIN")) {
            throw new ErrorHandler(HttpStatus.FORBIDDEN, "Chỉ quản trị viên được quản lý chứng chỉ");
        }
    }

    private Student currentStudent() {
        Long accountId = SecurityUtils.requireCurrentAccountId();
        return studentRepository.findByUserId(accountId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Tài khoản chưa liên kết hồ sơ học viên"));
    }

    private Student studentById(Enrollment enrollment) {
        if (enrollment.getStudentId() == null) return null;
        return studentRepository.findById(enrollment.getStudentId()).orElse(null);
    }

    private Course courseById(Enrollment enrollment) {
        return courseRepository.findById(enrollment.getCourseId()).orElse(null);
    }

    private CertificateEligibleResponse toEligibleResponse(Enrollment enrollment, Student student, Course course) {
        return new CertificateEligibleResponse(
                enrollment.getId(),
                enrollment.getStudentId(),
                student != null ? student.getStudentCode() : null,
                student != null ? student.getFullName() : null,
                student != null ? student.getEmail() : null,
                student != null ? student.getPhone() : null,
                enrollment.getCourseId(),
                course != null ? course.getTitle() : null,
                enrollment.getFinalScore(),
                enrollment.getCompletedAt()
        );
    }

    private CertificateFile getFile(Certificate certificate) {
        Path path;
        try {
            path = fileStorageService.getPrivateFilePath(certificate.getFilePath());
        } catch (ErrorHandler ex) {
            throw new ErrorHandler(HttpStatus.NOT_FOUND, "Không tìm thấy tệp chứng chỉ");
        }
        if (!Files.exists(path) || !Files.isReadable(path)) {
            throw new ErrorHandler(HttpStatus.NOT_FOUND, "Không tìm thấy tệp chứng chỉ");
        }
        return new CertificateFile(path, certificate.getCertificateCode() + ".pdf");
    }

    private void validatePdf(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Vui lòng chọn tệp PDF chứng chỉ");
        }
        if (file.getSize() > MAX_PDF_BYTES) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Tệp chứng chỉ không được vượt quá 10MB");
        }
        String fileName = file.getOriginalFilename();
        if (fileName == null || !fileName.toLowerCase(Locale.ROOT).endsWith(".pdf")) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Chứng chỉ phải là tệp PDF");
        }
        try (InputStream input = file.getInputStream()) {
            byte[] header = input.readNBytes(5);
            String signature = new String(header, StandardCharsets.US_ASCII);
            if (!"%PDF-".equals(signature)) {
                throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Tệp tải lên không phải PDF hợp lệ");
            }
        } catch (IOException ex) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Không đọc được tệp chứng chỉ");
        }
    }

    private String generateCertificateCode() {
        for (int attempt = 0; attempt < 5; attempt++) {
            String code = "ECMS-" + UUID.randomUUID().toString()
                    .replace("-", "").substring(0, 12).toUpperCase(Locale.ROOT);
            if (!certificateRepository.existsByCertificateCode(code)) {
                return code;
            }
        }
        throw new ErrorHandler(HttpStatus.INTERNAL_SERVER_ERROR, "Không tạo được mã chứng chỉ");
    }

    private String normalizeSearch(String search) {
        return StringUtils.hasText(search) ? search.trim() : null;
    }

    private String truncate(String value, int maxLength) {
        if (value == null) return null;
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }
}
