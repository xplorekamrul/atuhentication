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


function wrapHtml(title: string, body: string) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
        .footer { font-size: 12px; color: #999; text-align: center; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px; }
        .button { display: inline-block; background-color: #0070f3; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>${title}</h2>
        </div>
        <div>
          ${body}
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} RareviewIt.com. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function sendOtpMail(to: string, otp: string) {
  const from = process.env.SMTP_FROM || "no-reply@example.com";
  const body = `
    <p>Your one-time code is:</p>
    <p style="font-size: 24px; letter-spacing: 5px; font-weight: bold; color: #0070f3;">${otp}</p>
    <p>This code expires in ${process.env.RESET_TOKEN_TTL_MIN ?? 15} minutes.</p>
    <p>If you didn't request this, you can safely ignore this email.</p>
  `;

  await transporter.sendMail({
    to,
    from,
    subject: "Your password reset code",
    html: wrapHtml("Password Reset", body),
  });
}

export async function sendWelcomeEmail(to: string, name: string) {
  const from = process.env.SMTP_FROM || "no-reply@example.com";
  const body = `
    <p>Hi <strong>${name}</strong>,</p>
    <p>Welcome to RareviewIt.com! We are excited to have you on board.</p>
    <p>Your account has been successfully created. You can now explore our platform.</p>
  `;

  await transporter.sendMail({
    to,
    from,
    subject: "Welcome to RareviewIt.com!",
    html: wrapHtml("Welcome Aboard!", body),
  });
}

export async function sendLoginAlertEmail(to: string, name: string, time: string) {
  const from = process.env.SMTP_FROM || "no-reply@example.com";
  const body = `
    <p>Hi <strong>${name}</strong>,</p>
    <p>We noticed a new login to your account.</p>
    <p><strong>Time:</strong> ${time}</p>
    <p>If this was you, you can safely ignore this email. If not, please reset your password immediately.</p>
  `;

  await transporter.sendMail({
    to,
    from,
    subject: "New Login into your account",
    html: wrapHtml("Login Alert", body),
  });
}

