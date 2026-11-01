package com.ecms_web_application.OC01.controller;

import com.ecms_web_application.OC01.service.impl.tuition.VnpayGatewayService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/tuition/payments/vnpay")
@RequiredArgsConstructor
public class VnpayIpnController {
    private final VnpayGatewayService vnpayGatewayService;

    @GetMapping("/ipn")
    public ResponseEntity<Map<String, String>> receiveIpn(@RequestParam Map<String, String> params) {
        return ResponseEntity.ok(vnpayGatewayService.handleIpn(params));
    }
}
