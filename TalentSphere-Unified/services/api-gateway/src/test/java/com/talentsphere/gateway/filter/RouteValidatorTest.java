package com.talentsphere.gateway.filter;

import org.junit.jupiter.api.Test;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RouteValidatorTest {

    private final RouteValidator routeValidator = new RouteValidator();

    @Test
    void exactPublicAuthPathsAreNotSecured() {
        assertFalse(isSecured("/api/v1/auth/login"));
        assertFalse(isSecured("/api/v1/auth/register"));
        assertFalse(isSecured("/api/v1/auth/health"));
        assertFalse(isSecured("/api/v1/auth/.well-known/jwks.json"));
    }

    @Test
    void protectedPathsContainingPublicPathTextRemainSecured() {
        assertTrue(isSecured("/api/v1/users/api/v1/auth/login"));
        assertTrue(isSecured("/api/v1/auth/login/extra"));
        assertTrue(isSecured("/api/v1/admin/public/stats/details"));
    }

    @Test
    void eurekaPrefixIsExplicitlyPublic() {
        assertFalse(isSecured("/eureka"));
        assertFalse(isSecured("/eureka/apps"));
    }

    @Test
    void unrelatedRoutesAreSecured() {
        assertTrue(isSecured("/api/v1/jobs"));
        assertTrue(isSecured("/api/v1/profile/me"));
    }

    private boolean isSecured(String path) {
        return routeValidator.isSecured.test(MockServerHttpRequest.get(path).build());
    }
}
