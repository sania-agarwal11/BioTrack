package com.biotrack.iamservice.exception;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

/**
 * Centralised error handling for the IAM service.
 * Returns clean JSON { "message": "..." } instead of Spring's default
 * stack-trace HTML / 500 error body.
 *
 * NOTE: Do NOT add a catch-all Exception handler here — it would intercept
 * Spring Security's BadCredentialsException / LockedException thrown from
 * AuthController.login() and break the login flow.
 * Auth exceptions are handled directly in AuthController.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    /** User / resource not found (e.g. unknown ID) */
    @ExceptionHandler(IdNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleIdNotFound(IdNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("message", ex.getMessage()));
    }

    /** Validation errors — e.g. duplicate email on registration */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("message", ex.getMessage()));
    }

    /**
     * FK constraint or unique-key violation.
     * Thrown when trying to delete a user that is still referenced by
     * other tables (audit logs, notifications, etc.).
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, String>> handleDataIntegrity(DataIntegrityViolationException ex) {
        String rootMsg = ex.getRootCause() != null ? ex.getRootCause().getMessage() : ex.getMessage();
        String friendly;
        if (rootMsg != null && rootMsg.toLowerCase().contains("foreign key")) {
            friendly = "Cannot delete this user because they are still referenced by other records in the system (e.g. audit logs or linked data). Deactivate the user instead.";
        } else if (rootMsg != null && rootMsg.toLowerCase().contains("duplicate")) {
            friendly = "A user with that email address already exists.";
        } else {
            friendly = "Operation failed due to a data integrity constraint. " + rootMsg;
        }
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("message", friendly));
    }
}
