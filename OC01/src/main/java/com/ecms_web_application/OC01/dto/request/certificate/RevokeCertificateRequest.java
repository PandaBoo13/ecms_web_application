package com.ecms_web_application.OC01.dto.request.certificate;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RevokeCertificateRequest {
    @NotBlank
    private String reason;
}
