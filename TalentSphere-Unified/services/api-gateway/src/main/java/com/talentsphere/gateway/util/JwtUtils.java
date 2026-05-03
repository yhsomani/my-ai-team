package com.talentsphere.gateway.util;

import com.nimbusds.jose.JWSVerifier;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtUtils {

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
}
