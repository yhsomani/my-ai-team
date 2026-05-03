package com.talentsphere.video.repository;

import com.talentsphere.video.entity.VideoSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface VideoSessionRepository extends JpaRepository<VideoSession, String> {
}