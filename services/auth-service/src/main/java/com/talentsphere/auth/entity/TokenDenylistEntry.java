package com.talentsphere.auth.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "token_denylist")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class TokenDenylistEntry {
    @Id
    private String jti;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;
}
