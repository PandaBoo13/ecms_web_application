package com.ecms_web_application.OC01.controller;

import com.ecms_web_application.OC01.dto.response.RequestResponse;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.service.ai.AIAgentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ai-agent")
@RequiredArgsConstructor
public class AIAgentController {

    private final AIAgentService aiAgentService;

    @PostMapping("/chat")
    public ResponseEntity<RequestResponse> chat(@RequestBody Map<String, String> request) {
        String message = request.get("message");

        if (message == null || message.isBlank()) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Nội dung tin nhắn không được rỗng");
        }
        if (message.length() > 2000) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Nội dung tin nhắn tối đa 2000 ký tự");
        }

        String reply = aiAgentService.chat(message);
        return ResponseEntity.ok(new RequestResponse(reply, "Phản hồi từ AI"));
    }
}