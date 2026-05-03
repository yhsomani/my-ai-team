package com.talentsphere.auth.service;

import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Base class for all TalentSphere service unit tests.
 *
 * <p>Provides a standard Mockito extension so all extending test classes
 * automatically get Mockito mock injection without repeating the annotation.
 *
 * <h3>Usage:</h3>
 * <pre>{@code
 * class MyServiceTest extends BaseServiceTest {
 *   @Mock SomeDependency dependency;
 *   @InjectMocks MyService service;
 * }
 * }</pre>
 *
 * <p>Note: This class lives in the {@code auth-service} test directory as an
 * example template. Copy it to other services and adjust the package name.
 */
@ExtendWith(MockitoExtension.class)
public abstract class BaseServiceTest {
  // Intentionally empty — serves as a shared test lifecycle anchor.
  // Common test utilities (e.g., clock faking, JWT helpers) can be added here.
}
