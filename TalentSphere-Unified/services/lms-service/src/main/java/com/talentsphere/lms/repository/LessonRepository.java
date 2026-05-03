package com.talentsphere.lms.repository;
import com.talentsphere.lms.entity.Lesson;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface LessonRepository extends MongoRepository<Lesson, String> {
    List<Lesson> findByCourseIdOrderByOrderNumberAsc(String courseId);
}
