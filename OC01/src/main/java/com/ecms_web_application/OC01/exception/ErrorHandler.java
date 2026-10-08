package com.ecms_web_application.OC01.exception;

import lombok.Data;
import lombok.EqualsAndHashCode;
import org.springframework.http.HttpStatus;

/**
 * Lớp ngoại lệ tùy chỉnh để xử lý lỗi trong ứng dụng.
 * Kế thừa `RuntimeException` để có thể ném ngoại lệ mà không cần khai báo trong phương thức.
 */
@EqualsAndHashCode(callSuper = true)
@Data
public class ErrorHandler extends RuntimeException {

    /**
     * Trạng thái HTTP của lỗi.
     */
    private HttpStatus status;

    /**
     * Constructor để tạo một ngoại lệ với mã trạng thái HTTP và thông báo lỗi.
     *
     * @param status Mã trạng thái HTTP, ví dụ: HttpStatus.NOT_FOUND, HttpStatus.BAD_REQUEST.
     * @param msg    Thông điệp mô tả lỗi.
     */
    public ErrorHandler(HttpStatus status, String msg) {
        super(msg);
        this.status = status;
    }
}
