package com.biotrack.protocolservice.exception;

public class SiteNotFoundException extends RuntimeException {
    public SiteNotFoundException(Long id) {
        super("Site not found with ID: " + id);
    }
}
