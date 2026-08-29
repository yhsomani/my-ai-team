package com.talentsphere.shared.config;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;

@Aspect
@Component
public class FeatureFlagAspect {

    private final FeatureFlagService featureFlagService;

    public FeatureFlagAspect(FeatureFlagService featureFlagService) {
        this.featureFlagService = featureFlagService;
    }

    @Around("@annotation(EnabledForFeature)")
    public Object checkFeatureEnabled(ProceedingJoinPoint joinPoint) throws Throwable {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Method method = signature.getMethod();
        EnabledForFeature annotation = method.getAnnotation(EnabledForFeature.class);
        
        Feature feature = annotation.value();
        
        if (!featureFlagService.isEnabled(feature)) {
            if (annotation.throwOnDisabled()) {
                throw new FeatureDisabledException(
                    "Feature '" + feature.name() + "' is currently disabled. " +
                    "Enable it via feature-flags.enable_" + feature.name().toLowerCase() + "=true"
                );
            }
            return annotation.defaultReturn();
        }
        
        return joinPoint.proceed();
    }

    public static class FeatureDisabledException extends RuntimeException {
        public FeatureDisabledException(String message) {
            super(message);
        }
    }
}
