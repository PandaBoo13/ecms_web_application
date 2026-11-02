package com.ecms_web_application.OC01.service.request;

import com.ecms_web_application.OC01.dto.request.request.RequestCreateRequest;
import com.ecms_web_application.OC01.dto.request.request.RequestReviewRequest;
import com.ecms_web_application.OC01.dto.request.request.RequestSearchRequest;
import com.ecms_web_application.OC01.dto.response.request.RequestDetailResponse;
import com.ecms_web_application.OC01.dto.response.request.RequestResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface RequestService {

    /** Requester tạo yêu cầu mới. */
    RequestDetailResponse create(RequestCreateRequest req);

    /** Xem chi tiết 1 yêu cầu. */
    RequestDetailResponse getById(Long id);

    /** Tìm kiếm / lọc danh sách yêu cầu. */
    Page<RequestResponse> search(RequestSearchRequest filter, Pageable pageable);

    /** Approver duyệt hoặc từ chối. */
    RequestDetailResponse review(Long id, RequestReviewRequest req);

    /** Requester tự hủy yêu cầu. */
    RequestDetailResponse cancel(Long id);
}