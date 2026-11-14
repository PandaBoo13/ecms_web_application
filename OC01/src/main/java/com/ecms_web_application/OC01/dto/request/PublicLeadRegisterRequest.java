package com.ecms_web_application.OC01.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * DTO cho form "Đăng ký tư vấn" công khai trên landing page (khách chưa đăng nhập).
 * Khách chỉ cần cung cấp Email HOẶC Số điện thoại (service sẽ kiểm tra ít nhất một trong hai).
 *
 * Lưu ý: KHÔNG cho phép guest set các field nội bộ như status,
 * assignedConsultantId, channelType... — service tự gán giá trị an toàn.
 */
@Getter
@Setter
public class PublicLeadRegisterRequest {

    @NotBlank(message = "Họ và tên không được để trống")
    @Size(max = 255, message = "Họ và tên tối đa 255 ký tự")
    private String fullName;

    /** Email liên hệ (tùy chọn nếu đã nhập số điện thoại). */
    @Email(message = "Email không đúng định dạng")
    @Size(max = 255, message = "Email tối đa 255 ký tự")
    private String email;

    /** Số điện thoại liên hệ (tùy chọn nếu đã nhập email). */
    @Pattern(regexp = "^$|^[0-9+()\\s.-]{8,20}$", message = "Số điện thoại không hợp lệ")
    @Size(max = 20, message = "Số điện thoại tối đa 20 ký tự")
    private String phone;

    @NotNull(message = "Vui lòng chọn khóa học bạn muốn đăng ký tư vấn")
    private Long courseId;

    @Size(max = 2000, message = "Ghi chú tối đa 2000 ký tự")
    private String note;
}
