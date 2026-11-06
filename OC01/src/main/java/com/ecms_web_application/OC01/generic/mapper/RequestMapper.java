package com.ecms_web_application.OC01.generic.mapper;

import com.ecms_web_application.OC01.dto.response.request.RequestDetailResponse;
import com.ecms_web_application.OC01.dto.response.request.RequestResponse;
import com.ecms_web_application.OC01.entity.Account;
import com.ecms_web_application.OC01.entity.enums.RequestType;
import com.ecms_web_application.OC01.entity.request.Request;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * Mapper: Request entity → DTO.
 *
 * Nguyên tắc:
 *  - Mapper KHÔNG truy cập DB. Account info phải được Service lookup sẵn
 *    và truyền vào dạng Map<Long, Account>.
 *  - Nếu accountMap null/rỗng → field *Name để null (không throw).
 *
 * Pattern: giống CourseMapper của project.
 */
@Component
public class RequestMapper {

    // ============================================================
    // ENTITY → LIST RESPONSE
    // ============================================================
    public RequestResponse toResponse(Request r, Map<Long, Account> accountMap) {
        if (r == null) return null;
        RequestResponse res = new RequestResponse();
        copyCommonFields(r, res, accountMap);
        return res;
    }

    // ============================================================
    // ENTITY → DETAIL RESPONSE
    // ============================================================
    public RequestDetailResponse toDetailResponse(Request r, Map<Long, Account> accountMap) {
        if (r == null) return null;
        RequestDetailResponse res = new RequestDetailResponse();
        copyCommonFields(r, res, accountMap);
        res.setDescription(r.getDescription());
        res.setPayload(r.getPayload());
        res.setResponseData(r.getResponseData());
        return res;
    }

    // ============================================================
    // SHARED
    // ============================================================
    private void copyCommonFields(Request r, RequestResponse res,
                                  Map<Long, Account> accountMap) {

        res.setId(r.getId());
        res.setRequestCode(r.getRequestCode());

        RequestType type = r.getRequestType();
        res.setRequestType(type != null ? type.getCode() : null);
        res.setRequestTypeName(type != null ? type.getDisplayName() : null);

        res.setRequesterId(r.getRequesterId());
        res.setRequesterName(resolveName(r.getRequesterId(), accountMap));

        res.setTargetEntityType(r.getTargetEntityType());
        res.setTargetEntityId(r.getTargetEntityId());

        res.setTitle(r.getTitle());
        res.setStatus(r.getStatus() != null ? r.getStatus().name() : null);
        res.setRejectReason(r.getRejectReason());

        res.setResolvedAt(r.getResolvedAt());
        res.setResolvedBy(r.getResolvedBy());
        res.setResolvedByName(resolveName(r.getResolvedBy(), accountMap));

        res.setCreatedAt(r.getCreatedAt());
        res.setUpdatedAt(r.getUpdatedAt());
    }

    /**
     * Resolve tên hiển thị:
     *  1. userProfile.fullName nếu có
     *  2. fallback email
     *  3. null nếu không tìm thấy
     */
    private String resolveName(Long accountId, Map<Long, Account> accountMap) {
        if (accountId == null || accountMap == null || accountMap.isEmpty()) {
            return null;
        }
        Account a = accountMap.get(accountId);
        if (a == null) return null;

        if (a.getUserProfile() != null && a.getUserProfile().getFullName() != null
                && !a.getUserProfile().getFullName().isBlank()) {
            return a.getUserProfile().getFullName();
        }
        return a.getEmail();
    }

    // ============================================================
    // HELPER cho Service: gom tất cả accountId cần lookup
    // ============================================================
    /**
     * Trả về tập accountId (requester + resolver) để Service batch lookup
     * trước khi gọi toResponse() / toDetailResponse().
     *
     * Tránh N+1: 1 query findAllById() thay vì N query.
     *
     * Ví dụ dùng ở Service:
     *   Set<Long> ids = requestMapper.collectAccountIds(requests);
     *   Map<Long, Account> map = accountRepo.findAllById(ids)
     *       .stream().collect(toMap(Account::getId, a -> a));
     *   return requests.stream()
     *       .map(r -> requestMapper.toResponse(r, map))
     *       .toList();
     */
    public Set<Long> collectAccountIds(Collection<Request> requests) {
        Set<Long> ids = new HashSet<>();
        if (requests == null) return ids;
        for (Request r : requests) {
            if (r.getRequesterId() != null) ids.add(r.getRequesterId());
            if (r.getResolvedBy() != null) ids.add(r.getResolvedBy());
        }
        return ids;
    }
}