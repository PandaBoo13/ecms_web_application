package com.ecms_web_application.OC01.repository;

import com.ecms_web_application.OC01.entity.LeadPlacementTest;
import com.ecms_web_application.OC01.generic.IRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LeadPlacementTestRepository extends IRepository<LeadPlacementTest, Long> {
    List<LeadPlacementTest> findByLeadIdOrderByCreatedAtDesc(Long leadId);
}

