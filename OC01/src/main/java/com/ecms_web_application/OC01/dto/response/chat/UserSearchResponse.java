package com.ecms_web_application.OC01.dto.response.chat;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserSearchResponse {

    private Long accountId;
    private String username;
    private String fullName;
    private String email;
    private String phone;
    private String avatarUrl;

    /** Đã có private conversation chưa */
    private Boolean hasPrivateConversation;

    /** Nếu có, trả về id conversation cũ để FE mở lại thay vì tạo mới */
    private Long existingConversationId;
}