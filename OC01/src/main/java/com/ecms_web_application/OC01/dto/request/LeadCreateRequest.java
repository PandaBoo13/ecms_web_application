package com.ecms_web_application.OC01.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LeadCreateRequest {

    @NotBlank(message = "Họ và tên không được để trống")
    @Size(max = 255, message = "Họ và tên tối đa 255 ký tự")
    private String fullName;

    @Email(message = "Email không đúng định dạng")
    @Size(max = 255, message = "Email tối đa 255 ký tự")
    private String email;

    @Pattern(regexp = "^$|^[0-9+()\\s.-]{8,20}$", message = "Số điện thoại không hợp lệ")
    @Size(max = 20, message = "Số điện thoại tối đa 20 ký tự")
    private String phone;

    private Long courseId;

    private Long sourceId;

    private Long assignedConsultantId;

    @Pattern(regexp = "^$|^(NEW|CONSULTED)$",
            message = "Trạng thái Lead chỉ có thể là NEW hoặc CONSULTED")
    private String status;

    private String note;
}
