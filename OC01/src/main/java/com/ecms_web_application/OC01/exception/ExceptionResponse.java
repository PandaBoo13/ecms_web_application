package com.ecms_web_application.OC01.exception;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Lớp này đại diện cho phản hồi lỗi được gửi đến client khi có exception xảy ra.
 * Nó chứa thông tin về trạng thái lỗi, thời gian lỗi xảy ra và thông điệp lỗi.
 */
@Data
public class ExceptionResponse {
    private final String status = "error"; // Trạng thái cố định là "error" để báo lỗi
    private String timestamp; // Thời gian xảy ra lỗi
    private Object message; // Nội dung thông điệp lỗi (có thể là chuỗi hoặc object)

    /** Mã lỗi nghiệp vụ (không bắt buộc) để client phân nhánh xử lý. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private String code;

    /**
     * Constructor khởi tạo một phản hồi lỗi với message được cung cấp.
     *
     * @param message Thông báo lỗi (có thể là String hoặc một đối tượng JSON).
     */
    public ExceptionResponse(Object message) {
        this(message, null);
    }

    /**
     * Constructor khởi tạo một phản hồi lỗi kèm mã lỗi nghiệp vụ.
     *
     * @param message Thông báo lỗi (có thể là String hoặc một đối tượng JSON).
     * @param code    Mã lỗi nghiệp vụ để client phân nhánh xử lý.
     */
    public ExceptionResponse(Object message, String code) {
        this.timestamp = LocalDateTime.now().toString(); // Ghi lại thời điểm xảy ra lỗi
        this.message = message; // Lưu thông điệp lỗi
        this.code = code;
    }
}
