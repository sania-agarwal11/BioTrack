package com.biotrack.protocolservice.exception;

public class ProtocolNotFoundException extends RuntimeException {
    public ProtocolNotFoundException(Long id) {
        super("Protocol not found with ID: " + id);
    }
}