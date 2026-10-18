package com.ecms_web_application.OC01.repository;

import com.ecms_web_application.OC01.entity.LeadInteraction;
import com.ecms_web_application.OC01.generic.IRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LeadInteractionRepository extends IRepository<LeadInteraction, Long> {
    List<LeadInteraction> findByLeadIdOrderByCreatedAtDesc(Long leadId);
}

