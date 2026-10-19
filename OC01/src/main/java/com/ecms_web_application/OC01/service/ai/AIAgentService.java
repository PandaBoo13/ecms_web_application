package com.ecms_web_application.OC01.service.ai;

import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class AIAgentService {

    private final ChatClient chatClient;

    public AIAgentService(ChatClient.Builder builder, LeadTools leadTools) {
        this.chatClient = builder
                .defaultSystem("""
                    Bạn là trợ lý AI thông minh cho hệ thống Quản lý Trung tâm Tiếng Anh ECMS.
                    Nhiệm vụ: hỗ trợ nhân viên tư vấn tra cứu thông tin và tạo Lead mới.

                    QUY TẮC BẮT BUỘC:
                    - CHỈ báo "đã tạo thành công" KHI VÀ CHỈ KHI tool createLead trả về
                      chuỗi bắt đầu bằng "Đã tạo Lead thành công".
                    - Nếu tool trả về lỗi, phải báo lỗi đó cho người dùng.
                      TUYỆT ĐỐI KHÔNG được nói "thành công".
                    - Nếu thiếu thông tin bắt buộc (Họ tên, SĐT), phải hỏi lại.
                    - Trả lời bằng tiếng Việt, ngắn gọn, chuyên nghiệp.
                    """)
                .defaultTools(leadTools)
                .build();
    }

    public String chat(String message) {
        AIAgentContext.reset();   // state sạch cho mỗi request

        try {
            return this.chatClient.prompt()
                    .user(message)
                    .call()
                    .content();

        } catch (Exception e) {
            log.error("Lỗi khi AI sinh câu trả lời cuối cùng: ", e);

            AIAgentContext.State state = AIAgentContext.current();

            // ── CASE 1: Tool createLead ĐÃ chạy + lưu DB thành công ──
            //    Lỗi chỉ xảy ra ở bước sinh text cuối → vẫn báo ĐÚNG sự thật
            if (state.hasCreatedAnyLead()) {
                var created = state.getCreatedLeads();
                if (created.size() == 1) {
                    return String.format(
                            "Đã tạo khách hàng thành công (ID: %d, Tên: %s).",
                            created.get(0).id(), created.get(0).name());
                }
                return String.format("Đã tạo thành công %d khách hàng.", created.size());
            }

            // ── CASE 2: Tool có chạy nhưng THẤT BẠI ──
            if (state.getLastToolError() != null) {
                return "Xin lỗi, không thể tạo khách hàng: "
                        + state.getLastToolError()
                        + ". Vui lòng kiểm tra lại thông tin.";
            }

            // ── CASE 3: Tool CHƯA hề chạy → KHÔNG được báo thành công ──
            return "Xin lỗi, trợ lý AI đang gặp sự cố. "
                    + "Yêu cầu của bạn CHƯA được xử lý. Vui lòng thử lại sau ít phút.";

        } finally {
            AIAgentContext.reset();   // luôn cleanup — tránh leak ThreadLocal
        }
    }
}