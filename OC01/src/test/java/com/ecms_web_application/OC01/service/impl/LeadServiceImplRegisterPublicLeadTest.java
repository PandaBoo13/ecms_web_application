package com.ecms_web_application.OC01.service.impl;

import com.ecms_web_application.OC01.dto.request.PublicLeadRegisterRequest;
import com.ecms_web_application.OC01.entity.Lead;
import com.ecms_web_application.OC01.entity.course.Course;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.repository.AccountRepository;
import com.ecms_web_application.OC01.repository.CourseRepository;
import com.ecms_web_application.OC01.repository.InvoiceRepository;
import com.ecms_web_application.OC01.repository.LeadAssignmentLogRepository;
import com.ecms_web_application.OC01.repository.LeadRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LeadServiceImplRegisterPublicLeadTest {
    @Mock LeadRepository leadRepository;
    @Mock LeadAssignmentLogRepository assignmentLogRepository;
    @Mock AccountRepository accountRepository;
    @Mock InvoiceRepository invoiceRepository;
    @Mock CourseRepository courseRepository;
    @InjectMocks LeadServiceImpl service;

    private final Course course = new Course();

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext(); // guest — không có authentication
        course.setId(34L);
        course.setTitle("IELTS Foundation");
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void stubCourseFound() {
        when(courseRepository.findById(34L)).thenReturn(Optional.of(course));
    }

    private PublicLeadRegisterRequest request(String email, String phone) {
        PublicLeadRegisterRequest request = new PublicLeadRegisterRequest();
        request.setFullName(" Nguyễn Văn A ");
        request.setEmail(email);
        request.setPhone(phone);
        request.setCourseId(34L);
        request.setNote("   ");
        return request;
    }

    @Test
    void register_withEmailOnly_savesLeadWithEmptyPhone() {
        stubCourseFound();
        when(leadRepository.save(any(Lead.class))).thenAnswer(inv -> {
            Lead lead = inv.getArgument(0);
            lead.setId(101L);
            return lead;
        });

        Long leadId = service.registerPublicLead(request("Guest@Example.COM ", null));

        assertEquals(101L, leadId);
        ArgumentCaptor<Lead> captor = ArgumentCaptor.forClass(Lead.class);
        verify(leadRepository).save(captor.capture());
        Lead saved = captor.getValue();
        assertEquals("Nguyễn Văn A", saved.getFullName());
        assertEquals("guest@example.com", saved.getEmail());
        assertEquals("", saved.getPhone());
        assertEquals(34L, saved.getCourseId());
        assertEquals("NEW", saved.getStatus());
        assertEquals("Website", saved.getSourceName());
        assertEquals("ONLINE", saved.getChannelType());
        assertNull(saved.getAssignedConsultantId());
        assertNull(saved.getNote());
    }

    @Test
    void register_withPhoneOnly_savesLeadWithEmptyEmail() {
        stubCourseFound();
        when(leadRepository.save(any(Lead.class))).thenAnswer(inv -> {
            Lead lead = inv.getArgument(0);
            lead.setId(102L);
            return lead;
        });

        Long leadId = service.registerPublicLead(request(null, " 0901234567 "));

        assertEquals(102L, leadId);
        ArgumentCaptor<Lead> captor = ArgumentCaptor.forClass(Lead.class);
        verify(leadRepository).save(captor.capture());
        Lead saved = captor.getValue();
        assertEquals("", saved.getEmail());
        assertEquals("0901234567", saved.getPhone());
    }

    @Test
    void register_withoutEmailAndPhone_throws400() {
        ErrorHandler ex = assertThrows(ErrorHandler.class,
                () -> service.registerPublicLead(request("  ", "")));

        assertEquals(400, ex.getStatus().value());
        verify(leadRepository, never()).save(any(Lead.class));
    }

    @Test
    void register_withUnknownCourse_throws404() {
        when(courseRepository.findById(999L)).thenReturn(Optional.empty());
        PublicLeadRegisterRequest request = request("guest@example.com", null);
        request.setCourseId(999L);

        ErrorHandler ex = assertThrows(ErrorHandler.class, () -> service.registerPublicLead(request));

        assertEquals(404, ex.getStatus().value());
        verify(leadRepository, never()).save(any(Lead.class));
    }

    @Test
    void register_withSoftDeletedCourse_throws404() {
        stubCourseFound();
        course.setDeletedAt(java.time.LocalDateTime.now());

        ErrorHandler ex = assertThrows(ErrorHandler.class,
                () -> service.registerPublicLead(request("guest@example.com", null)));

        assertEquals(404, ex.getStatus().value());
        verify(leadRepository, never()).save(any(Lead.class));
    }
}
