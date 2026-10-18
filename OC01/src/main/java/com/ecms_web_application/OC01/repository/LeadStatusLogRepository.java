package com.ecms_web_application.OC01.repository;

import com.ecms_web_application.OC01.entity.LeadStatusLog;
import com.ecms_web_application.OC01.generic.IRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LeadStatusLogRepository extends IRepository<LeadStatusLog, Long> {
    List<LeadStatusLog> findByLeadIdOrderByChangedAtDesc(Long leadId);
}

