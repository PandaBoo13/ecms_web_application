package com.ecms_web_application.OC01.service;

import com.ecms_web_application.OC01.dto.request.LeadAssignRequest;
import com.ecms_web_application.OC01.dto.request.LeadCreateRequest;
import com.ecms_web_application.OC01.dto.request.LeadInteractionCreateRequest;
import com.ecms_web_application.OC01.dto.request.LeadPlacementTestCreateRequest;
import com.ecms_web_application.OC01.dto.request.LeadUpdateRequest;
import com.ecms_web_application.OC01.dto.response.LeadDetailResponse;
import com.ecms_web_application.OC01.dto.response.LeadInteractionResponse;
import com.ecms_web_application.OC01.dto.response.LeadPlacementTestResponse;
import com.ecms_web_application.OC01.dto.response.LeadResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface LeadService {

    LeadResponse create(LeadCreateRequest request);

    Page<LeadResponse> search(String search, String status, Long courseId, Long sourceId, Long consultantId, Boolean inQueue, Pageable pageable);

    LeadResponse getById(Long id);

    LeadDetailResponse getDetailById(Long id);

    LeadResponse update(Long id, LeadUpdateRequest request);

    LeadResponse assignConsultant(Long id, LeadAssignRequest request);

    LeadInteractionResponse logInteraction(Long id, LeadInteractionCreateRequest request);

    List<LeadInteractionResponse> getInteractions(Long id);

    LeadPlacementTestResponse recordPlacementTest(Long id, LeadPlacementTestCreateRequest request);

    List<LeadPlacementTestResponse> getPlacementTests(Long id);

    void delete(Long id);
}
