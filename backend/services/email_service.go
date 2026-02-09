package services

import (
	"bytes"
	"fmt"
	"html/template"
	"net/smtp"
	"os"
	"time"

	"github.com/google/uuid"
)

// EmailConfig holds email service configuration
type EmailConfig struct {
	Provider   string // "smtp", "console", "mock"
	SMTPHost   string
	SMTPPort   string
	SMTPUser   string
	SMTPPass   string
	FromEmail  string
	FromName   string
	AppBaseURL string // Frontend URL for links
}

// EmailService handles email sending operations
type EmailService struct {
	config EmailConfig
}

// NewEmailService creates a new email service instance
func NewEmailService() *EmailService {
	config := EmailConfig{
		Provider:   getEnvOrDefault("EMAIL_PROVIDER", "console"),
		SMTPHost:   getEnvOrDefault("SMTP_HOST", "localhost"),
		SMTPPort:   getEnvOrDefault("SMTP_PORT", "587"),
		SMTPUser:   os.Getenv("SMTP_USER"),
		SMTPPass:   os.Getenv("SMTP_PASS"),
		FromEmail:  getEnvOrDefault("FROM_EMAIL", "noreply@insightengine.local"),
		FromName:   getEnvOrDefault("FROM_NAME", "InsightEngine"),
		AppBaseURL: getEnvOrDefault("APP_BASE_URL", "http://localhost:3000"),
	}

	return &EmailService{config: config}
}

// GetProvider returns the configured email provider
func (s *EmailService) GetProvider() string {
	return s.config.Provider
}

// getEnvOrDefault returns environment variable or default value
func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// GenerateVerificationToken creates a cryptographically secure verification token
func (s *EmailService) GenerateVerificationToken() string {
	return uuid.New().String()
}

// SendVerificationEmail sends email verification email to user
func (s *EmailService) SendVerificationEmail(toEmail, toName, token string) error {
	verificationURL := fmt.Sprintf("%s/auth/verify-email?token=%s", s.config.AppBaseURL, token)

	subject := "Verify Your Email - InsightEngine"
	body := s.buildVerificationEmail(toName, verificationURL)

	return s.sendEmail(toEmail, subject, body)
}

// buildVerificationEmail creates HTML email content
func (s *EmailService) buildVerificationEmail(userName, verificationURL string) string {
	emailTemplate := `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 32px;
            font-weight: bold;
            color: #4F46E5;
            margin-bottom: 10px;
        }
        h1 {
            color: #1a1a1a;
            font-size: 24px;
            margin-bottom: 20px;
        }
        .button {
            display: inline-block;
            background-color: #4F46E5;
            color: #ffffff;
            text-decoration: none;
            padding: 12px 30px;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
        }
        .button:hover {
            background-color: #4338ca;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e5e5;
            text-align: center;
            color: #666;
            font-size: 14px;
        }
        .expires {
            color: #dc2626;
            font-size: 14px;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">InsightEngine</div>
        </div>
        
        <h1>Welcome, {{.UserName}}!</h1>
        
        <p>Thank you for creating an account with InsightEngine. To complete your registration and start using our AI-powered analytics platform, please verify your email address.</p>
        
        <div style="text-align: center;">
            <a href="{{.VerificationURL}}" class="button">Verify Email Address</a>
        </div>
        
        <p style="margin-top: 20px;">Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #4F46E5;">{{.VerificationURL}}</p>
        
        <p class="expires">
            <strong>Note:</strong> This verification link will expire in 24 hours.
        </p>
        
        <div class="footer">
            <p>If you didn't create an account with InsightEngine, you can safely ignore this email.</p>
            <p style="margin-top: 10px;">&copy; 2026 InsightEngine. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`

	type TemplateData struct {
		UserName        string
		VerificationURL string
	}

	data := TemplateData{
		UserName:        userName,
		VerificationURL: verificationURL,
	}

	tmpl, err := template.New("verification").Parse(emailTemplate)
	if err != nil {
		// Fallback to simple text if template parsing fails
		return s.buildSimpleVerificationEmail(userName, verificationURL)
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		return s.buildSimpleVerificationEmail(userName, verificationURL)
	}

	return buf.String()
}

// buildSimpleVerificationEmail creates plain text fallback email
func (s *EmailService) buildSimpleVerificationEmail(userName, verificationURL string) string {
	return fmt.Sprintf(`Welcome to InsightEngine!

Hi %s,

Thank you for creating an account. Please verify your email address by clicking the link below:

%s

This link will expire in 24 hours.

If you didn't create an account, you can safely ignore this email.

Best regards,
The InsightEngine Team`, userName, verificationURL)
}

// sendEmail sends email based on configured provider
func (s *EmailService) sendEmail(toEmail, subject, body string) error {
	switch s.config.Provider {
	case "smtp":
		return s.sendViaSMTP(toEmail, subject, body)
	case "console", "mock":
		return s.sendViaConsole(toEmail, subject, body)
	default:
		return s.sendViaConsole(toEmail, subject, body)
	}
}

