package com.ecms_web_application.OC01.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * Lớp DTO dùng để chuẩn hóa phản hồi API.
 * Mặc định, phản hồi có trạng thái "success".
 */
@Data
public class RequestResponse {

    /**
     * Trạng thái phản hồi, mặc định là "success".
     */
    private final String status = "success";

    /**
     * Thời điểm phản hồi được tạo.
     */
    private String timestamp;

    /**
     * Thông điệp mô tả phản hồi.
     */
    private String message;

    /**
     * Dữ liệu phản hồi có thể chứa đối tượng bất kỳ.
     */
    private Object data;

    /**
     * Constructor nhận cả dữ liệu và thông điệp.
     *
     * @param data    Dữ liệu phản hồi.
     * @param message Thông điệp phản hồi.
     */
    public RequestResponse(Object data, String message) {
        this.timestamp = LocalDateTime.now().toString();
        this.message = message;
        this.data = data;
    }

    /**
     * Constructor chỉ nhận dữ liệu, thông điệp mặc định là null.
     *
     * @param data Dữ liệu phản hồi.
     */
    public RequestResponse(Object data) {
        this(data, null);
    }

    /**
     * Constructor chỉ nhận thông điệp, dữ liệu mặc định là null.
     *
     * @param message Thông điệp phản hồi.
     */
    public RequestResponse(String message) {
        this.timestamp = LocalDateTime.now().toString();
        this.message = message;
        this.data = null;
    }
}
