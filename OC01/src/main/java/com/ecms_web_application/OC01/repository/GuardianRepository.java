package com.ecms_web_application.OC01.repository;

import com.ecms_web_application.OC01.entity.Guardian;
import com.ecms_web_application.OC01.generic.IRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GuardianRepository extends IRepository<Guardian, Long> {
    List<Guardian> findByStudentId(Long studentId);
}

