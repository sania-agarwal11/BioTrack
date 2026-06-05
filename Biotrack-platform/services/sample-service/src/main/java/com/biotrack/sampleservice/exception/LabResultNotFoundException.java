package com.biotrack.sampleservice.exception;

public class LabResultNotFoundException extends RuntimeException {
    public LabResultNotFoundException(String message) {
        super(message);
    }
}