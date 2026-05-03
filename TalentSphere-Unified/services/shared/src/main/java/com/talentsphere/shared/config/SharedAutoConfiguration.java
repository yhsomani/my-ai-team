package com.talentsphere.shared.config;

import com.talentsphere.shared.GlobalExceptionHandler;
import com.talentsphere.shared.cache.CacheInvalidationListener;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.context.annotation.Import;

@AutoConfiguration
@Import({GlobalExceptionHandler.class, CacheInvalidationListener.class})
public class SharedAutoConfiguration {
    // This class triggers the auto-registration of shared components
}
