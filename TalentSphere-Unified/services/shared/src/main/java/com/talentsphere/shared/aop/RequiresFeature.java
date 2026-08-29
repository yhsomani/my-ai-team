package com.talentsphere.shared.aop;

import java.lang.annotation.*;

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface RequiresFeature {

    String value();

    String message() default "This feature is currently disabled";
    
    boolean throwException() default true;
}