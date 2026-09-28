import nodemailer from "nodemailer";
import { renderOtpEmail } from "./email/templates/otp-email";
import { renderWelcomeEmail } from "./email/templates/welcome-email";
import { renderLoginAlertEmail } from "./email/templates/login-alert-email";
import { renderStatusUpdateEmail } from "./email/templates/status-update-email";
import { renderPasswordChangedEmail } from "./email/templates/password-changed-email";

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
  COMPANY_NAME,
  COMPANY_DOMAIN,
} = process.env;

export const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT ?? 587),
  secure: (SMTP_SECURE ?? "false") === "true",
  auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
});

export async function sendOtpMail(to: string, otp: string) {
  const from = SMTP_FROM || `${COMPANY_NAME || "Company"} <no-reply@${COMPANY_DOMAIN || "example.com"}>`;
  
  await transporter.sendMail({
    to,
    from,
    subject: "Your password reset code",
    html: renderOtpEmail(otp),
  });
}

export async function sendWelcomeEmail(to: string, name: string) {
  const from = SMTP_FROM || `${COMPANY_NAME || "Company"} <no-reply@${COMPANY_DOMAIN || "example.com"}>`;
  const companyName = COMPANY_NAME || "Company";
  
  await transporter.sendMail({
    to,
    from,
    subject: `Welcome to ${companyName}!`,
    html: renderWelcomeEmail(name),
  });
}

export async function sendLoginAlertEmail(to: string, name: string, time: string) {
  const from = SMTP_FROM || `${COMPANY_NAME || "Company"} <no-reply@${COMPANY_DOMAIN || "example.com"}>`;
  
  await transporter.sendMail({
    to,
    from,
    subject: "Security Alert: New Login",
    html: renderLoginAlertEmail(name, time),
  });
}

export async function sendStatusUpdateEmail(to: string, name: string, status: string) {
  const from = SMTP_FROM || `${COMPANY_NAME || "Company"} <no-reply@${COMPANY_DOMAIN || "example.com"}>`;
  
  await transporter.sendMail({
    to,
    from,
    subject: "Account Status Update",
    html: renderStatusUpdateEmail(name, status),
  });
}

export async function sendPasswordChangedEmail(to: string, name: string) {
  const from = SMTP_FROM || `${COMPANY_NAME || "Company"} <no-reply@${COMPANY_DOMAIN || "example.com"}>`;
  
  await transporter.sendMail({
    to,
    from,
    subject: "Password Changed",
    html: renderPasswordChangedEmail(name),
  });
}
