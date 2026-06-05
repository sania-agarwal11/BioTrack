package com.biotrack.iamservice.service;

import com.biotrack.iamservice.dto.response.UserResponseDTO;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class RegistrationEmailService {

    private static final Logger log = LoggerFactory.getLogger(RegistrationEmailService.class);

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String senderEmail;

    @Value("${admin.email:#{null}}")
    private String adminEmail;

    public RegistrationEmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    // ── Notify admin when someone self-registers ──────────────────────────────

    public void sendAdminApprovalRequest(UserResponseDTO user) {
        String to = (adminEmail != null && !adminEmail.isBlank()) ? adminEmail : senderEmail;
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(senderEmail, "BioTrack Platform");
            helper.setTo(to);
            helper.setSubject("[BioTrack] New Registration Request — Approval Required");
            helper.setText(buildAdminHtml(user), true);
            mailSender.send(message);
            log.info("Admin approval-request email sent to {}", to);
        } catch (Exception e) {
            log.warn("Failed to send admin approval-request email: {}", e.getMessage(), e);
        }
    }

    // ── Notify user their account was approved ────────────────────────────────

    public void sendApprovalEmail(String toEmail, String userName) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(senderEmail, "BioTrack Platform");
            helper.setTo(toEmail);
            helper.setSubject("[BioTrack] Your Account Has Been Approved");
            helper.setText(buildApprovalHtml(userName), true);
            mailSender.send(message);
            log.info("Approval email sent to {}", toEmail);
        } catch (Exception e) {
            log.warn("Failed to send approval email to {}: {}", toEmail, e.getMessage(), e);
        }
    }

    // ── Notify user their account was rejected ────────────────────────────────

    public void sendRejectionEmail(String toEmail, String userName) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(senderEmail, "BioTrack Platform");
            helper.setTo(toEmail);
            helper.setSubject("[BioTrack] Account Registration Update");
            helper.setText(buildRejectionHtml(userName), true);
            mailSender.send(message);
            log.info("Rejection email sent to {}", toEmail);
        } catch (Exception e) {
            log.warn("Failed to send rejection email to {}: {}", toEmail, e.getMessage(), e);
        }
    }

    // ── HTML templates ────────────────────────────────────────────────────────

    private String buildAdminHtml(UserResponseDTO user) {
        String roleName = user.getRole() != null ? user.getRole().toString().replace("_", " ") : "—";
        String phone    = user.getPhone() != null && !user.getPhone().isBlank() ? user.getPhone() : "—";
        return "<!DOCTYPE html><html><head><meta charset='UTF-8'/></head><body style='font-family:Arial,sans-serif;background:#f1f5f9;padding:20px;'>"
             + "<div style='max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);'>"
             + "<div style='background:linear-gradient(135deg,#1a56db,#1e429f);padding:28px 36px;text-align:center;'>"
             + "<h1 style='color:#fff;margin:0;font-size:22px;'>BioTrack Platform</h1>"
             + "<p style='color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px;'>Clinical Research &amp; Laboratory Platform</p>"
             + "</div>"
             + "<div style='padding:28px 36px;'>"
             + "<h2 style='color:#1e293b;font-size:17px;margin:0 0 10px;'>New Registration Request</h2>"
             + "<p style='color:#475569;font-size:14px;line-height:1.7;'>A new user has registered and is awaiting your approval.</p>"
             + "<table style='width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;'>"
             + "<tr style='background:#f8fafc;'><td style='padding:8px 12px;font-weight:600;color:#64748b;width:120px;'>Name</td><td style='padding:8px 12px;color:#1e293b;'>" + escHtml(user.getName()) + "</td></tr>"
             + "<tr><td style='padding:8px 12px;font-weight:600;color:#64748b;'>Email</td><td style='padding:8px 12px;color:#1e293b;'>" + escHtml(user.getEmail()) + "</td></tr>"
             + "<tr style='background:#f8fafc;'><td style='padding:8px 12px;font-weight:600;color:#64748b;'>Phone</td><td style='padding:8px 12px;color:#1e293b;'>" + escHtml(phone) + "</td></tr>"
             + "<tr><td style='padding:8px 12px;font-weight:600;color:#64748b;'>Role</td><td style='padding:8px 12px;color:#1e293b;'>" + escHtml(roleName) + "</td></tr>"
             + "<tr style='background:#fffbeb;'><td style='padding:8px 12px;font-weight:600;color:#64748b;'>Status</td><td style='padding:8px 12px;'><span style='background:#fef3c7;color:#92400e;padding:2px 10px;border-radius:20px;font-size:12px;font-weight:600;'>PENDING APPROVAL</span></td></tr>"
             + "</table>"
             + "<p style='color:#475569;font-size:13px;'>Please log in to the <strong>BioTrack Admin panel &rarr; User Management</strong> to approve or reject this request.</p>"
             + "</div>"
             + "<div style='background:#f8fafc;padding:14px 36px;text-align:center;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;'>BioTrack Platform &mdash; Admin Notification</div>"
             + "</div></body></html>";
    }

    private String buildApprovalHtml(String userName) {
        return "<!DOCTYPE html><html><head><meta charset='UTF-8'/></head><body style='font-family:Arial,sans-serif;background:#f1f5f9;padding:20px;'>"
             + "<div style='max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);'>"
             + "<div style='background:linear-gradient(135deg,#059669,#047857);padding:28px 36px;text-align:center;'>"
             + "<h1 style='color:#fff;margin:0;font-size:22px;'>BioTrack Platform</h1>"
             + "<p style='color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px;'>Clinical Research &amp; Laboratory Platform</p>"
             + "</div>"
             + "<div style='padding:28px 36px;'>"
             + "<h2 style='color:#1e293b;font-size:17px;margin:0 0 10px;'>Account Approved!</h2>"
             + "<p style='color:#475569;font-size:14px;line-height:1.7;'>Hello <strong>" + escHtml(userName) + "</strong>,</p>"
             + "<p style='color:#475569;font-size:14px;line-height:1.7;'>Your BioTrack account registration has been <strong>approved</strong> by an administrator.</p>"
             + "<div style='background:#ecfdf5;border:1px solid #6ee7b7;border-radius:8px;padding:20px;text-align:center;margin:20px 0;'>"
             + "<p style='color:#065f46;font-weight:600;font-size:15px;margin:0;'>Your account is now active. You can sign in now!</p>"
             + "</div>"
             + "<p style='color:#475569;font-size:14px;line-height:1.7;'>Visit the BioTrack platform and sign in using your registered email and password to get started.</p>"
             + "</div>"
             + "<div style='background:#f8fafc;padding:14px 36px;text-align:center;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;'>This is an automated message from BioTrack. Please do not reply.</div>"
             + "</div></body></html>";
    }

    private String buildRejectionHtml(String userName) {
        return "<!DOCTYPE html><html><head><meta charset='UTF-8'/></head><body style='font-family:Arial,sans-serif;background:#f1f5f9;padding:20px;'>"
             + "<div style='max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);'>"
             + "<div style='background:linear-gradient(135deg,#dc2626,#b91c1c);padding:28px 36px;text-align:center;'>"
             + "<h1 style='color:#fff;margin:0;font-size:22px;'>BioTrack Platform</h1>"
             + "<p style='color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px;'>Clinical Research &amp; Laboratory Platform</p>"
             + "</div>"
             + "<div style='padding:28px 36px;'>"
             + "<h2 style='color:#1e293b;font-size:17px;margin:0 0 10px;'>Registration Not Approved</h2>"
             + "<p style='color:#475569;font-size:14px;line-height:1.7;'>Hello <strong>" + escHtml(userName) + "</strong>,</p>"
             + "<p style='color:#475569;font-size:14px;line-height:1.7;'>We regret to inform you that your BioTrack account registration has been <strong>reviewed and not approved</strong> at this time.</p>"
             + "<div style='background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px 18px;margin:16px 0;color:#7f1d1d;font-size:13px;'>"
             + "Your account request has been rejected by the platform administrator. If you believe this is a mistake, please contact your administrator directly."
             + "</div>"
             + "</div>"
             + "<div style='background:#f8fafc;padding:14px 36px;text-align:center;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;'>This is an automated message from BioTrack. Please do not reply.</div>"
             + "</div></body></html>";
    }

    /** Escape basic HTML special chars to prevent injection in user-provided values */
    private String escHtml(String s) {
        if (s == null) return "—";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}
