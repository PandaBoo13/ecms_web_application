package com.ecms_web_application.OC01.repository;

import com.ecms_web_application.OC01.entity.AcademicHistory;
import com.ecms_web_application.OC01.generic.IRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AcademicHistoryRepository extends IRepository<AcademicHistory, Long> {
    List<AcademicHistory> findByStudentIdOrderByCreatedAtDesc(Long studentId);
}

