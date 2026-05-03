package com.talentsphere.video.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "video_sessions")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class VideoSession {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String jobId;

    @Column(nullable = false)
    private String applicantId;

    @Column(nullable = false)
    private String interviewerId;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private VideoSessionStatus status;

    @Column
    private String roomUrl;

    @Column
    private String recordingUrl;

    @Column
    private LocalDateTime scheduledAt;

    @Column
    private LocalDateTime startedAt;

    @Column
    private LocalDateTime endedAt;

    @Column
    private Integer durationMinutes;

    public enum VideoSessionStatus {
        SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED
    }
}