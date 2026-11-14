package com.ecms_web_application.OC01.repository;

import com.ecms_web_application.OC01.entity.course.Course;
import com.ecms_web_application.OC01.entity.enums.CourseStatus;
import com.ecms_web_application.OC01.entity.enums.CourseType;
import com.ecms_web_application.OC01.generic.IRepository;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface CourseRepository extends IRepository<Course, Long> {

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT c FROM Course c WHERE c.id = :id AND c.deletedAt IS NULL")
  Optional<Course> findByIdForUpdate(@Param("id") Long id);

  Optional<Course> findByCode(String code);

  Optional<Course> findBySlug(String slug);

  Optional<Course> findByDisplayCode(String displayCode);

  boolean existsByCode(String code);

  boolean existsBySlug(String slug);

  boolean existsByDisplayCode(String displayCode);

  boolean existsBySlugAndIdNot(String slug, Long id);

  boolean existsByDisplayCodeAndIdNot(String displayCode, Long id);

  // ══════════════════════════════════════════════════════════════
  // SEARCH — phân trang
  // ══════════════════════════════════════════════════════════════
  @Query(value = """
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
      """, countQuery = """
          SELECT COUNT(c) FROM Course c
          LEFT JOIN c.teacher t
          LEFT JOIN c.category cat
          LEFT JOIN c.room r
          WHERE c.deletedAt IS NULL
            AND (:status IS NULL OR c.status = :status)
            AND (:type IS NULL OR c.courseType = :type)
            AND (:teacherId IS NULL OR t.id = :teacherId)
            AND (:categoryId IS NULL OR cat.id = :categoryId)
            AND (:search = '' OR LOWER(c.title) LIKE LOWER(CONCAT('%', :search, '%')))
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

  List<Course> findByStatus(CourseStatus status);

  // ══════════════════════════════════════════════════════════════
  // CONFLICT — tìm course OFFLINE active overlap thời gian
  // ══════════════════════════════════════════════════════════════

  /*
   * Tìm course OFFLINE active (PLANNED/PUBLISHED/ONGOING) trùng GV + overlap
   * khoảng ngày.
   */
  @Query("""
          SELECT c FROM Course c
          LEFT JOIN FETCH c.teacher t
          LEFT JOIN FETCH c.room r
          WHERE c.id <> :excludeId
            AND c.deletedAt IS NULL
            AND c.courseType = com.ecms_web_application.OC01.entity.enums.CourseType.OFFLINE
            AND c.status IN (com.ecms_web_application.OC01.entity.enums.CourseStatus.PLANNED,
                             com.ecms_web_application.OC01.entity.enums.CourseStatus.PUBLISHED,
                             com.ecms_web_application.OC01.entity.enums.CourseStatus.ONGOING)
            AND c.startDate <= :endDate
            AND c.endDate >= :startDate
            AND t.id = :teacherId
      """)
  List<Course> findOverlappingByTeacher(
      @Param("excludeId") Long excludeId,
      @Param("startDate") LocalDate startDate,
      @Param("endDate") LocalDate endDate,
      @Param("teacherId") Long teacherId);

  /** Tìm course OFFLINE active trùng phòng + overlap khoảng ngày. */
  @Query("""
          SELECT c FROM Course c
          LEFT JOIN FETCH c.teacher t
          LEFT JOIN FETCH c.room r
          WHERE c.id <> :excludeId
            AND c.deletedAt IS NULL
            AND c.courseType = com.ecms_web_application.OC01.entity.enums.CourseType.OFFLINE
            AND c.status IN (com.ecms_web_application.OC01.entity.enums.CourseStatus.PLANNED,
                             com.ecms_web_application.OC01.entity.enums.CourseStatus.PUBLISHED,
                             com.ecms_web_application.OC01.entity.enums.CourseStatus.ONGOING)
            AND c.startDate <= :endDate
            AND c.endDate >= :startDate
            AND r.id = :roomId
      """)
  List<Course> findOverlappingByRoom(
      @Param("excludeId") Long excludeId,
      @Param("startDate") LocalDate startDate,
      @Param("endDate") LocalDate endDate,
      @Param("roomId") Long roomId);

  @Query("""
          SELECT c FROM Course c
          LEFT JOIN FETCH c.teacher t
          LEFT JOIN FETCH c.room r
          WHERE c.id <> :excludeId
            AND c.deletedAt IS NULL
            AND c.courseType = com.ecms_web_application.OC01.entity.enums.CourseType.OFFLINE
            AND c.status IN (com.ecms_web_application.OC01.entity.enums.CourseStatus.PLANNED,
                             com.ecms_web_application.OC01.entity.enums.CourseStatus.PUBLISHED,
                             com.ecms_web_application.OC01.entity.enums.CourseStatus.ONGOING)
            AND c.startDate <= :endDate
            AND c.endDate >= :startDate
      """)
  List<Course> findAllOverlappingOfflineCourses(
      @Param("excludeId") Long excludeId,
      @Param("startDate") LocalDate startDate,
      @Param("endDate") LocalDate endDate);
}