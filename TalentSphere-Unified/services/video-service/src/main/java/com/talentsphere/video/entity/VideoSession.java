package com.talentsphere.video.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "video_sessions",
    indexes = {
        @Index(name = "idx_vid_job", columnList = "jobId"),
        @Index(name = "idx_vid_applicant", columnList = "applicantId"),
        @Index(name = "idx_vid_interviewer", columnList = "interviewerId"),
        @Index(name = "idx_vid_status", columnList = "status"),
        @Index(name = "idx_vid_scheduled", columnList = "scheduledAt")
    })
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class VideoSession {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Version
    private Long version;

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