package com.ecms_web_application.OC01.service;

import com.ecms_web_application.OC01.dto.request.SpecializationAddRequest;
import com.ecms_web_application.OC01.dto.response.InstructorSpecializationResponse;

import java.util.List;

public interface InstructorSpecializationService {

    // ============ QUERY ============
    List<InstructorSpecializationResponse> getByAccount(Long accountId);

    List<InstructorSpecializationResponse> getByCategory(Long categoryId);

    List<InstructorSpecializationResponse> getPrimaryOfAccount(Long accountId);

    // ============ MUTATION ============
    InstructorSpecializationResponse add(Long accountId, SpecializationAddRequest request);

    void remove(Long accountId, Long categoryId);

    void setPrimary(Long accountId, Long categoryId);

    void clearPrimary(Long accountId);

    void removeAll(Long accountId);
}