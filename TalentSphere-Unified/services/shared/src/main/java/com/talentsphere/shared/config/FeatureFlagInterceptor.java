package com.talentsphere.shared.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.ModelAndView;

@Component
public class FeatureFlagInterceptor implements HandlerInterceptor {

    private final FeatureFlagsConfig featureFlagsConfig;

    public FeatureFlagInterceptor(FeatureFlagsConfig featureFlagsConfig) {
        this.featureFlagsConfig = featureFlagsConfig;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        request.setAttribute("featureFlags", featureFlagsConfig);
        return true;
    }

    @Override
    public void postHandle(HttpServletRequest request, HttpServletResponse response, 
                        Object handler, ModelAndView modelAndView) {
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response,
                           Object handler, Exception ex) {
        request.removeAttribute("featureFlags");
    }
}