package com.ecms_web_application.OC01.repository;

import com.ecms_web_application.OC01.entity.Course;
import com.ecms_web_application.OC01.entity.enums.CourseStatus;
import com.ecms_web_application.OC01.entity.enums.CourseType;
import com.ecms_web_application.OC01.generic.IRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface CourseRepository extends IRepository<Course, Long> {

    Optional<Course> findByCode(String code);
    Optional<Course> findBySlug(String slug);
    Optional<Course> findByDisplayCode(String displayCode);

    boolean existsByCode(String code);
    boolean existsBySlug(String slug);
    boolean existsByDisplayCode(String displayCode);
    boolean existsBySlugAndIdNot(String slug, Long id);
    boolean existsByDisplayCodeAndIdNot(String displayCode, Long id);

    @Query("""
        SELECT c FROM Course c
        LEFT JOIN FETCH c.teacher t
        LEFT JOIN FETCH c.category cat
        LEFT JOIN FETCH c.room r
        WHERE c.deletedAt IS NULL
          AND (:status IS NULL OR c.status = :status)
          AND (:type IS NULL OR c.courseType = :type)
          AND (:teacherId IS NULL OR t.id = :teacherId)
          AND (:categoryId IS NULL OR cat.id = :categoryId)
          AND (:search = '' OR LOWER(c.title) LIKE LOWER(CONCAT('%', :search, '%')))
        ORDER BY c.createdAt DESC
    """)
    Page<Course> searchCourses(
            @Param("status") CourseStatus status,
            @Param("type") CourseType type,
            @Param("teacherId") Long teacherId,
            @Param("categoryId") Long categoryId,
            @Param("search") String search,
            Pageable pageable);

    @Query("""
        SELECT c FROM Course c
        LEFT JOIN FETCH c.teacher t
        LEFT JOIN FETCH c.category cat
        LEFT JOIN FETCH c.room r
        WHERE c.id = :id AND c.deletedAt IS NULL
    """)
    Optional<Course> findByIdWithRelations(@Param("id") Long id);

    long countByTeacherId(Long teacherId);
}