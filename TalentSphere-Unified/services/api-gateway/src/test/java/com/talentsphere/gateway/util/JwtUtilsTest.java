package com.talentsphere.gateway.util;

import com.nimbusds.jwt.JWTClaimsSet;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

class JwtUtilsTest {

    private final JwtUtils jwtUtils = new JwtUtils();

    @Test
    void normalizesSingleRoleClaim() {
        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .subject("user-123")
                .claim("role", "admin")
                .build();

        assertEquals("ROLE_ADMIN", jwtUtils.getPrimaryRole(claims));
    }

    @Test
    void readsRolesClaimAndChoosesHighestKnownRole() {
        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .subject("user-123")
                .claim("roles", List.of("ROLE_USER", "recruiter"))
                .build();

        assertEquals("ROLE_RECRUITER", jwtUtils.getPrimaryRole(claims));
    }

    @Test
    void readsSupabaseMetadataRoles() {
        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .subject("user-123")
                .claim("app_metadata", Map.of("roles", List.of("user", "admin")))
                .build();

        assertEquals("ROLE_ADMIN", jwtUtils.getPrimaryRole(claims));
    }

    @Test
    void defaultsToLeastPrivilegedRoleWhenNoKnownRoleExists() {
        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .subject("user-123")
                .claim("role", "owner")
                .build();

        assertEquals("ROLE_USER", jwtUtils.getPrimaryRole(claims));
    }

    @Test
    void usesSubjectAsAuthenticatedUserIdForSupabaseStyleTokens() {
        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .subject("supabase-user-id")
                .claim("userId", "legacy-user-id")
                .build();

        assertEquals("supabase-user-id", jwtUtils.getAuthenticatedUserId(claims));
    }

    @Test
    void usesLegacyUserIdWhenSubjectIsAnEmailAddress() {
        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .subject("legacy@example.com")
                .claim("userId", "legacy-user-id")
                .build();

        assertEquals("legacy-user-id", jwtUtils.getAuthenticatedUserId(claims));
    }
}
