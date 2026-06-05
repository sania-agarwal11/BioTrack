package com.biotrack.iamservice.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.io.UnsupportedEncodingException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class OtpService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${otp.expiry-minutes:10}")
    private int expiryMinutes;

    // email → OtpEntry (otp + expiry)
    private final Map<String, OtpEntry> otpStore = new ConcurrentHashMap<>();

    public OtpService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    // ── Generate and send OTP ──────────────────────────────────────────────────

    public void sendOtp(String toEmail, String userName) {
        String otp = generateOtp();
        LocalDateTime expiry = LocalDateTime.now().plusMinutes(expiryMinutes);
        otpStore.put(toEmail.toLowerCase(), new OtpEntry(otp, expiry));
        try {
            sendEmail(toEmail, userName, otp);
        } catch (MessagingException | UnsupportedEncodingException e) {
            otpStore.remove(toEmail.toLowerCase()); // rollback — don't store OTP if email failed
            throw new RuntimeException("Failed to send OTP email to " + toEmail + ": " + e.getMessage(), e);
        }
    }

    // ── Verify OTP (consuming — removes after success) ────────────────────────

    public boolean verifyOtp(String email, String otp) {
        OtpEntry entry = otpStore.get(email.toLowerCase());
        if (entry == null) return false;
        if (LocalDateTime.now().isAfter(entry.expiry())) {
            otpStore.remove(email.toLowerCase());
            return false;
        }
        if (!entry.otp().equals(otp)) return false;
        otpStore.remove(email.toLowerCase()); // one-time use
        return true;
    }

    // ── Peek OTP (non-consuming — only checks validity) ───────────────────────

    public boolean peekOtp(String email, String otp) {
        OtpEntry entry = otpStore.get(email.toLowerCase());
        if (entry == null) return false;
        if (LocalDateTime.now().isAfter(entry.expiry())) {
            otpStore.remove(email.toLowerCase());
            return false;
        }
        return entry.otp().equals(otp);
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private String generateOtp() {
        SecureRandom random = new SecureRandom();
        int code = 100000 + random.nextInt(900000); // always 6 digits
        return String.valueOf(code);
    }

    private void sendEmail(String toEmail, String userName, String otp)
            throws MessagingException, UnsupportedEncodingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        helper.setFrom(fromEmail, "BioTrack Platform");
        helper.setTo(toEmail);
        helper.setSubject("Your BioTrack Password Reset OTP");

        String html = buildEmailHtml(userName, otp, expiryMinutes);
        helper.setText(html, true);

        mailSender.send(message);
    }

    private String buildEmailHtml(String userName, String otp, int expiryMinutes) {
        return """
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="UTF-8"/>
                  <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; background:#f1f5f9; margin:0; padding:20px; }
                    .container { max-width:520px; margin:0 auto; background:#ffffff; border-radius:12px;
                                 overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.1); }
                    .header { background:linear-gradient(135deg,#1a56db,#1e429f); padding:32px 40px; text-align:center; }
                    .header h1 { color:#ffffff; margin:0; font-size:26px; letter-spacing:-0.5px; }
                    .header p  { color:rgba(255,255,255,0.8); margin:6px 0 0; font-size:13px; }
                    .body { padding:36px 40px; }
                    .body h2 { color:#1e293b; font-size:18px; margin:0 0 12px; }
                    .body p  { color:#475569; font-size:14px; line-height:1.7; margin:0 0 16px; }
                    .otp-box { background:#eff6ff; border:2px dashed #93c5fd; border-radius:10px;
                               text-align:center; padding:24px; margin:24px 0; }
                    .otp-box .otp { font-size:40px; font-weight:800; letter-spacing:12px;
                                    color:#1a56db; font-family:monospace; }
                    .otp-box .expiry { font-size:12px; color:#64748b; margin-top:8px; }
                    .warning { background:#fff7ed; border-left:4px solid #f97316; padding:12px 16px;
                               border-radius:6px; font-size:13px; color:#7c2d12; margin-top:8px; }
                    .footer { background:#f8fafc; padding:20px 40px; text-align:center;
                              border-top:1px solid #e2e8f0; font-size:12px; color:#94a3b8; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h1>🧬 BioTrack</h1>
                      <p>Clinical Research &amp; Laboratory Platform</p>
                    </div>
                    <div class="body">
                      <h2>Password Reset Request</h2>
                      <p>Hello <strong>%s</strong>,</p>
                      <p>We received a request to reset the password for your BioTrack account.
                         Use the OTP below to proceed. This code is valid for <strong>%d minutes</strong>.</p>
                      <div class="otp-box">
                        <div class="otp">%s</div>
                        <div class="expiry">⏱ Expires in %d minutes</div>
                      </div>
                      <p>Enter this OTP on the password reset page to set your new password.</p>
                      <div class="warning">
                        ⚠️ <strong>Security Notice:</strong> If you did not request this password reset,
                        please ignore this email or contact your administrator immediately.
                        Do not share this OTP with anyone.
                      </div>
                    </div>
                    <div class="footer">
                      This is an automated message from BioTrack Platform.<br/>
                      Please do not reply to this email.
                    </div>
                  </div>
                </body>
                </html>
                """.formatted(userName, expiryMinutes, otp, expiryMinutes);
    }

    // ── Inner record ───────────────────────────────────────────────────────────

    private record OtpEntry(String otp, LocalDateTime expiry) {}
}
