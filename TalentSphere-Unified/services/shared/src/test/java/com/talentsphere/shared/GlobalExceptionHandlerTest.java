package com.talentsphere.shared;

import com.talentsphere.contracts.ApiResponse;
import com.talentsphere.shared.config.CorrelationIdFilter;
import com.talentsphere.shared.exception.BaseException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.FieldError;
import org.springframework.validation.ObjectError;
import org.springframework.web.bind.MethodArgumentNotValidException;

import java.lang.reflect.Method;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    private static final String CORRELATION_ID = "trace-123";

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @AfterEach
    void clearMdc() {
        MDC.clear();
    }

    @Test
    void generalExceptionReturnsSafePublicMessageWithCorrelationId() {
        MDC.put(CorrelationIdFilter.CORRELATION_ID_MDC_KEY, CORRELATION_ID);

        var response = handler.handleGeneralException(new RuntimeException("jdbc password=secret"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        ApiResponse<Void> body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.isSuccess()).isFalse();
        assertThat(body.getMessage())
                .contains("INTERNAL_ERROR")
                .contains(CORRELATION_ID)
                .doesNotContain("jdbc")
                .doesNotContain("secret");
    }

    @Test
    void baseExceptionReturnsCodeWithoutRawMessage() {
        MDC.put(CorrelationIdFilter.CORRELATION_ID_MDC_KEY, CORRELATION_ID);

        var response = handler.handleBaseException(new TestDomainException("tenant billing table leaked"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        ApiResponse<Void> body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.isSuccess()).isFalse();
        assertThat(body.getMessage())
                .contains("RESOURCE_NOT_FOUND")
                .contains(CORRELATION_ID)
                .doesNotContain("tenant billing table leaked");
    }

    @Test
    void illegalArgumentReturnsSafeBadRequestMessage() {
        MDC.put(CorrelationIdFilter.CORRELATION_ID_MDC_KEY, CORRELATION_ID);

        var response = handler.handleIllegalArgumentException(new IllegalArgumentException("path traversal ../secret"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        ApiResponse<Void> body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.isSuccess()).isFalse();
        assertThat(body.getMessage())
                .contains("INVALID_REQUEST")
                .contains(CORRELATION_ID)
                .doesNotContain("../secret");
    }

    @Test
    void accessDeniedReturnsSafeForbiddenMessage() {
        MDC.put(CorrelationIdFilter.CORRELATION_ID_MDC_KEY, CORRELATION_ID);

        var response = handler.handleAccessDenied(new AccessDeniedException("required ROLE_ADMIN"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        ApiResponse<Void> body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.isSuccess()).isFalse();
        assertThat(body.getMessage())
                .contains("ACCESS_DENIED")
                .contains(CORRELATION_ID)
                .doesNotContain("ROLE_ADMIN");
    }

    @Test
    void validationExceptionReturnsErrorResponseWithSafeSummaryAndFieldData() throws NoSuchMethodException {
        MDC.put(CorrelationIdFilter.CORRELATION_ID_MDC_KEY, CORRELATION_ID);
        BeanPropertyBindingResult bindingResult = new BeanPropertyBindingResult(new TestRequest(), "request");
        bindingResult.addError(new FieldError("request", "email", "must be a valid email"));
        bindingResult.addError(new ObjectError("request", "request is invalid"));
        Method method = GlobalExceptionHandlerTest.class.getDeclaredMethod("validate", TestRequest.class);

        var response = handler.handleValidationExceptions(
                new MethodArgumentNotValidException(new MethodParameter(method, 0), bindingResult)
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        ApiResponse<Map<String, String>> body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.isSuccess()).isFalse();
        assertThat(body.getMessage())
                .contains("VALIDATION_ERROR")
                .contains(CORRELATION_ID)
                .doesNotContain("must be a valid email");
        assertThat(body.getData())
                .containsEntry("email", "must be a valid email")
                .containsEntry("request", "request is invalid");
    }

    @SuppressWarnings("unused")
    private void validate(TestRequest request) {
    }

    private record TestRequest() {
    }

    private static class TestDomainException extends BaseException {
        TestDomainException(String message) {
            super(message, "RESOURCE_NOT_FOUND", HttpStatus.NOT_FOUND);
        }
    }
}
