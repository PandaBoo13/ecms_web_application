package com.ecms_web_application.OC01.controller;

import com.ecms_web_application.OC01.dto.request.tuition.OnlineCheckoutRequest;
import com.ecms_web_application.OC01.dto.response.RequestResponse;
import com.ecms_web_application.OC01.dto.response.tuition.PublicCheckoutResponse;
import com.ecms_web_application.OC01.dto.response.tuition.PublicInvoiceResponse;
import com.ecms_web_application.OC01.dto.response.tuition.VnpayReturnResponse;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.service.TuitionService;
import com.ecms_web_application.OC01.service.impl.tuition.TuitionPaymentLinkService;
import com.ecms_web_application.OC01.service.impl.tuition.VnpayGatewayService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.HtmlUtils;

import java.net.URI;
import java.text.NumberFormat;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Map;

/**
 * Endpoint học phí công khai (GET, không cần đăng nhập — nằm dưới /api/public/**).
 * Link thanh toán được bảo vệ bằng token có chữ ký; trang return được bảo vệ bằng chữ ký VNPAY.
 */
@RestController
@RequestMapping("/api/public/tuition")
@RequiredArgsConstructor
public class PublicTuitionController {
    private final TuitionPaymentLinkService paymentLinkService;
    private final VnpayGatewayService vnpayGatewayService;
    private final TuitionService tuitionService;

    @Value("${APP_STUDYING_URL:http://localhost:5174}")
    private String studyingUrl;

    /** Checkout công khai: khách chưa có tài khoản vẫn tạo được hóa đơn và token thanh toán. */
    @PostMapping("/checkout")
    public ResponseEntity<RequestResponse> createCheckout(
            @RequestParam Long courseId,
            @Valid @RequestBody OnlineCheckoutRequest request) {
        PublicCheckoutResponse data = tuitionService.createPublicOnlineCheckout(courseId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new RequestResponse(data, "Tạo hóa đơn thanh toán thành công"));
    }

    @GetMapping("/payment-links")
    public ResponseEntity<RequestResponse> getPaymentLink(@RequestParam String token) {
        return ResponseEntity.ok(new RequestResponse(paymentLinkService.getByToken(token),
                "Lấy thông tin hóa đơn thành công"));
    }

    /** Hóa đơn có thể thanh toán thì đi thẳng VNPAY; hóa đơn bị chặn thì mở trang trạng thái ECMS. */
    @GetMapping("/payment-links/redirect")
    public ResponseEntity<?> redirectToVnpay(@RequestParam String token, HttpServletRequest request) {
        try {
            String paymentUrl = paymentLinkService.createVnpayUrlByToken(token, request.getRemoteAddr());
            return ResponseEntity.status(HttpStatus.FOUND).location(URI.create(paymentUrl)).build();
        } catch (ErrorHandler ex) {
            // The link in the email is the public entry point. Render the blocked state
            // here so it works even when the studying frontend is not running.
            try {
                return ResponseEntity.ok().contentType(MediaType.TEXT_HTML)
                        .body(blockedInvoicePage(paymentLinkService.getByToken(token), ex.getMessage()));
            } catch (ErrorHandler tokenError) {
                return ResponseEntity.ok().contentType(MediaType.TEXT_HTML)
                        .body(blockedInvoicePage(null, tokenError.getMessage()));
            }
        }
    }

