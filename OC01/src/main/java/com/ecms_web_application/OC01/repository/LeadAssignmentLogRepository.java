package com.ecms_web_application.OC01.repository;

import com.ecms_web_application.OC01.entity.LeadAssignmentLog;
import com.ecms_web_application.OC01.generic.IRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LeadAssignmentLogRepository extends IRepository<LeadAssignmentLog, Long> {
    List<LeadAssignmentLog> findByLeadIdOrderByChangedAtDesc(Long leadId);
}

