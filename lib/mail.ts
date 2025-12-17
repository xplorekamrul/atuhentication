import nodemailer from "nodemailer";

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
} = process.env;

export const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT ?? 587),
  secure: (SMTP_SECURE ?? "false") === "true",
  auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
});

export async function sendOtpMail(to: string, otp: string) {
  const from = SMTP_FROM || "no-reply@example.com";
  const html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto; line-height:1.6">
      <h2>Password Reset Code</h2>
      <p>Your one-time code is:</p>
      <p style="font-size: 22px; letter-spacing: 6px; font-weight: 700;">${otp}</p>
      <p>This code expires in ${process.env.RESET_TOKEN_TTL_MIN ?? 15} minutes.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    </div>
  `;
  await transporter.sendMail({
    to,
    from,
    subject: "Your password reset code",
    html,
  });
}
