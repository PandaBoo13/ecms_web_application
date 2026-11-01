package com.ecms_web_application.OC01.repository;

import com.ecms_web_application.OC01.entity.PaymentWebhookLog;
import com.ecms_web_application.OC01.generic.IRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PaymentWebhookLogRepository extends IRepository<PaymentWebhookLog, Long> {
}
