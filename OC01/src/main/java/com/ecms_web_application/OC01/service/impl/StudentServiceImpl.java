package com.ecms_web_application.OC01.service.impl;

import com.ecms_web_application.OC01.config.SecurityUtils;
import com.ecms_web_application.OC01.dto.request.GuardianRequest;
import com.ecms_web_application.OC01.dto.request.StudentConvertFromLeadRequest;
import com.ecms_web_application.OC01.dto.request.StudentCreateRequest;
import com.ecms_web_application.OC01.dto.request.StudentStatusChangeRequest;
import com.ecms_web_application.OC01.dto.request.StudentUpdateRequest;
import com.ecms_web_application.OC01.dto.response.AcademicHistoryResponse;
import com.ecms_web_application.OC01.dto.response.GuardianResponse;
import com.ecms_web_application.OC01.dto.response.StudentDetailResponse;
import com.ecms_web_application.OC01.dto.response.StudentResponse;
import com.ecms_web_application.OC01.entity.AcademicHistory;
import com.ecms_web_application.OC01.entity.Guardian;
import com.ecms_web_application.OC01.entity.Lead;
import com.ecms_web_application.OC01.entity.Student;
import com.ecms_web_application.OC01.entity.StudentStatusLog;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.repository.AcademicHistoryRepository;
import com.ecms_web_application.OC01.repository.GuardianRepository;
import com.ecms_web_application.OC01.repository.LeadRepository;
import com.ecms_web_application.OC01.repository.StudentRepository;
import com.ecms_web_application.OC01.repository.StudentStatusLogRepository;
import com.ecms_web_application.OC01.service.StudentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
@Slf4j
public class StudentServiceImpl implements StudentService {

    private final StudentRepository studentRepository;
    private final LeadRepository leadRepository;
    private final GuardianRepository guardianRepository;
    private final AcademicHistoryRepository academicHistoryRepository;
    private final StudentStatusLogRepository statusLogRepository;

