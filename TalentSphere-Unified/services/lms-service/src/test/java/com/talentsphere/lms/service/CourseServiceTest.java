package com.talentsphere.lms.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.talentsphere.lms.entity.Course;
import com.talentsphere.lms.entity.Enrollment;
import com.talentsphere.lms.repository.*;
import com.talentsphere.contracts.ApiResponse;
import com.talentsphere.shared.config.Feature;
import com.talentsphere.shared.config.FeatureFlagService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CourseServiceTest {

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private EnrollmentRepository enrollmentRepository;

    @Mock
    private LessonRepository lessonRepository;

    @Mock
    private LearningPathRepository learningPathRepository;

    @Mock
    private OutboxRepository outboxRepository;

    @Mock
    private FeatureFlagService featureFlagService;

    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private CourseService courseService;

    private Course testCourse;
    private Enrollment testEnrollment;

    @BeforeEach
    void setUp() {
        testCourse = Course.builder()
                .id("course_123")
                .title("Introduction to Java")
                .description("Learn Java from scratch")
                .instructorId("instructor_456")
                .category("Programming")
                .price(49.99)
                .build();

        testEnrollment = Enrollment.builder()
                .id("enroll_123")
                .userId("user_456")
                .courseId("course_123")
                .progress(50)
                .build();
    }

    @Test
    void createCourse_Success() {
        when(courseRepository.save(any(Course.class))).thenReturn(testCourse);

        ApiResponse<Course> response = courseService.createCourse(testCourse);

        assertTrue(response.isSuccess());
        assertEquals("Introduction to Java", response.getData().getTitle());
        verify(courseRepository, times(1)).save(any(Course.class));
    }

    @Test
    void getCourseById_Found() {
        when(courseRepository.findById("course_123")).thenReturn(Optional.of(testCourse));

        ApiResponse<Course> result = courseService.getCourseById("course_123");

        assertTrue(result.isSuccess());
        assertEquals("Introduction to Java", result.getData().getTitle());
    }

    @Test
    void getCourseById_NotFound() {
        when(courseRepository.findById("invalid")).thenReturn(Optional.empty());

        ApiResponse<Course> result = courseService.getCourseById("invalid");

        assertFalse(result.isSuccess());
    }

    @Test
    void getAllCourses_ReturnsList() {
        when(featureFlagService.isEnabled(Feature.enable_courses)).thenReturn(true);
        when(courseRepository.findAll()).thenReturn(Arrays.asList(testCourse));

        ApiResponse<List<Course>> response = courseService.getAllCourses();

        assertTrue(response.isSuccess());
        assertEquals(1, response.getData().size());
    }

    @Test
    void enrollUser_Success() {
        when(enrollmentRepository.findByUserIdAndCourseId("user_456", "course_123"))
                .thenReturn(Optional.empty());
        when(enrollmentRepository.save(any(Enrollment.class))).thenReturn(testEnrollment);

        ApiResponse<Enrollment> response = courseService.enrollUser("user_456", "course_123");

        assertTrue(response.isSuccess());
        assertEquals("user_456", response.getData().getUserId());
        verify(enrollmentRepository, times(1)).save(any(Enrollment.class));
    }

    @Test
    void enrollUser_AlreadyEnrolled_ShouldReturnError() {
        when(enrollmentRepository.findByUserIdAndCourseId("user_456", "course_123"))
                .thenReturn(Optional.of(testEnrollment));

        ApiResponse<Enrollment> response = courseService.enrollUser("user_456", "course_123");

        assertFalse(response.isSuccess());
    }

    @Test
    void getEnrollment_Found() {
        when(enrollmentRepository.findByUserIdAndCourseId("user_456", "course_123"))
                .thenReturn(Optional.of(testEnrollment));

        ApiResponse<Enrollment> response = courseService.getEnrollment("user_456", "course_123");

        assertTrue(response.isSuccess());
        assertEquals(50, response.getData().getProgress());
    }

    @Test
    void getUserEnrollments_ShouldReturnAll() {
        when(enrollmentRepository.findByUserId("user_456")).thenReturn(Arrays.asList(testEnrollment));

        ApiResponse<List<Enrollment>> response = courseService.getUserEnrollments("user_456");

        assertTrue(response.isSuccess());
        assertEquals(1, response.getData().size());
    }
}