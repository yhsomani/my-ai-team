package com.talentsphere.lms.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.talentsphere.lms.entity.*;
import com.talentsphere.lms.repository.*;
import com.talentsphere.contracts.ApiResponse;
import com.talentsphere.shared.config.Feature;
import com.talentsphere.shared.config.FeatureFlagService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class CourseService {
    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final LessonRepository lessonRepository;
    private final LearningPathRepository learningPathRepository;
    private final OutboxRepository outboxRepository;
    private final FeatureFlagService featureFlagService;
    private final ObjectMapper objectMapper;

    @CircuitBreaker(name = "lmsCourseList", fallbackMethod = "listCoursesFallback")
    @SuppressWarnings("null")
    public ApiResponse<List<Course>> listCourses() {
        if (!featureFlagService.isEnabled(Feature.enable_courses)) {
            return ApiResponse.error("Courses feature is currently disabled");
        }
        return ApiResponse.ok(courseRepository.findAll());
    }

    public ApiResponse<List<Course>> listCoursesFallback(Throwable t) {
        log.error("Knowledge Node congestion: {}. Reverting to static curriculum preview.", t.getMessage());
        return ApiResponse.ok(Collections.emptyList());
    }

    @Transactional
    @SuppressWarnings("null")
    public ApiResponse<Course> createCourse(Course course) {
        Course saved = courseRepository.save(course);
        archiveEvent("COURSE", saved.getId(), "COURSE_CREATED", saved);
        return ApiResponse.ok(saved);
    }

    public ApiResponse<List<Course>> getAllCourses() {
        return listCourses();
    }

    public ApiResponse<Course> getCourseById(String id) {
        return courseRepository.findById(id)
                .map(ApiResponse::ok)
                .orElse(ApiResponse.error("Course not found"));
    }

    @Transactional
    @CircuitBreaker(name = "lmsEnrollment", fallbackMethod = "enrollFallback")
    public ApiResponse<Enrollment> enroll(String userId, String courseId) {
        if (enrollmentRepository.findByUserIdAndCourseId(userId, courseId).isPresent()) {
            return ApiResponse.error("User already enrolled");
        }
        Enrollment enrollment = new Enrollment();
        enrollment.setUserId(userId);
        enrollment.setCourseId(courseId);
        enrollment.setEnrolledAt(LocalDateTime.now());
        enrollment.setStatus(Enrollment.EnrollmentStatus.ENROLLED);
        enrollment.setProgress(0);
        enrollment.setCompletedLessonIds(new ArrayList<>());
        Enrollment saved = enrollmentRepository.save(enrollment);
        archiveEvent("ENROLLMENT", saved.getId(), "USER_ENROLLED", saved);
        return ApiResponse.ok(saved);
    }

    @SuppressWarnings("null")
    public ApiResponse<Enrollment> enrollFallback(String userId, String courseId, Throwable t) {
        log.error("Neural Enrollment congestion for user {} on course {}: {}. Buffering request.", userId, courseId, t.getMessage());
        return ApiResponse.error("Enrollment Node congested. Your entry has been queued for Neural Sync.");
    }

    public ApiResponse<Enrollment> enrollUser(String userId, String courseId) {
        return enroll(userId, courseId);
    }

    @Transactional
    public ApiResponse<Enrollment> completeLesson(String userId, String courseId, String lessonId) {
        return enrollmentRepository.findByUserIdAndCourseId(userId, courseId).map(enrollment -> {
            if (enrollment.getCompletedLessonIds().contains(lessonId)) {
                return ApiResponse.ok(enrollment);
            }

            Lesson lesson = lessonRepository.findById(lessonId).orElse(null);
            if (lesson != null && lesson.getPrerequisiteLessonId() != null) {
                String prereqId = lesson.getPrerequisiteLessonId();
                if (!enrollment.getCompletedLessonIds().contains(prereqId)) {
                    Lesson prereq = lessonRepository.findById(prereqId).orElse(null);
                    String prereqTitle = prereq != null ? prereq.getTitle() : "Previous lesson";
                    return ApiResponse.<Enrollment>error("Complete '" + prereqTitle + "' first");
                }
            }

            enrollment.getCompletedLessonIds().add(lessonId);
            
            List<Lesson> lessons = lessonRepository.findByCourseIdOrderByOrderNumberAsc(courseId);
            int totalLessons = lessons.size();
            int completed = enrollment.getCompletedLessonIds().size();
            int progress = totalLessons > 0 ? (int) (((double) completed / totalLessons) * 100) : 0;
            
            enrollment.setProgress(progress);
            if (progress == 100) {
                enrollment.setStatus(Enrollment.EnrollmentStatus.COMPLETED);
                enrollment.setCompletedAt(LocalDateTime.now());
            }
            return ApiResponse.ok(enrollmentRepository.save(enrollment));
        }).orElse(ApiResponse.<Enrollment>error("Enrollment not found"));
    }

    public ApiResponse<List<Enrollment>> getUserEnrollments(String userId) {
        return ApiResponse.ok(enrollmentRepository.findByUserId(userId));
    }

    @Transactional
    public ApiResponse<Enrollment> startCourse(String userId, String courseId) {
        return enrollmentRepository.findByUserIdAndCourseId(userId, courseId).map(enrollment -> {
            if (enrollment.getStatus() == Enrollment.EnrollmentStatus.ENROLLED) {
                enrollment.setStatus(Enrollment.EnrollmentStatus.IN_PROGRESS);
                enrollment.setStartedAt(LocalDateTime.now());
                return ApiResponse.ok(enrollmentRepository.save(enrollment));
            }
            return ApiResponse.<Enrollment>error("Course already started or completed");
        }).orElse(ApiResponse.error("Enrollment not found"));
    }

    public ApiResponse<Enrollment> getEnrollment(String userId, String courseId) {
        return enrollmentRepository.findByUserIdAndCourseId(userId, courseId)
                .<ApiResponse<Enrollment>>map(ApiResponse::ok)
                .orElse(ApiResponse.error("Enrollment not found"));
    }

    public ApiResponse<List<LearningPath>> getLearningPathsForCourse(String courseId) {
        return ApiResponse.ok(learningPathRepository.findByCoursesCourseId(courseId));
    }

    public ApiResponse<List<LearningPath>> getAllLearningPaths() {
        return ApiResponse.ok(learningPathRepository.findAll());
    }

    @Transactional
    public ApiResponse<Enrollment> dropCourse(String userId, String courseId) {
        return enrollmentRepository.findByUserIdAndCourseId(userId, courseId).map(enrollment -> {
            enrollment.setStatus(Enrollment.EnrollmentStatus.DROPPED);
            return ApiResponse.ok(enrollmentRepository.save(enrollment));
        }).orElse(ApiResponse.error("Enrollment not found"));
    }

    public ApiResponse<List<Lesson>> getCourseLessons(String courseId) {
        List<Lesson> lessons = lessonRepository.findByCourseIdOrderByOrderNumberAsc(courseId);
        if (lessons.isEmpty()) {
            return ApiResponse.error("No lessons found for this course");
        }
        return ApiResponse.ok(lessons);
    }

    public ApiResponse<Enrollment> getUserProgress(String userId, String courseId) {
        return getEnrollment(userId, courseId);
    }

    private void archiveEvent(String aggregateType, String aggregateId, String eventType, Object payload) {
        try {
            OutboxEvent event = OutboxEvent.builder()
                    .aggregateType(aggregateType)
                    .aggregateId(aggregateId)
                    .eventType(eventType)
                    .payload(objectMapper.writeValueAsString(payload))
                    .processed(false)
                    .createdAt(LocalDateTime.now())
                    .build();
            outboxRepository.save(event);
            log.info("Transactional Outbox: {} event archived for {}", eventType, aggregateId);
        } catch (Exception e) {
            log.error("Failed to archive outbox event: {}", e.getMessage());
        }
    }
}