    private String blockedInvoicePage(PublicInvoiceResponse invoice, String fallbackMessage) {
        String status = invoice == null ? "INVALID" : invoice.status().name();
        String heading;
        String badge;
        String guidance;
        String accent;
        String icon;
        switch (status) {
            case "PAID" -> {
                heading = "Hóa đơn đã được thanh toán";
                badge = "ĐÃ THANH TOÁN";
                guidance = "Hệ thống đã ghi nhận thanh toán cho hóa đơn này. Bạn không cần thanh toán lại.";
                accent = "#16803c";
                icon = "✓";
            }
            case "OVERDUE" -> {
                heading = "Hóa đơn đã hết hạn";
                badge = "HẾT HẠN THANH TOÁN";
                guidance = "Link thanh toán này đã hết hiệu lực. Vui lòng liên hệ trung tâm để được gia hạn và nhận link mới.";
                accent = "#b56b00";
                icon = "!";
            }
            case "CANCELLED" -> {
                heading = "Hóa đơn đã bị hủy";
                badge = "ĐÃ HỦY";
                guidance = "Hóa đơn này không thể thanh toán. Vui lòng liên hệ trung tâm nếu bạn cần được hỗ trợ.";
                accent = "#b42318";
                icon = "×";
            }
            default -> {
                heading = invoice == null ? "Link thanh toán không còn khả dụng" : "Chưa thể mở thanh toán";
                badge = invoice == null ? "LINK KHÔNG HỢP LỆ" : "TẠM THỜI KHÔNG KHẢ DỤNG";
                guidance = invoice == null
                        ? (fallbackMessage == null ? "Link có thể đã hết hạn hoặc không hợp lệ. Vui lòng liên hệ trung tâm để được hỗ trợ." : fallbackMessage)
                        : "Hiện chưa thể tạo giao dịch thanh toán cho hóa đơn này. Vui lòng thử lại sau hoặc liên hệ trung tâm.";
                accent = "#52627a";
                icon = "i";
            }
        }

        String details = "";
        if (invoice != null) {
            String amount = invoice.amount() == null ? "—"
                    : NumberFormat.getNumberInstance(Locale.forLanguageTag("vi-VN")).format(invoice.amount()) + " ₫";
            String dueAt = invoice.dueAt() == null ? "—"
                    : invoice.dueAt().format(DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy"));
            details = "<div class='details'>"
                    + row("Mã hóa đơn", invoice.invoiceCode())
                    + row("Khóa học", invoice.courseTitle())
                    + row("Số tiền", amount)
                    + row("Hạn thanh toán", dueAt)
                    + "</div>";
        }

        return """
                <!doctype html><html lang="vi"><head><meta charset="utf-8">
                <meta name="viewport" content="width=device-width,initial-scale=1">
                <meta name="color-scheme" content="light"><title>%s · ECMS</title><style>
                *{box-sizing:border-box}body{margin:0;min-height:100vh;padding:28px 16px;display:grid;place-items:center;
                color:#172033;background:radial-gradient(ellipse at 50%% 0,#e8f0ff 0,#f4f7fb 54%%,#f4f7fb 100%%);
                font:16px/1.55 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
                main{width:min(100%%,560px);overflow:hidden;background:#fff;border:1px solid #e7ebf2;border-radius:22px;
                box-shadow:0 22px 65px #15294b14}.top{height:7px;background:%s}.content{padding:38px 40px 32px;text-align:center}
                .brand{font-weight:800;letter-spacing:.12em;font-size:13px;color:#52627a}.icon{width:76px;height:76px;margin:26px auto 16px;
                display:grid;place-items:center;border-radius:50%%;background:%s;color:%s;font-size:42px;font-weight:600}
                .badge{font-size:11px;font-weight:800;letter-spacing:.12em;color:%s}.title{font-size:27px;line-height:1.2;margin:9px 0 10px}
                .message{margin:0 auto;color:#5d6b80;max-width:430px}.details{margin:28px 0 20px;padding:4px 18px;
                background:#f8fafc;border:1px solid #e8edf4;border-radius:14px;text-align:left}.row{display:flex;justify-content:space-between;
                gap:20px;padding:13px 0;border-bottom:1px solid #e8edf4}.row:last-child{border:0}.label{color:#718096}.value{font-weight:700;
                text-align:right;overflow-wrap:anywhere}.help{padding:14px 16px;text-align:left;border-radius:12px;background:#f5f7fa;
                color:#52627a;font-size:14px}.footer{border-top:1px solid #edf0f5;padding:16px 24px;text-align:center;color:#8793a5;font-size:12px}
                @media(max-width:480px){.content{padding:28px 22px 24px}.title{font-size:24px}.details{padding:2px 13px}}
                </style></head><body><main><div class="top"></div><section class="content">
                <div class="brand">ECMS <span aria-hidden="true">·</span> HỌC PHÍ</div>
                <div class="icon">%s</div><div class="badge">%s</div><h1 class="title">%s</h1>
                <p class="message">%s</p>%s<div class="help">%s</div></section>
                <footer class="footer">Thông tin hóa đơn được cung cấp bởi ECMS</footer></main></body></html>
                """.formatted(HtmlUtils.htmlEscape(heading), accent,
                status.equals("PAID") ? "#eaf8ef" : status.equals("OVERDUE") ? "#fff6e5" : "#f2f4f7",
                accent, accent, icon, HtmlUtils.htmlEscape(badge), HtmlUtils.htmlEscape(heading),
                HtmlUtils.htmlEscape(invoice == null ? "" : invoiceSummary(invoice)), details,
                HtmlUtils.htmlEscape(guidance));
    }

    private String row(String label, String value) {
        return "<div class='row'><span class='label'>" + HtmlUtils.htmlEscape(label)
                + "</span><span class='value'>" + HtmlUtils.htmlEscape(value == null ? "—" : value) + "</span></div>";
    }

    private String invoiceSummary(PublicInvoiceResponse invoice) {
        return "Hóa đơn " + invoice.invoiceCode() + " không thể tiếp tục thanh toán.";
    }

    @GetMapping("/payment-links/vnpay")
    public ResponseEntity<RequestResponse> createVnpayUrl(@RequestParam String token, HttpServletRequest request) {
        String paymentUrl = paymentLinkService.createVnpayUrlByToken(token, request.getRemoteAddr());
        return ResponseEntity.ok(new RequestResponse(Map.of("paymentUrl", paymentUrl),
                "Tạo liên kết thanh toán VNPAY thành công"));
    }

    @GetMapping("/vnpay-return")
    public ResponseEntity<RequestResponse> verifyVnpayReturn(@RequestParam Map<String, String> params) {
        return ResponseEntity.ok(new RequestResponse(vnpayGatewayService.handleReturn(params),
                "Đã xác minh kết quả thanh toán"));
    }

    /** VNPAY return endpoint for local/customer browser navigation; verifies and updates the invoice on BE. */
    @GetMapping(value = "/vnpay-return-page", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> vnpayReturnPage(@RequestParam Map<String, String> params) {
        VnpayReturnResponse result = vnpayGatewayService.handleReturn(params);
        boolean awaitingConfirmation = !result.success() && "00".equals(result.responseCode());
        String heading = result.success() ? "Thanh toán thành công"
                : awaitingConfirmation ? "Đang xác nhận thanh toán" : "Thanh toán chưa thành công";
        String badge = result.success() ? "ĐÃ HOÀN TẤT"
                : awaitingConfirmation ? "ĐANG ĐỐI SOÁT" : "CHƯA HOÀN TẤT";
        String icon = result.success()
                ? "<svg viewBox='0 0 48 48' aria-hidden='true'><circle cx='24' cy='24' r='22'/><path d='m14 24 7 7 14-15'/></svg>"
                : awaitingConfirmation
                    ? "<svg viewBox='0 0 48 48' aria-hidden='true'><circle cx='24' cy='24' r='22'/><path d='M24 12v13l9 5'/></svg>"
                    : "<svg viewBox='0 0 48 48' aria-hidden='true'><circle cx='24' cy='24' r='22'/><path d='m17 17 14 14m0-14L17 31'/></svg>";
        String invoice = result.invoiceCode() == null ? "—" : HtmlUtils.htmlEscape(result.invoiceCode());
        String amount = result.amount() == null ? "—"
                : HtmlUtils.htmlEscape(NumberFormat.getNumberInstance(Locale.forLanguageTag("vi-VN"))
                        .format(result.amount()) + " ₫");
        String guidance = result.success()
                ? "Hệ thống đã ghi nhận thanh toán cho hóa đơn này. Bạn có thể đóng trang."
                : awaitingConfirmation
                    ? "VNPAY báo giao dịch thành công nhưng hệ thống chưa đối soát xong. Vui lòng chờ cập nhật và không thanh toán lại ngay."
                    : "Hóa đơn chưa được xác nhận đã thanh toán. Bạn có thể dùng lại link thanh toán trong email để thử lại.";
        String emailGuidance = result.success()
                ? "<br><span class='email-note'>Hãy kiểm tra email để xem chi tiết hóa đơn.</span>"
                : "";
        String homeButton = result.success()
                && result.courseType() == com.ecms_web_application.OC01.entity.enums.CourseType.ONLINE
                ? "<a class='home-button' href='" + HtmlUtils.htmlEscape(studyingUrl) + "'>Về trang chủ</a>"
                : "";
        String html = """
                <!doctype html>
                <html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
                <meta name="color-scheme" content="light"><title>%s · ECMS</title><style>
                *{box-sizing:border-box}body{margin:0;min-height:100vh;padding:28px 16px;display:grid;place-items:center;
                color:#172033;background:radial-gradient(ellipse at 50%% 0, #e8f0ff 0, #f4f7fb 52%%, #f4f7fb 100%%);
                font:16px/1.55 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
                main{width:min(100%%,520px);overflow:hidden;background:#fff;border:1px solid #e7ebf2;border-radius:22px;
                box-shadow:0 22px 65px #15294b14}.top{height:7px;background:%s}.content{padding:36px 38px 30px;text-align:center}
                .brand{font-weight:800;letter-spacing:.12em;font-size:13px;color:#52627a}.icon{width:76px;height:76px;margin:26px auto 16px;
                display:grid;place-items:center;border-radius:50%%;background:%s;color:%s}.icon svg{width:44px;height:44px;fill:none;
                stroke:currentColor;stroke-width:2.8;stroke-linecap:round;stroke-linejoin:round}.badge{font-size:11px;font-weight:800;
                letter-spacing:.12em;color:%s}.title{font-size:27px;line-height:1.2;margin:9px 0 10px;color:#172033}
                .message{margin:0 auto;color:#5d6b80;max-width:400px}.details{margin:28px 0 20px;padding:4px 18px;
                background:#f8fafc;border:1px solid #e8edf4;border-radius:14px;text-align:left}.row{display:flex;justify-content:space-between;
                gap:20px;padding:13px 0;border-bottom:1px solid #e8edf4}.row:last-child{border:0}.label{color:#718096}.value{font-weight:700;
                text-align:right;overflow-wrap:anywhere}.next{padding:14px 16px;text-align:left;border-radius:12px;background:%s;
                color:#354256;font-size:14px}.email-note{display:inline-block;margin-top:7px;color:#246b43;font-weight:600}
                .home-actions{margin-top:18px}.home-button{display:inline-block;padding:11px 22px;border-radius:8px;background:#1677ff;
                color:#fff;text-decoration:none;font-weight:700}.home-button:hover{background:#0958d9;color:#fff}
                .footer{border-top:1px solid #edf0f5;padding:16px 24px;text-align:center;color:#8793a5;font-size:12px}
                @media(max-width:480px){.content{padding:28px 22px 24px}.title{font-size:24px}.details{padding:2px 13px}}
                </style></head><body><main><div class="top"></div><section class="content">
                <div class="brand">ECMS <span aria-hidden="true">·</span> HỌC PHÍ</div>
                <div class="icon">%s</div><div class="badge">%s</div><h1 class="title">%s</h1>
                <p class="message">%s</p><div class="details">
                <div class="row"><span class="label">Mã hóa đơn</span><span class="value">%s</span></div>
                <div class="row"><span class="label">Số tiền</span><span class="value">%s</span></div>
                </div><div class="next">%s%s</div><div class="home-actions">%s</div></section>
                <footer class="footer">Kết quả giao dịch được xác minh bởi ECMS</footer>
                </main></body></html>
                """.formatted(HtmlUtils.htmlEscape(heading),
                result.success() ? "#16a34a" : awaitingConfirmation ? "#d97706" : "#dc2626",
                result.success() ? "#eaf8ef" : awaitingConfirmation ? "#fff6e5" : "#fff0f0",
                result.success() ? "#16803c" : awaitingConfirmation ? "#b56b00" : "#c62828",
                result.success() ? "#16803c" : awaitingConfirmation ? "#a45b00" : "#b42318",
                awaitingConfirmation ? "#fff8e9" : result.success() ? "#f0faf3" : "#fff5f5",
                icon, badge, HtmlUtils.htmlEscape(heading), HtmlUtils.htmlEscape(result.message()),
                invoice, amount, HtmlUtils.htmlEscape(guidance), emailGuidance, homeButton);
        return ResponseEntity.ok().contentType(MediaType.TEXT_HTML).body(html);
    }
}
