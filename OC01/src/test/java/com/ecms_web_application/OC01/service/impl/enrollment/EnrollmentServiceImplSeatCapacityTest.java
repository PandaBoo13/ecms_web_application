package com.ecms_web_application.OC01.service.impl.enrollment;

import com.ecms_web_application.OC01.entity.course.Course;
import com.ecms_web_application.OC01.entity.enums.CourseType;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.repository.AccountRepository;
import com.ecms_web_application.OC01.repository.AttendanceRecordRepository;
import com.ecms_web_application.OC01.repository.CourseRepository;
import com.ecms_web_application.OC01.repository.CourseResourceRepository;
import com.ecms_web_application.OC01.repository.EnrollmentRepository;
import com.ecms_web_application.OC01.repository.EnrollmentStatusLogRepository;
import com.ecms_web_application.OC01.repository.InvoiceRepository;
import com.ecms_web_application.OC01.repository.LeadRepository;
import com.ecms_web_application.OC01.repository.ProgressRepository;
import com.ecms_web_application.OC01.repository.SessionRepository;
import com.ecms_web_application.OC01.repository.StudentRepository;
import com.ecms_web_application.OC01.service.ProgressCalculationService;
import com.ecms_web_application.OC01.service.StudentService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.PlatformTransactionManager;

import java.util.Collection;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EnrollmentServiceImplSeatCapacityTest {
    @Mock EnrollmentRepository enrollmentRepository;
    @Mock EnrollmentStatusLogRepository statusLogRepository;
    @Mock StudentService studentService;
    @Mock AttendanceRecordRepository attendanceRepository;
    @Mock InvoiceRepository invoiceRepository;
    @Mock LeadRepository leadRepository;
    @Mock CourseRepository courseRepository;
    @Mock StudentRepository studentRepository;
    @Mock AccountRepository accountRepository;
    @Mock SessionRepository sessionRepository;
    @Mock CourseResourceRepository courseResourceRepository;
    @Mock ProgressRepository progressRepository;
    @Mock ProgressCalculationService progressCalculationService;
    @Mock EntityManager entityManager;
    @Mock PlatformTransactionManager transactionManager;
    @InjectMocks EnrollmentServiceImpl service;

    @Test
    void onlineCourseIgnoresMaxStudents() {
        Course course = course(CourseType.ONLINE, 1);

        assertDoesNotThrow(() -> ReflectionTestUtils.invokeMethod(service, "ensureSeatAvailable", course));

        verify(enrollmentRepository, never()).countByCourseIdAndStatusIn(any(), any());
    }

    @Test
    void offlineCourseStillRejectsWhenFull() {
        Course course = course(CourseType.OFFLINE, 2);
        when(enrollmentRepository.countByCourseIdAndStatusIn(eq(1L), any(Collection.class)))
                .thenReturn(2L);

        ErrorHandler error = assertThrows(ErrorHandler.class,
                () -> ReflectionTestUtils.invokeMethod(service, "ensureSeatAvailable", course));

        assertEquals(409, error.getStatus().value());
        assertEquals("Khóa học đã đủ sĩ số", error.getMessage());
    }

    @Test
    void offlineCourseAllowsEnrollmentBelowCapacity() {
        Course course = course(CourseType.OFFLINE, 2);
        when(enrollmentRepository.countByCourseIdAndStatusIn(eq(1L), any(Collection.class)))
                .thenReturn(1L);

        assertDoesNotThrow(() -> ReflectionTestUtils.invokeMethod(service, "ensureSeatAvailable", course));
    }

    private Course course(CourseType type, int maxStudents) {
        Course course = new Course();
        course.setId(1L);
        course.setCourseType(type);
        course.setMaxStudents(maxStudents);
        course.setCurrentStudents(0);
        return course;
    }
}
