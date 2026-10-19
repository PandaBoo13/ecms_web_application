package com.ecms_web_application.OC01.repository;

import com.ecms_web_application.OC01.entity.CourseResource;
import com.ecms_web_application.OC01.entity.enums.ResourceType;
import com.ecms_web_application.OC01.generic.IRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CourseResourceRepository extends IRepository<CourseResource, Long> {

    List<CourseResource> findByCourse_IdOrderByOrderIndexAsc(Long courseId);
    List<CourseResource> findByCourse_IdAndParentIsNullOrderByOrderIndexAsc(Long courseId);
    List<CourseResource> findByParent_IdOrderByOrderIndexAsc(Long parentId);
    boolean existsByParent_Id(Long parentId);
    long countByCourse_IdAndResourceType(Long courseId, ResourceType type);
    /** Required resources dùng làm progress unit (bỏ CHAPTER/LESSON vì là container). */
    @Query("""
        SELECT r FROM CourseResource r
        WHERE r.course.id = :courseId
          AND r.isRequired = true
          AND r.resourceType NOT IN :excluded
        ORDER BY r.orderIndex ASC
    """)
    List<CourseResource> findRequiredProgressUnits(
            @Param("courseId") Long courseId,
            @Param("excluded") List<ResourceType> excluded);

    default List<CourseResource> findRequiredProgressUnits(Long courseId) {
        return findRequiredProgressUnits(courseId,
                List.of(ResourceType.CHAPTER, ResourceType.LESSON));
    }
    List<CourseResource> findByCourse_IdAndResourceTypeOrderByOrderIndexAsc(
            Long courseId, ResourceType type);

    long countByCourse_IdAndIsRequiredTrue(Long courseId);

    List<CourseResource> findByCourse_IdAndIsRequiredTrue(Long courseId);

    long countByCourse_IdAndResourceTypeAndIsRequiredTrue(Long courseId, ResourceType type);

    @Query("SELECT COALESCE(MAX(r.orderIndex), -1) FROM CourseResource r " +
            "WHERE r.course.id = :courseId AND r.parent.id IS NULL")
    Integer maxRootOrderIndex(@Param("courseId") Long courseId);

    @Query("SELECT COALESCE(MAX(r.orderIndex), -1) FROM CourseResource r WHERE r.parent.id = :parentId")
    Integer maxChildOrderIndex(@Param("parentId") Long parentId);
}