// sendViaSMTP sends email using SMTP
func (s *EmailService) sendViaSMTP(toEmail, subject, body string) error {
	from := fmt.Sprintf("%s <%s>", s.config.FromName, s.config.FromEmail)

	// Construct headers
	headers := make(map[string]string)
	headers["From"] = from
	headers["To"] = toEmail
	headers["Subject"] = subject
	headers["MIME-Version"] = "1.0"
	headers["Content-Type"] = "text/html; charset=UTF-8"

	// Build message
	var message bytes.Buffer
	for k, v := range headers {
		message.WriteString(fmt.Sprintf("%s: %s\r\n", k, v))
	}
	message.WriteString("\r\n")
	message.WriteString(body)

	// Authentication
	auth := smtp.PlainAuth("", s.config.SMTPUser, s.config.SMTPPass, s.config.SMTPHost)

	// Send email
	addr := fmt.Sprintf("%s:%s", s.config.SMTPHost, s.config.SMTPPort)
	err := smtp.SendMail(addr, auth, s.config.FromEmail, []string{toEmail}, message.Bytes())
	if err != nil {
		return fmt.Errorf("failed to send email via SMTP: %w", err)
	}

	return nil
}

// sendViaConsole logs email to console (for development)
func (s *EmailService) sendViaConsole(toEmail, subject, body string) error {
	LogInfo("email_console_mode", "Email sent via console (dev mode)", map[string]interface{}{
		"to":      toEmail,
		"from":    fmt.Sprintf("%s <%s>", s.config.FromName, s.config.FromEmail),
		"subject": subject,
		"body":    body,
	})
	return nil
}

// GetVerificationExpiry returns the expiration time for verification tokens
func (s *EmailService) GetVerificationExpiry() time.Time {
	return time.Now().Add(24 * time.Hour) // 24 hours expiration
}

// SendPasswordResetEmail sends password reset email to user
func (s *EmailService) SendPasswordResetEmail(toEmail, toName, token string) error {
	resetURL := fmt.Sprintf("%s/auth/reset-password?token=%s", s.config.AppBaseURL, token)

	subject := "Reset Your Password - InsightEngine"
	body := s.buildPasswordResetEmail(toName, resetURL)

	return s.sendEmail(toEmail, subject, body)
}

// buildPasswordResetEmail creates HTML email content for password reset
func (s *EmailService) buildPasswordResetEmail(userName, resetURL string) string {
	emailTemplate := `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 32px;
            font-weight: bold;
            color: #4F46E5;
            margin-bottom: 10px;
        }
        h1 {
            color: #1a1a1a;
            font-size: 24px;
            margin-bottom: 20px;
        }
        .button {
            display: inline-block;
            background-color: #4F46E5;
            color: #ffffff;
            text-decoration: none;
            padding: 12px 30px;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
        }
        .button:hover {
            background-color: #4338ca;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e5e5;
            text-align: center;
            color: #666;
            font-size: 14px;
        }
        .expires {
            color: #dc2626;
            font-size: 14px;
            margin-top: 20px;
        }
        .warning {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 12px;
            margin: 20px 0;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">InsightEngine</div>
        </div>
        
        <h1>Password Reset Request</h1>
        
        <p>Hi {{.UserName}},</p>
        
        <p>We received a request to reset your password for your InsightEngine account. If you made this request, click the button below to reset your password:</p>
        
        <div style="text-align: center;">
            <a href="{{.ResetURL}}" class="button">Reset Password</a>
        </div>
        
        <p style="margin-top: 20px;">Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #4F46E5;">{{.ResetURL}}</p>
        
        <div class="warning">
            <strong>Security Notice:</strong> This link will expire in 1 hour. If you didn't request a password reset, please ignore this email or contact support if you have concerns.
        </div>
        
        <div class="footer">
            <p>If you didn't request a password reset, you can safely ignore this email.</p>
            <p style="margin-top: 10px;">&copy; 2026 InsightEngine. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`

	type TemplateData struct {
		UserName string
		ResetURL string
	}

	data := TemplateData{
		UserName: userName,
		ResetURL: resetURL,
	}

	tmpl, err := template.New("password-reset").Parse(emailTemplate)
	if err != nil {
		// Fallback to simple text if template parsing fails
		return s.buildSimplePasswordResetEmail(userName, resetURL)
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		return s.buildSimplePasswordResetEmail(userName, resetURL)
	}

	return buf.String()
}

// buildSimplePasswordResetEmail creates plain text fallback email
func (s *EmailService) buildSimplePasswordResetEmail(userName, resetURL string) string {
	return fmt.Sprintf(`Password Reset Request - InsightEngine

Hi %s,

We received a request to reset your password. If you made this request, click the link below:

%s

This link will expire in 1 hour.

If you didn't request a password reset, please ignore this email.

Best regards,
The InsightEngine Team`, userName, resetURL)
}

// GetPasswordResetExpiry returns the expiration time for password reset tokens
func (s *EmailService) GetPasswordResetExpiry() time.Time {
	return time.Now().Add(1 * time.Hour) // 1 hour expiration
}
