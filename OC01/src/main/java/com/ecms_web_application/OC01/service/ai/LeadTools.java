package com.ecms_web_application.OC01.service.ai;

import com.ecms_web_application.OC01.dto.request.LeadCreateRequest;
import com.ecms_web_application.OC01.dto.response.LeadResponse;
import com.ecms_web_application.OC01.service.LeadService;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.data.domain.PageRequest;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;

@Component
public class LeadTools {

    private final LeadService leadService;

    public LeadTools(LeadService leadService) {
        this.leadService = leadService;
    }

    @Tool(description = "Tạo một khách hàng tiềm năng (Lead) mới trong hệ thống.")
    public String createLead(
            @ToolParam(description = "Họ và tên đầy đủ của khách hàng") String fullName,
            @ToolParam(description = "Số điện thoại liên hệ (10-15 số)") String phone,
            @Nullable @ToolParam(description = "Địa chỉ email của khách hàng (có thể để trống)") String email,
            @Nullable @ToolParam(description = "ID của khóa học mà khách hàng quan tâm (có thể để trống)") Long courseId) {

        try {
            LeadCreateRequest request = new LeadCreateRequest();
            request.setFullName(fullName);
            request.setPhone(phone);
            request.setEmail(email);
            request.setCourseId(courseId);

            LeadResponse response = leadService.create(request);

            // ✅ CHỈ ghi nhận thành công SAU KHI service trả về bình thường
            AIAgentContext.current().recordCreatedLead(
                    response.getId(), response.getFullName());

            return "Đã tạo Lead thành công. ID: " + response.getId()
                    + ", Tên: " + response.getFullName();

        } catch (Exception e) {
            // ✅ Ghi nhận lỗi để AIAgentService biết tool đã chạy nhưng FAIL
            AIAgentContext.current().recordToolError(e.getMessage());
            // Throw lại để Spring AI báo lỗi cho LLM xử lý tiếp
            throw e;
        }
    }

    @Tool(description = "Tìm kiếm khách hàng tiềm năng dựa trên số điện thoại hoặc tên.")
    public String searchLeads(
            @ToolParam(description = "Từ khóa tìm kiếm (số điện thoại hoặc tên khách hàng)") String keyword) {

        var page = leadService.search(
                keyword, null, null, null, null, null,
                PageRequest.of(0, 5));

        if (page.isEmpty()) {
            return "Không tìm thấy khách hàng nào khớp với từ khóa: " + keyword;
        }

        StringBuilder sb = new StringBuilder("Tìm thấy " + page.getTotalElements() + " kết quả:\n");
        page.getContent().forEach(lead ->
                sb.append("- ID: ").append(lead.getId())
                        .append(" | Tên: ").append(lead.getFullName())
                        .append(" | SĐT: ").append(lead.getPhone())
                        .append(" | Trạng thái: ").append(lead.getStatus())
                        .append("\n")
        );
        return sb.toString();
    }
}