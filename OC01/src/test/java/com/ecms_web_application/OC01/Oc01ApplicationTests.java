package com.ecms_web_application.OC01;

import com.ecms_web_application.OC01.dto.response.LeadResponse;
import com.ecms_web_application.OC01.entity.Lead;
import com.ecms_web_application.OC01.entity.enums.InvoiceStatus;
import com.ecms_web_application.OC01.entity.enums.InvoiceType;
import com.ecms_web_application.OC01.repository.LeadRepository;
import com.ecms_web_application.OC01.service.LeadService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
class Oc01ApplicationTests {

    @Autowired
    private LeadRepository leadRepository;

    @Autowired
    private LeadService leadService;

    @Test
    void contextLoads() {
    }

    @Test
    void testSearchLeads() {
        Page<Lead> page1 = leadRepository.searchLeads(
                null, null, null, null, null,
                InvoiceType.TUITION_PAYMENT, List.of(InvoiceStatus.PENDING, InvoiceStatus.PAID, InvoiceStatus.OVERDUE),
                null, PageRequest.of(0, 20, Sort.by("createdAt").descending())
        );
        assertNotNull(page1);
        assertTrue(page1.getTotalElements() > 0);
        assertFalse(page1.getContent().isEmpty());

        Page<Lead> pageNew = leadRepository.searchLeads(
                "NEW", null, null, null, null,
                InvoiceType.TUITION_PAYMENT, List.of(InvoiceStatus.PENDING, InvoiceStatus.PAID, InvoiceStatus.OVERDUE),
                null, PageRequest.of(0, 1)
        );
        assertNotNull(pageNew);

        Page<Lead> pageQueue = leadRepository.searchLeads(
                null, null, null, true, null,
                InvoiceType.TUITION_PAYMENT, List.of(InvoiceStatus.PENDING, InvoiceStatus.PAID, InvoiceStatus.OVERDUE),
                null, PageRequest.of(0, 1)
        );
        assertNotNull(pageQueue);

        Page<Lead> pageConsulted = leadRepository.searchLeads(
                "CONSULTED", null, null, null, null,
                InvoiceType.TUITION_PAYMENT, List.of(InvoiceStatus.PENDING, InvoiceStatus.PAID, InvoiceStatus.OVERDUE),
                null, PageRequest.of(0, 1)
        );
        assertNotNull(pageConsulted);
    }

    @Test
    void testLeadServiceSearch() {
        Page<LeadResponse> response = leadService.search(null, null, null, null, null, null, null, PageRequest.of(0, 20));
        assertNotNull(response);
        assertTrue(response.getTotalElements() > 0);
        assertFalse(response.getContent().isEmpty());

        LeadResponse first = response.getContent().get(0);
        assertNotNull(first.getId());
        assertNotNull(first.getFullName());
    }

}
