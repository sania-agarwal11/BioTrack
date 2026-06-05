package com.biotrack.sampleservice.exception;

public class SampleNotFoundException extends RuntimeException {
    public SampleNotFoundException(String message) {
        super(message);
    }
}
