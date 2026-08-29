package com.talentsphere.lms.controller;

import jakarta.validation.Valid;
import com.talentsphere.lms.entity.Course;
import com.talentsphere.lms.entity.Enrollment;
import com.talentsphere.lms.entity.LearningPath;
import com.talentsphere.lms.entity.Lesson;
import com.talentsphere.lms.service.CourseService;
import com.talentsphere.contracts.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v1/lms")
@RequiredArgsConstructor
public class LmsController {
    private final CourseService courseService;

    @GetMapping("/courses")
    public ApiResponse<List<Course>> list() {
        return courseService.listCourses();
    }

    @PostMapping("/courses")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Course> create(@Valid @RequestBody Course course) {
        return courseService.createCourse(course);
    }

    @GetMapping("/courses/{courseId}")
    public ApiResponse<Course> getById(@PathVariable String courseId) {
        return courseService.getCourseById(courseId);
    }

    @GetMapping("/courses/slug/{slug}")
    public ApiResponse<Course> getBySlug(@PathVariable String slug) {
        return courseService.getCourseBySlug(slug);
    }

    @GetMapping("/courses/{courseId}/lessons")
    public ApiResponse<List<Lesson>> getLessons(@PathVariable String courseId) {
        return courseService.getCourseLessons(courseId);
    }

    @PostMapping("/courses/{courseId}/enroll")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ApiResponse<Enrollment> enroll(@PathVariable String courseId, @RequestParam String userId) {
        return courseService.enroll(userId, courseId);
    }

    @PostMapping("/courses/{courseId}/enrollments/start")
    public ApiResponse<Enrollment> startCourse(@PathVariable String courseId, @RequestParam String userId) {
        return courseService.startCourse(userId, courseId);
    }

    @PostMapping("/courses/{courseId}/enrollments/drop")
    public ApiResponse<Enrollment> dropCourse(@PathVariable String courseId, @RequestParam String userId) {
        return courseService.dropCourse(userId, courseId);
    }

    @PostMapping("/courses/{courseId}/lessons/{lessonId}/complete")
    public ApiResponse<Enrollment> completeLesson(
            @PathVariable String courseId,
            @PathVariable String lessonId,
            @RequestParam String userId) {
        return courseService.completeLesson(userId, courseId, lessonId);
    }

    @GetMapping("/courses/{courseId}/enrollment")
    public ApiResponse<Enrollment> getEnrollment(
            @PathVariable String courseId,
            @RequestParam String userId) {
        return courseService.getEnrollment(userId, courseId);
    }

    @GetMapping("/enrollments/{userId}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN') or #userId == authentication.name")
    public ApiResponse<List<Enrollment>> getUserEnrollments(@PathVariable String userId) {
        return courseService.getUserEnrollments(userId);
    }

    @GetMapping("/learning-paths")
    public ApiResponse<List<LearningPath>> getAllLearningPaths() {
        return courseService.getAllLearningPaths();
    }

    @GetMapping("/courses/{courseId}/learning-paths")
    public ApiResponse<List<LearningPath>> getLearningPaths(@PathVariable String courseId) {
        return courseService.getLearningPathsForCourse(courseId);
    }

    @GetMapping("/health")
    public ApiResponse<String> health() {
        return ApiResponse.ok("UP");
    }
}
