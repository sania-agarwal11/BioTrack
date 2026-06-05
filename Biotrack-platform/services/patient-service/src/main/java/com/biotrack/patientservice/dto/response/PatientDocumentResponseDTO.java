package com.biotrack.patientservice.dto.response;

public class PatientDocumentResponseDTO {

    private Long documentId;
    private String fileName;
    private String contentType;
    private String uploadedAt;

    public PatientDocumentResponseDTO() {
    }

    public PatientDocumentResponseDTO(Long documentId, String fileName, String contentType, String uploadedAt) {
        this.documentId = documentId;
        this.fileName = fileName;
        this.contentType = contentType;
        this.uploadedAt = uploadedAt;
    }

    public Long getDocumentId() {
        return documentId;
    }

    public void setDocumentId(Long documentId) {
        this.documentId = documentId;
    }

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public String getContentType() {
        return contentType;
    }

    public void setContentType(String contentType) {
        this.contentType = contentType;
    }

    public String getUploadedAt() {
        return uploadedAt;
    }

    public void setUploadedAt(String uploadedAt) {
        this.uploadedAt = uploadedAt;
    }
}
