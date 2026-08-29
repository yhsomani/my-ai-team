package com.talentsphere.shared.config;

import java.lang.annotation.*;

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface EnabledForFeature {
    Feature value();
    
    boolean throwOnDisabled() default true;
    
    String defaultReturn() default "";
}
