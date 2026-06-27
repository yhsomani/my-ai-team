package com.talentsphere.shared;

import com.talentsphere.contracts.ApiResponse;
import com.talentsphere.shared.config.CorrelationIdFilter;
import com.talentsphere.shared.exception.BaseException;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.validation.ObjectError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    private static final String VALIDATION_ERROR = "VALIDATION_ERROR";
    private static final String INVALID_REQUEST = "INVALID_REQUEST";
    private static final String ACCESS_DENIED = "ACCESS_DENIED";
    private static final String INTERNAL_ERROR = "INTERNAL_ERROR";
    private static final String UNKNOWN_CORRELATION_ID = "unavailable";

    @ExceptionHandler(BaseException.class)
    public ResponseEntity<ApiResponse<Void>> handleBaseException(BaseException e) {
        log.warn("Domain exception code={} correlationId={} message={}", e.getCode(), correlationId(), e.getMessage(), e);
        return ResponseEntity.status(e.getStatus())
                .body(ApiResponse.error(safeMessage("Request failed.", e.getCode())));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Map<String, String>>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach((error) -> {
            String fieldName = errorKey(error);
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });
        log.warn("Validation failed correlationId={} fields={}", correlationId(), errors.keySet());
        return ResponseEntity.badRequest()
                .body(ApiResponse.<Map<String, String>>builder()
                        .success(false)
                        .message(safeMessage("Validation failed for one or more fields.", VALIDATION_ERROR))
                        .data(errors)
                        .build());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalArgumentException(IllegalArgumentException e) {
        log.warn("Invalid request correlationId={} message={}", correlationId(), e.getMessage(), e);
        return ResponseEntity.badRequest()
                .body(ApiResponse.error(safeMessage("Invalid request.", INVALID_REQUEST)));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDenied(AccessDeniedException e) {
        log.warn("Access denied correlationId={} message={}", correlationId(), e.getMessage(), e);
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error(safeMessage("Access denied.", ACCESS_DENIED)));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGeneralException(Exception e) {
        log.error("Unhandled exception correlationId={}", correlationId(), e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error(safeMessage("Internal server error.", INTERNAL_ERROR)));
    }

    private String safeMessage(String summary, String code) {
        return "%s Code: %s. Correlation ID: %s.".formatted(summary, code, correlationId());
    }

    private String errorKey(ObjectError error) {
        return error instanceof FieldError fieldError ? fieldError.getField() : error.getObjectName();
    }

    private String correlationId() {
        String correlationId = MDC.get(CorrelationIdFilter.CORRELATION_ID_MDC_KEY);
        return correlationId == null || correlationId.isBlank() ? UNKNOWN_CORRELATION_ID : correlationId;
    }
}
