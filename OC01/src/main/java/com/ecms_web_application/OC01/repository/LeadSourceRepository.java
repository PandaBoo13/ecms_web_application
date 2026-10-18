package com.ecms_web_application.OC01.repository;

import com.ecms_web_application.OC01.entity.LeadSource;
import com.ecms_web_application.OC01.generic.IRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface LeadSourceRepository extends IRepository<LeadSource, Long> {
    Optional<LeadSource> findBySourceName(String sourceName);
}

