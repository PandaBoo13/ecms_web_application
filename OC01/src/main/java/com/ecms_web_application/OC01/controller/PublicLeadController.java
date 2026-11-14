package com.ecms_web_application.OC01.controller;

import com.ecms_web_application.OC01.dto.request.PublicLeadRegisterRequest;
import com.ecms_web_application.OC01.dto.response.RequestResponse;
import com.ecms_web_application.OC01.service.LeadService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoint đăng ký tư vấn công khai (landing page — khách chưa đăng nhập).
 *
 * Form "Đăng ký tư vấn" trên studying web gọi endpoint này thay vì POST /api/leads
 * (endpoint admin yêu cầu đăng nhập + role), nhờ đó guest không bị 401
 * và không kích hoạt flow refresh-token vô nghĩa.
 *
 * Chỉ trả về id Lead mới — không lộ dữ liệu nội bộ (consultant, interactions...).
 */
@RestController
@RequestMapping("/api/public/leads")
@RequiredArgsConstructor
public class PublicLeadController {

    private final LeadService leadService;

    /**
     * POST /api/public/leads/register — guest gửi form đăng ký tư vấn.
     * Chỉ cần Email HOẶC Số điện thoại; status/channel/source do service tự gán.
     */
    @PostMapping("/register")
    public ResponseEntity<RequestResponse> register(
            @Valid @RequestBody PublicLeadRegisterRequest request) {
        Long leadId = leadService.registerPublicLead(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new RequestResponse(leadId,
                        "Đăng ký tư vấn thành công. Bộ phận tư vấn sẽ liên hệ với bạn trong thời gian sớm nhất."));
    }
}
