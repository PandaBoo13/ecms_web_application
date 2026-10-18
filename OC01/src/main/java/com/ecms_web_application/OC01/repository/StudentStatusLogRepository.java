package com.ecms_web_application.OC01.repository;

import com.ecms_web_application.OC01.entity.StudentStatusLog;
import com.ecms_web_application.OC01.generic.IRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StudentStatusLogRepository extends IRepository<StudentStatusLog, Long> {
    List<StudentStatusLog> findByStudentIdOrderByChangedAtDesc(Long studentId);
}

