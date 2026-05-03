package com.talentsphere.gateway.filter;
import com.talentsphere.gateway.util.JwtUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import java.util.List;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.http.server.reactive.ServerHttpRequest;
import com.nimbusds.jwt.JWTClaimsSet;

@Component
public class AuthenticationFilter extends AbstractGatewayFilterFactory<AuthenticationFilter.Config> {
  @Autowired
  private RouteValidator validator;
  @Autowired
  private JwtUtils jwtUtils;

  public AuthenticationFilter() {
    super(Config.class);
  }

  @Override
  public GatewayFilter apply(Config config) {
    return ((exchange, chain) -> {
      if (validator.isSecured.test(exchange.getRequest())) {
        if (!exchange.getRequest().getHeaders().containsKey(HttpHeaders.AUTHORIZATION)) {
          throw new RuntimeException("Missing authorization header");
        }
        List<String> authHeaders = exchange.getRequest().getHeaders().get(HttpHeaders.AUTHORIZATION);
        String authHeader = (authHeaders != null && !authHeaders.isEmpty()) ? authHeaders.get(0) : null;
        
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
          authHeader = authHeader.substring(7);
        }
        try {
          jwtUtils.validateToken(authHeader);
          JWTClaimsSet claims = jwtUtils.getClaims(authHeader);
          
          if (claims != null) {
              ServerHttpRequest request = exchange.getRequest()
                  .mutate()
                  .header("X-User-Id", claims.getSubject())
                  .header("X-User-Role", claims.getStringClaim("role") != null ? claims.getStringClaim("role") : "USER")
                  .build();
              exchange = exchange.mutate().request(request).build();
          }
        } catch (Exception e) {
          throw new RuntimeException("Unauthorized access to application");
        }
      }
      return chain.filter(exchange);
    });
  }

  public static class Config {}
}
