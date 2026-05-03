package com.talentsphere.shared.aop;

import com.talentsphere.shared.config.FeatureFlagsConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Aspect
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "talentsphere.feature-flags.aop-enabled", havingValue = "true", matchIfMissing = true)
@Slf4j
public class FeatureFlagAspect {

    private final FeatureFlagsConfig featureFlagsConfig;

    @Around("@annotation(requiresFeature)")
    public Object checkFeature(ProceedingJoinPoint joinPoint, RequiresFeature requiresFeature) throws Throwable {
        String featureName = requiresFeature.value();
        
        if (featureFlagsConfig.isDisabled(featureName)) {
            if (requiresFeature.throwException()) {
                log.debug("Feature {} is disabled - blocking method call to {}", 
                        featureName, joinPoint.getSignature().getName());
                throw new FeatureDisabledException(featureName, requiresFeature.message());
            } else {
                log.debug("Feature {} is disabled - allowing method call", featureName);
                return null;
            }
        }
        
        return joinPoint.proceed();
    }
}