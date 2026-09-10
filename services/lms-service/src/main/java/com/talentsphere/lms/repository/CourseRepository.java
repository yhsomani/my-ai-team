package com.talentsphere.lms.repository;
import com.talentsphere.lms.entity.Course;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.Optional;

public interface CourseRepository extends MongoRepository<Course, String> {
    Optional<Course> findByTitle(String title);
    Optional<Course> findBySlug(String slug);
}
