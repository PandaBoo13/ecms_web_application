package com.ecms_web_application.OC01.dto.response.request;

import lombok.Getter;
import lombok.Setter;

import java.util.Map;

@Getter
@Setter
public class RequestDetailResponse extends RequestResponse {

    private String description;

    /** Input của requester — field riêng từng loại */
    private Map<String, Object> payload;

    /** Output của approver — reply / action / kết quả */
    private Map<String, Object> responseData;
}