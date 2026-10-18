package com.ecms_web_application.OC01.dto.request;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class StudentUpdateRequest {

    @Size(max = 20, message = "Mã học viên tối đa 20 ký tự")
    private String studentCode;

    private Long leadId;

    private Long userId;

    @Size(max = 255, message = "Họ và tên tối đa 255 ký tự")
    private String fullName;

    @Email(message = "Email không đúng định dạng")
    @Size(max = 255, message = "Email tối đa 255 ký tự")
    private String email;

    @Pattern(regexp = "^$|^[0-9+()\\s.-]{8,20}$", message = "Số điện thoại không hợp lệ")
    @Size(max = 20, message = "Số điện thoại tối đa 20 ký tự")
    private String phone;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate dateOfBirth;

    private String address;

    @Pattern(regexp = "^$|^(ACTIVE|INACTIVE)$", message = "Trạng thái chỉ có thể là ACTIVE hoặc INACTIVE")
    private String status;
}
