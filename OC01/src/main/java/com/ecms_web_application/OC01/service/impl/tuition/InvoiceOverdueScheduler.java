package com.ecms_web_application.OC01.service.impl.tuition;

import com.ecms_web_application.OC01.entity.Invoice;
import com.ecms_web_application.OC01.entity.enums.CourseType;
import com.ecms_web_application.OC01.entity.enums.InvoiceStatus;
import com.ecms_web_application.OC01.entity.enums.InvoiceType;
import com.ecms_web_application.OC01.repository.InvoiceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Job định kỳ: chuyển hóa đơn học phí PENDING của khóa OFFLINE đã qua hạn thanh toán
 * thành OVERDUE. Chạy mỗi 5 phút và chạy ngay khi khởi động backend để trạng thái lưu
 * trong DB khớp với hạn thanh toán mà học viên nhìn thấy trên trang thanh toán công khai
 * (trước đây job chỉ chạy lúc 01:00 mỗi ngày nên hóa đơn hết hạn giữa ngày vẫn hiển thị
 * "Chờ thanh toán" ở admin cho đến đêm hôm đó, và nếu server không chạy lúc 01:00 thì
 * trạng thái sai lệch mãi).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class InvoiceOverdueScheduler {
    private final InvoiceRepository invoiceRepository;

    @Scheduled(fixedDelay = 300_000)
    @Transactional
    public void markOfflineInvoicesOverdue() {
        int updated = 0;
        for (Invoice invoice : invoiceRepository.findDueInvoicesForUpdate(
                InvoiceType.TUITION_PAYMENT, InvoiceStatus.PENDING, LocalDateTime.now(), CourseType.OFFLINE)) {
            invoice.setStatus(InvoiceStatus.OVERDUE);
            updated++;
        }
        if (updated > 0) log.info("Marked {} offline tuition invoices OVERDUE", updated);
    }
}
