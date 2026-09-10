package com.talentsphere.gateway.util;

import com.nimbusds.jose.JWSVerifier;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Collection;
import java.util.Date;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Component
public class JwtUtils {

    private static final String ROLE_USER = "ROLE_USER";
    private static final String ROLE_RECRUITER = "ROLE_RECRUITER";
    private static final String ROLE_ADMIN = "ROLE_ADMIN";

    @Value("${jwt.secret:}")
    private String jwtSecret;

    public void validateToken(final String token) {
        try {
            SignedJWT signedJWT = SignedJWT.parse(token);

            if (jwtSecret == null || jwtSecret.isEmpty()) {
                throw new RuntimeException("JWT secret is not configured");
            }

            // Supabase uses HS256 with the project's JWT secret
            JWSVerifier verifier = new MACVerifier(jwtSecret.getBytes(StandardCharsets.UTF_8));

            if (!signedJWT.verify(verifier)) {
                throw new RuntimeException("Invalid token signature");
            }

            JWTClaimsSet claims = signedJWT.getJWTClaimsSet();
            if (new Date().after(claims.getExpirationTime())) {
                throw new RuntimeException("Token expired");
            }
        } catch (Exception e) {
            throw new RuntimeException("Unauthorized access to application: " + e.getMessage());
        }
    }

    public JWTClaimsSet getClaims(final String token) {
        try {
            SignedJWT signedJWT = SignedJWT.parse(token);
            return signedJWT.getJWTClaimsSet();
        } catch (Exception e) {
            return null;
        }
    }

    public String getAuthenticatedUserId(final JWTClaimsSet claims) {
        if (claims == null) {
            return null;
        }

        String subject = normalizeString(claims.getSubject());
        String userId = normalizeString(claims.getClaim("userId"));

        if (subject != null && !subject.contains("@")) {
            return subject;
        }

        if (userId != null) {
            return userId;
        }

        return subject;
    }

    public String getPrimaryRole(final JWTClaimsSet claims) {
        Set<String> roles = new LinkedHashSet<>();

        if (claims != null) {
            collectRoles(claims.getClaim("role"), roles);
            collectRoles(claims.getClaim("roles"), roles);
            collectMetadataRoles(claims.getClaim("app_metadata"), roles);
            collectMetadataRoles(claims.getClaim("user_metadata"), roles);
        }

        if (roles.contains(ROLE_ADMIN)) {
            return ROLE_ADMIN;
        }

        if (roles.contains(ROLE_RECRUITER)) {
            return ROLE_RECRUITER;
        }

        return ROLE_USER;
    }

    private void collectMetadataRoles(final Object metadata, final Set<String> roles) {
        if (!(metadata instanceof Map<?, ?> metadataMap)) {
            return;
        }

        collectRoles(metadataMap.get("role"), roles);
        collectRoles(metadataMap.get("roles"), roles);
    }

    private void collectRoles(final Object value, final Set<String> roles) {
        if (value instanceof String rawRole) {
            for (String role : rawRole.split("[,\\s]+")) {
                String normalizedRole = normalizeRole(role);
                if (normalizedRole != null) {
                    roles.add(normalizedRole);
                }
            }
            return;
        }

        if (value instanceof Collection<?> values) {
            for (Object item : values) {
                collectRoles(item, roles);
            }
        }
    }

    private String normalizeRole(final String role) {
        if (role == null || role.isBlank()) {
            return null;
        }

        String candidate = role.trim().toUpperCase(Locale.ROOT);
        if (!candidate.startsWith("ROLE_")) {
            candidate = "ROLE_" + candidate;
        }

        return switch (candidate) {
            case ROLE_USER, ROLE_RECRUITER, ROLE_ADMIN -> candidate;
            default -> null;
        };
    }

    private String normalizeString(final Object value) {
        if (!(value instanceof String stringValue)) {
            return null;
        }

        String normalizedValue = stringValue.trim();
        return normalizedValue.isEmpty() ? null : normalizedValue;
    }
}
