package com.talentsphere.gateway.filter;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import java.util.List;
import java.util.Set;
import java.util.function.Predicate;

@Component
public class RouteValidator {
  public static final Set<String> openApiEndpoints = Set.of(
    "/api/v1/auth/register",
    "/api/v1/auth/login",
    "/api/v1/auth/forgot-password",
    "/api/v1/auth/health",
    "/api/v1/auth/.well-known/jwks.json",
    "/api/v1/admin/public/stats"
  );

  public static final List<String> openPathPrefixes = List.of(
    "/eureka"
  );

  public Predicate<ServerHttpRequest> isSecured =
    request -> !isOpenEndpoint(request.getURI().getPath());

  private boolean isOpenEndpoint(String path) {
    if (openApiEndpoints.contains(path)) {
      return true;
    }

    return openPathPrefixes.stream()
      .anyMatch(prefix -> path.equals(prefix) || path.startsWith(prefix + "/"));
  }
}
