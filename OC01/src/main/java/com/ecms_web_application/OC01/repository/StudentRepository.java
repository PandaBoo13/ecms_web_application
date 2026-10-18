package com.ecms_web_application.OC01.repository;

import com.ecms_web_application.OC01.entity.Student;
import com.ecms_web_application.OC01.generic.IRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface StudentRepository extends IRepository<Student, Long> {

    Optional<Student> findByStudentCode(String studentCode);

    Optional<Student> findByLeadId(Long leadId);

    Optional<Student> findByUserId(Long userId);

    boolean existsByStudentCode(String studentCode);

    boolean existsByStudentCodeAndIdNot(String studentCode, Long id);

    boolean existsByEmail(String email);

    boolean existsByEmailAndIdNot(String email, Long id);

    boolean existsByPhone(String phone);

    boolean existsByLeadId(Long leadId);

    @Query("""
        SELECT s FROM Student s
        WHERE (:status IS NULL OR :status = '' OR s.status = :status)
          AND (:search IS NULL OR :search = ''
               OR LOWER(s.fullName) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(s.studentCode) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(s.email) LIKE LOWER(CONCAT('%', :search, '%'))
               OR s.phone LIKE CONCAT('%', :search, '%'))
        ORDER BY s.createdAt DESC
    """)
    Page<Student> searchStudents(
            @Param("status") String status,
            @Param("search") String search,
            Pageable pageable
    );
}
