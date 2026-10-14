package com.ecms_web_application.OC01.repository;

import com.ecms_web_application.OC01.entity.Question;
import com.ecms_web_application.OC01.entity.enums.QuestionStatus;
import com.ecms_web_application.OC01.entity.enums.QuestionType;
import com.ecms_web_application.OC01.generic.IRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface QuestionRepository extends IRepository<Question, Long> {

    List<Question> findByLesson_Id(Long lessonId);
    List<Question> findByCourse_Id(Long courseId);
    long countByLesson_Id(Long lessonId);
    long countByCourse_Id(Long courseId);

    @Query("""
        SELECT q FROM Question q
        WHERE q.course.id = :courseId
          AND (:lessonId IS NULL OR q.lesson.id = :lessonId)
          AND (:questionType IS NULL OR q.questionType = :questionType)
          AND (:status IS NULL OR q.status = :status)
          AND (:hashtag = '' OR LOWER(q.hashtag) = LOWER(:hashtag))
          AND (:search = '' OR LOWER(q.content) LIKE LOWER(CONCAT('%', :search, '%')))
        ORDER BY q.orderIndex ASC, q.createdAt DESC
    """)
    Page<Question> searchQuestions(
            @Param("courseId") Long courseId,
            @Param("lessonId") Long lessonId,
            @Param("questionType") QuestionType questionType,
            @Param("status") QuestionStatus status,
            @Param("hashtag") String hashtag,
            @Param("search") String search,
            Pageable pageable);

    @Query("SELECT q FROM Question q WHERE q.course.id = :courseId " +
            "AND q.hashtag IN :hashtags AND q.status = 'ACTIVE'")
    List<Question> findActiveByCourseAndHashtags(
            @Param("courseId") Long courseId,
            @Param("hashtags") List<String> hashtags);
}