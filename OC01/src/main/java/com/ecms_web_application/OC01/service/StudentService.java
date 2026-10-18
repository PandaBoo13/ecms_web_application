package com.ecms_web_application.OC01.service;

import com.ecms_web_application.OC01.dto.request.GuardianRequest;
import com.ecms_web_application.OC01.dto.request.StudentAccountLockRequest;
import com.ecms_web_application.OC01.dto.request.StudentConvertFromLeadRequest;
import com.ecms_web_application.OC01.dto.request.StudentCreateRequest;
import com.ecms_web_application.OC01.dto.request.StudentStatusChangeRequest;
import com.ecms_web_application.OC01.dto.request.StudentUpdateRequest;
import com.ecms_web_application.OC01.dto.response.AcademicHistoryResponse;
import com.ecms_web_application.OC01.dto.response.GuardianResponse;
import com.ecms_web_application.OC01.dto.response.StudentDetailResponse;
import com.ecms_web_application.OC01.dto.response.StudentResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface StudentService {

    StudentResponse create(StudentCreateRequest request);

    StudentResponse convertFromLead(StudentConvertFromLeadRequest request);

    Page<StudentResponse> search(String search, String status, Pageable pageable);

    StudentResponse getById(Long id);

    StudentDetailResponse getDetailById(Long id);

    StudentResponse getByStudentCode(String studentCode);

    StudentResponse update(Long id, StudentUpdateRequest request);

    StudentResponse updateStatus(Long id, StudentStatusChangeRequest request);

    StudentResponse lockAccount(Long id, StudentAccountLockRequest request);

    GuardianResponse addGuardian(Long studentId, GuardianRequest request);

    List<GuardianResponse> getGuardians(Long studentId);

    void deleteGuardian(Long studentId, Long guardianId);

    List<AcademicHistoryResponse> getAcademicHistories(Long studentId);

    void delete(Long id);
}