    @Override
    @Transactional(readOnly = true)
    public Page<StudentResponse> search(String search, String status, Pageable pageable) {
        return studentRepository
                .searchStudents(emptyToNull(status), emptyToNull(search), pageable)
                .map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public StudentResponse getById(Long id) {
        Student student = findStudentById(id);
        return toResponse(student);
    }

    @Override
    @Transactional(readOnly = true)
    public StudentDetailResponse getDetailById(Long id) {
        Student student = findStudentById(id);
        StudentDetailResponse detail = new StudentDetailResponse();
        copyPropertiesToResponse(student, detail);

        List<GuardianResponse> guardians = guardianRepository.findByStudentId(id)
                .stream().map(this::toGuardianResponse).toList();
        List<AcademicHistoryResponse> academicHistories = academicHistoryRepository.findByStudentIdOrderByCreatedAtDesc(id)
                .stream().map(this::toAcademicHistoryResponse).toList();
        List<StudentStatusLog> statusLogs = statusLogRepository.findByStudentIdOrderByChangedAtDesc(id);

        detail.setGuardians(guardians);
        detail.setAcademicHistories(academicHistories);
        detail.setStatusLogs(statusLogs);
        return detail;
    }

    @Override
    @Transactional(readOnly = true)
    public StudentResponse getByStudentCode(String studentCode) {
        Student student = studentRepository.findByStudentCode(studentCode)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Không tìm thấy học viên với mã: " + studentCode));
        return toResponse(student);
    }

    @Override
    @Transactional
    public StudentResponse create(StudentCreateRequest request) {
        // 1. Mã học viên: nếu để trống thì sinh mã tự động STD + yyyyMM + 4 số ngẫu nhiên
        String code = emptyToNull(request.getStudentCode());
        if (code == null) {
            code = generateUniqueStudentCode();
        } else {
            code = code.trim().toUpperCase();
            if (studentRepository.existsByStudentCode(code)) {
                throw new ErrorHandler(HttpStatus.CONFLICT, "Mã học viên đã tồn tại: " + code);
            }
        }

        // 2. Kiểm tra leadId duy nhất (uk_students_lead)
        if (request.getLeadId() != null && studentRepository.existsByLeadId(request.getLeadId())) {
            throw new ErrorHandler(HttpStatus.CONFLICT, "Lead này đã được liên kết với một học viên khác");
        }

        Student student = new Student();
        student.setStudentCode(code);
        student.setFullName(request.getFullName().trim());
        student.setEmail(request.getEmail() != null ? request.getEmail().trim().toLowerCase() : null);
        student.setPhone(emptyToNull(request.getPhone()));
        student.setDob(request.getDateOfBirth());
        student.setAddress(emptyToNull(request.getAddress()));
        student.setLeadId(request.getLeadId());
        student.setUserId(request.getUserId());

        String status = (request.getStatus() != null && !request.getStatus().isBlank())
                ? request.getStatus().trim().toUpperCase()
                : "ACTIVE";
        student.setStatus(status);

        Student saved = studentRepository.save(student);
        Long currentUserId = SecurityUtils.getCurrentAccountId();

        // Ghi nhật ký trạng thái
        recordStatusLog(saved.getId(), null, saved.getStatus(), "Khởi tạo học viên mới", currentUserId);

        log.info("Tạo mới học viên id={}, code={}, fullName={}", saved.getId(), saved.getStudentCode(), saved.getFullName());
        return toResponse(saved);
    }

    /**
     * Chuyển đổi Lead thành Student sau khi đóng cọc thành công (Hỗ trợ Idempotent)
     */
    @Override
    @Transactional
    public StudentResponse convertFromLead(StudentConvertFromLeadRequest request) {
        Long leadId = request.getLeadId();

        // 1. Kiểm tra tính Idempotent: Nếu leadId đã được chuyển đổi sang Student thì trả về Student hiện tại
        Optional<Student> existingByLead = studentRepository.findByLeadId(leadId);
        if (existingByLead.isPresent()) {
            log.info("Idempotent check: Lead id={} đã được chuyển đổi thành Student id={}", leadId, existingByLead.get().getId());
            return toResponse(existingByLead.get());
        }

        // 2. Tìm Lead
        Lead lead = leadRepository.findById(leadId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Không tìm thấy Lead với ID: " + leadId));

        if (lead.getStudentId() != null) {
            Optional<Student> existingStudent = studentRepository.findById(lead.getStudentId());
            if (existingStudent.isPresent()) {
                log.info("Idempotent check: Lead id={} đã gắn với studentId={}", leadId, lead.getStudentId());
                return toResponse(existingStudent.get());
            }
        }

        Long currentUserId = SecurityUtils.getCurrentAccountId();
        LocalDateTime now = LocalDateTime.now();
        Long effectiveCourseId = request.getCourseId() != null ? request.getCourseId() : lead.getCourseId();

        // 3. Tạo mới Student (học viên mới)
        String studentCode = generateUniqueStudentCode();
        Student student = new Student();
        student.setStudentCode(studentCode);
        student.setLeadId(lead.getId());
        student.setFullName(lead.getFullName());
        student.setEmail(lead.getEmail());
        student.setPhone(lead.getPhone());
        student.setStatus("ACTIVE");

        Student savedStudent = studentRepository.save(student);

        // 4. Cập nhật Lead (gán student_id và converted_at)
        lead.setStudentId(savedStudent.getId());
        lead.setConvertedAt(now);
        leadRepository.save(lead);

        // 5. Thêm bản ghi AcademicHistories ban đầu nếu có khóa học
        if (effectiveCourseId != null) {
            AcademicHistory history = new AcademicHistory();
            history.setStudentId(savedStudent.getId());
            history.setLeadId(lead.getId());
            history.setCourseId(effectiveCourseId);
            history.setClassId(request.getClassId());
            academicHistoryRepository.save(history);
        }

        // 6. Ghi log StudentStatusLogs
        recordStatusLog(savedStudent.getId(), null, "ACTIVE", "Chuyển đổi thành công từ Lead #" + lead.getId(), currentUserId);

        log.info("Chuyển đổi thành công Lead id={} sang Student id={}, studentCode={}", lead.getId(), savedStudent.getId(), savedStudent.getStudentCode());
        return toResponse(savedStudent);
    }

    @Override
    @Transactional
    public StudentResponse update(Long id, StudentUpdateRequest request) {
        Student student = findStudentById(id);

        // Bất biến: Tuyệt đối KHÔNG cho phép sửa mã học viên sau khi cấp
        if (request.getStudentCode() != null && !request.getStudentCode().isBlank()) {
            String requestedCode = request.getStudentCode().trim().toUpperCase();
            if (!requestedCode.equals(student.getStudentCode())) {
                throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Quy tắc nghiệp vụ: Mã học viên (studentCode) là bất biến, không được phép chỉnh sửa sau khi đã cấp");
            }
        }

        if (request.getFullName() != null && !request.getFullName().isBlank()) {
            student.setFullName(request.getFullName().trim());
        }
        if (request.getEmail() != null) {
            student.setEmail(emptyToNull(request.getEmail().toLowerCase()));
        }
        if (request.getPhone() != null) {
            student.setPhone(emptyToNull(request.getPhone()));
        }
        if (request.getDateOfBirth() != null) {
            student.setDob(request.getDateOfBirth());
        }
        if (request.getAddress() != null) {
            student.setAddress(emptyToNull(request.getAddress()));
        }
        if (request.getUserId() != null) {
            student.setUserId(request.getUserId());
        }

        // Cập nhật trạng thái nếu có
        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            String newStatus = request.getStatus().trim().toUpperCase();
            if (!newStatus.equalsIgnoreCase(student.getStatus())) {
                recordStatusLog(student.getId(), student.getStatus(), newStatus, "Cập nhật trạng thái qua API", SecurityUtils.getCurrentAccountId());
                student.setStatus(newStatus);
            }
        }

        Student saved = studentRepository.save(student);
        log.info("Cập nhật học viên id={}, code={}", saved.getId(), saved.getStudentCode());
        return toResponse(saved);
    }

    @Override
    @Transactional
    public StudentResponse updateStatus(Long id, StudentStatusChangeRequest request) {
        Student student = findStudentById(id);
        String oldStatus = student.getStatus();
        String newStatus = request.getStatus().trim().toUpperCase();

        if (!newStatus.equalsIgnoreCase(oldStatus)) {
            student.setStatus(newStatus);
            studentRepository.save(student);
            recordStatusLog(student.getId(), oldStatus, newStatus, request.getReason(), SecurityUtils.getCurrentAccountId());
            log.info("Đổi trạng thái học viên id={} từ {} sang {}", id, oldStatus, newStatus);
        }

        return toResponse(student);
    }

    @Override
    @Transactional
    public GuardianResponse addGuardian(Long studentId, GuardianRequest request) {
        findStudentById(studentId);

        Guardian guardian = new Guardian();
        guardian.setStudentId(studentId);
        guardian.setFullName(request.getFullName().trim());
        guardian.setRelationship(request.getRelationship().trim());
        guardian.setPhone(request.getPhone().trim());
        guardian.setEmail(emptyToNull(request.getEmail()));

        Guardian saved = guardianRepository.save(guardian);
        log.info("Thêm người giám hộ id={} cho học viên studentId={}", saved.getId(), studentId);
        return toGuardianResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<GuardianResponse> getGuardians(Long studentId) {
        findStudentById(studentId);
        return guardianRepository.findByStudentId(studentId)
                .stream().map(this::toGuardianResponse).toList();
    }

    @Override
    @Transactional
    public void deleteGuardian(Long studentId, Long guardianId) {
        findStudentById(studentId);
        Guardian guardian = guardianRepository.findById(guardianId)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Không tìm thấy người giám hộ với ID: " + guardianId));

        if (!guardian.getStudentId().equals(studentId)) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Người giám hộ không thuộc về học viên này");
        }

        guardianRepository.delete(guardian);
        log.info("Đã xóa người giám hộ id={} của học viên studentId={}", guardianId, studentId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AcademicHistoryResponse> getAcademicHistories(Long studentId) {
        findStudentById(studentId);
        return academicHistoryRepository.findByStudentIdOrderByCreatedAtDesc(studentId)
                .stream().map(this::toAcademicHistoryResponse).toList();
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Student student = findStudentById(id);
        // Soft delete: chuyển trạng thái sang INACTIVE
        if (!"INACTIVE".equalsIgnoreCase(student.getStatus())) {
            recordStatusLog(student.getId(), student.getStatus(), "INACTIVE", "Xóa mềm / ngừng kích hoạt học viên", SecurityUtils.getCurrentAccountId());
            student.setStatus("INACTIVE");
            studentRepository.save(student);
            log.info("Đã xóa mềm học viên id={} (status=INACTIVE)", id);
        }
    }

    // ===== Private Helper Methods =====

    private Student findStudentById(Long id) {
        return studentRepository.findById(id)
                .orElseThrow(() -> new ErrorHandler(HttpStatus.NOT_FOUND, "Không tìm thấy học viên với ID: " + id));
    }

    private void recordStatusLog(Long studentId, String oldStatus, String newStatus, String reason, Long changedBy) {
        StudentStatusLog logEntity = new StudentStatusLog();
        logEntity.setStudentId(studentId);
        logEntity.setOldStatus(oldStatus);
        logEntity.setNewStatus(newStatus);
        logEntity.setReason(reason);
        logEntity.setChangedBy(changedBy);
        statusLogRepository.save(logEntity);
    }

    /**
     * Sinh mã học viên theo định dạng STD + yyyyMM + 4 số ngẫu nhiên (VD: STD2026101234).
     * Thử tối đa 10 lần theo đúng yêu cầu REQ-STD-02.
     */
    private String generateUniqueStudentCode() {
        String prefix = "STD" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMM"));
        int attempts = 0;
        String code;
        do {
            int randomNum = ThreadLocalRandom.current().nextInt(1000, 9999);
            code = prefix + randomNum;
            attempts++;
            if (attempts > 10) {
                log.error("CẢNH BÁO QUẢN TRỊ: Đã thử sinh mã học viên 10 lần nhưng bị trùng: prefix={}", prefix);
                throw new ErrorHandler(HttpStatus.INTERNAL_SERVER_ERROR, "Không thể sinh mã học viên duy nhất sau 10 lần thử. Vui lòng liên hệ quản trị hệ thống");
            }
        } while (studentRepository.existsByStudentCode(code));
        return code;
    }

    private void copyPropertiesToResponse(Student student, StudentResponse response) {
        response.setId(student.getId());
        response.setStudentCode(student.getStudentCode());
        response.setLeadId(student.getLeadId());
        response.setUserId(student.getUserId());
        response.setFullName(student.getFullName());
        response.setEmail(student.getEmail());
        response.setPhone(student.getPhone());
        response.setDateOfBirth(student.getDob());
        response.setAddress(student.getAddress());
        response.setStatus(student.getStatus());
        response.setCreatedAt(student.getCreatedAt());
        response.setUpdatedAt(student.getUpdatedAt());
    }

    private StudentResponse toResponse(Student student) {
        StudentResponse response = new StudentResponse();
        copyPropertiesToResponse(student, response);
        return response;
    }

    private GuardianResponse toGuardianResponse(Guardian guardian) {
        GuardianResponse response = new GuardianResponse();
        response.setId(guardian.getId());
        response.setStudentId(guardian.getStudentId());
        response.setFullName(guardian.getFullName());
        response.setRelationship(guardian.getRelationship());
        response.setPhone(guardian.getPhone());
        response.setEmail(guardian.getEmail());
        return response;
    }

    private AcademicHistoryResponse toAcademicHistoryResponse(AcademicHistory history) {
        AcademicHistoryResponse response = new AcademicHistoryResponse();
        response.setId(history.getId());
        response.setStudentId(history.getStudentId());
        response.setLeadId(history.getLeadId());
        response.setEnrollmentId(history.getEnrollmentId());
        response.setCourseId(history.getCourseId());
        response.setClassId(history.getClassId());
        response.setFinalGrade(history.getFinalGrade());
        response.setCreatedAt(history.getCreatedAt());
        return response;
    }

    private String emptyToNull(String str) {
        return (str == null || str.trim().isEmpty()) ? null : str.trim();
    }
}
