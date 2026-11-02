package com.ecms_web_application.OC01.repository;

import com.ecms_web_application.OC01.entity.enums.RequestStatus;
import com.ecms_web_application.OC01.entity.enums.RequestType;
import com.ecms_web_application.OC01.entity.request.Request;
import com.ecms_web_application.OC01.generic.IRepository;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface RequestRepository extends IRepository<Request, Long> {

    Optional<Request> findByRequestCode(String requestCode);

    /**
     * Kiểm tra đã có request PENDING cho target chưa — dùng trước khi tạo
     * để tránh vi phạm partial unique index uk_request_active_target.
     */
    boolean existsByRequestTypeAndTargetEntityTypeAndTargetEntityIdAndStatus(
            RequestType requestType,
            String targetEntityType,
            Long targetEntityId,
            RequestStatus status);

    long countByCreatedAtBetween(LocalDateTime from, LocalDateTime to);

    /**
     * Tìm request mới nhất theo target + type + status.
     */
    @Query("""
        SELECT r FROM Request r
        WHERE r.targetEntityType = :targetType
          AND r.targetEntityId = :targetId
          AND r.requestType = :type
          AND r.status = :status
        ORDER BY r.createdAt DESC
    """)
    java.util.List<Request> findAllByTargetAndTypeAndStatus(
            @Param("targetType") String targetType,
            @Param("targetId") Long targetId,
            @Param("type") RequestType type,
            @Param("status") RequestStatus status,
            Pageable pageable);

    default java.util.Optional<Request> findLatestByTargetAndTypeAndStatus(
            String targetType, Long targetId, RequestType type, RequestStatus status) {
        var list = findAllByTargetAndTypeAndStatus(targetType, targetId, type, status,
                Pageable.ofSize(1));
        return list.isEmpty() ? java.util.Optional.empty() : java.util.Optional.of(list.get(0));
    }

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM Request r WHERE r.id = :id")
    Optional<Request> findByIdForUpdate(@Param("id") Long id);

    @Query("""
        SELECT r FROM Request r
        WHERE (:requestType IS NULL OR r.requestType = :requestType)
          AND (:status IS NULL OR r.status = :status)
          AND (:requesterId IS NULL OR r.requesterId = :requesterId)
          AND (:targetEntityType IS NULL OR r.targetEntityType = :targetEntityType)
          AND (:targetEntityId IS NULL OR r.targetEntityId = :targetEntityId)
          AND (:keyword = '' OR LOWER(r.title) LIKE LOWER(CONCAT('%', :keyword, '%')))
          AND (:fromDate IS NULL OR r.createdAt >= :fromDate)
          AND (:toDate IS NULL OR r.createdAt <= :toDate)
        ORDER BY r.createdAt DESC
    """)
    Page<Request> search(
            @Param("requestType") RequestType requestType,
            @Param("status") RequestStatus status,
            @Param("requesterId") Long requesterId,
            @Param("targetEntityType") String targetEntityType,
            @Param("targetEntityId") Long targetEntityId,
            @Param("keyword") String keyword,
            @Param("fromDate") LocalDateTime fromDate,
            @Param("toDate") LocalDateTime toDate,
            Pageable pageable);
}