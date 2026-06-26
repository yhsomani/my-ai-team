package com.talentsphere.gateway.filter;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import java.util.List;
import java.util.function.Predicate;

@Component
public class RouteValidator {
  public static final List<String> openApiEndpoints = List.of(
    "/api/v1/auth/register",
    "/api/v1/auth/login",
    "/api/v1/auth/health",
    "/api/v1/auth/.well-known/jwks.json",
    "/api/v1/admin/public/stats",
    "/eureka"
  );

  public Predicate<ServerHttpRequest> isSecured =
    request -> openApiEndpoints
      .stream()
      .noneMatch(uri -> request.getURI().getPath().contains(uri));
}
