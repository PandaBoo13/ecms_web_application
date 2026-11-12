package com.ecms_web_application.OC01.service.impl.tuition;

import com.ecms_web_application.OC01.dto.response.tuition.VnpayReturnResponse;
import com.ecms_web_application.OC01.entity.Invoice;
import com.ecms_web_application.OC01.entity.PaymentWebhookLog;
import com.ecms_web_application.OC01.entity.course.Course;
import com.ecms_web_application.OC01.entity.enums.CourseType;
import com.ecms_web_application.OC01.entity.enums.InvoiceStatus;
import com.ecms_web_application.OC01.entity.enums.InvoiceType;
import com.ecms_web_application.OC01.event.InvoicePaidEvent;
import com.ecms_web_application.OC01.repository.CourseRepository;
import com.ecms_web_application.OC01.repository.InvoiceRepository;
import com.ecms_web_application.OC01.repository.PaymentWebhookLogRepository;
import com.ecms_web_application.OC01.repository.StudentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VnpayGatewayServiceCapacityTest {
    private static final String HASH_SECRET = "test-secret";
    private static final String TMN_CODE = "TESTTMN";
    private static final String TXN_REF = "10" + "20260101120000000";

    @Mock InvoiceRepository invoiceRepository;
    @Mock CourseRepository courseRepository;
    @Mock PaymentWebhookLogRepository webhookLogRepository;
    @Mock StudentRepository studentRepository;
    @Mock ApplicationEventPublisher eventPublisher;
    @InjectMocks VnpayGatewayService service;

    private final Invoice invoice = new Invoice();
    private final Course course = new Course();

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(service, "tmnCode", TMN_CODE);
        ReflectionTestUtils.setField(service, "hashSecret", HASH_SECRET);
        ReflectionTestUtils.setField(service, "returnUrl", "http://localhost/return");

        invoice.setId(10L);
        invoice.setInvoiceCode("INV-10");
        invoice.setType(InvoiceType.TUITION_PAYMENT);
        invoice.setStatus(InvoiceStatus.PENDING);
        invoice.setCourseId(34L);
        invoice.setAmount(new BigDecimal("1000000.00"));

        course.setId(34L);
        course.setCourseType(CourseType.OFFLINE);
        course.setMaxStudents(3);

        when(invoiceRepository.existsById(10L)).thenReturn(true);
        when(invoiceRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(invoice));
        lenient().when(invoiceRepository.save(any(Invoice.class))).thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(webhookLogRepository.save(any(PaymentWebhookLog.class))).thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(courseRepository.findById(34L)).thenReturn(Optional.of(course));
    }

    @Test
    void recordsPaymentAsPaidEvenWhenOfflineCourseIsFull() {
        // VNPAY đã thu tiền: luôn PAID. Việc ghi danh (và kiểm tra sĩ số) chạy sau commit;
        // nếu thất bại, hóa đơn vẫn PAID và nằm trong danh sách đối soát.
        Map<String, String> response = service.handleIpn(signedParams());

        assertEquals("00", response.get("RspCode"));
        assertEquals(InvoiceStatus.PAID, invoice.getStatus());
        verify(eventPublisher).publishEvent(any(InvoicePaidEvent.class));
    }

    @Test
    void recordsPaymentAsPaidEvenWhenInvoiceWasCancelled() {
        invoice.setStatus(InvoiceStatus.CANCELLED);

        Map<String, String> response = service.handleIpn(signedParams());

        assertEquals("00", response.get("RspCode"));
        assertEquals(InvoiceStatus.PAID, invoice.getStatus());
        verify(eventPublisher).publishEvent(any(InvoicePaidEvent.class));
    }

    @Test
    void recordsPaymentAsPaidEvenWhenPendingInvoiceIsOverdue() {
        invoice.setDueAt(LocalDateTime.now().minusHours(1));

        Map<String, String> response = service.handleIpn(signedParams());

        assertEquals("00", response.get("RspCode"));
        assertEquals(InvoiceStatus.PAID, invoice.getStatus());
        verify(eventPublisher).publishEvent(any(InvoicePaidEvent.class));
    }

    @Test
    void duplicatePaidCallbackDoesNotPublishAnotherEvent() {
        invoice.setStatus(InvoiceStatus.PAID);

        VnpayReturnResponse response = service.handleReturn(signedParams());

        assertTrue(response.success());
        verify(eventPublisher, never()).publishEvent(any());
    }

    private Map<String, String> signedParams() {
        Map<String, String> params = new TreeMap<>();
        params.put("vnp_TxnRef", TXN_REF);
        params.put("vnp_Amount", "100000000");
        params.put("vnp_TmnCode", TMN_CODE);
        params.put("vnp_ResponseCode", "00");
        params.put("vnp_TransactionStatus", "00");
        params.put("vnp_TransactionNo", "TXN-001");
        params.put("vnp_PayDate", "20260101120000");
        params.put("vnp_SecureHash", hmacSha512(toQuery(params)));
        return params;
    }

    private String toQuery(Map<String, String> values) {
        return values.entrySet().stream()
                .map(entry -> URLEncoder.encode(entry.getKey(), StandardCharsets.UTF_8) + "="
                        + URLEncoder.encode(entry.getValue(), StandardCharsets.UTF_8))
                .collect(Collectors.joining("&"));
    }

    private String hmacSha512(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA512");
            mac.init(new SecretKeySpec(HASH_SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
            byte[] bytes = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(bytes.length * 2);
            for (byte b : bytes) hex.append(String.format("%02x", b));
            return hex.toString();
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }
}
