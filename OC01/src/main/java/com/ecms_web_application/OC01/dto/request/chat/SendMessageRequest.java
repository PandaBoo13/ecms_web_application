package com.ecms_web_application.OC01.dto.request.chat;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SendMessageRequest {

    @Pattern(regexp = "TEXT|IMAGE|FILE|VIDEO|AUDIO|SYSTEM",
             message = "Loại tin nhắn không hợp lệ")
    private String messageType = "TEXT";

    @Size(max = 10000, message = "Nội dung tin nhắn không được vượt quá 10000 ký tự")
    private String content;

    @Size(max = 500, message = "URL file không được vượt quá 500 ký tự")
    private String fileUrl;

    @Size(max = 255, message = "Tên file không được vượt quá 255 ký tự")
    private String fileName;

    private Long fileSize;

    @Size(max = 100, message = "MIME type không được vượt quá 100 ký tự")
    private String mimeType;

    @Size(max = 50, message = "Định dạng file không được vượt quá 50 ký tự")
    private String fileFormat;

    private Long replyToMessageId;
}