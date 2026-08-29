package com.talentsphere.lms.repository;
import com.talentsphere.lms.entity.LearningPath;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface LearningPathRepository extends MongoRepository<LearningPath, String> {
    List<LearningPath> findByCoursesCourseId(String courseId);
}
