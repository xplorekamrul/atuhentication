import { renderEmailLayout } from "./layout";

export function renderOtpEmail(otp: string): string {
  const content = `
    <h2 style="margin: 0 0 24px 0; color: #09090b; font-size: 20px; font-weight: 600;">Password Reset Request</h2>
    <p style="margin: 0 0 24px 0; color: #52525b; font-size: 16px; line-height: 24px;">
      We received a request to reset your password. Enter the following code to continue:
    </p>
    <div style="background-color: #f4f4f5; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
      <span style="font-family: monospace; font-size: 32px; letter-spacing: 8px; font-weight: 700; color: #09090b;">${otp}</span>
    </div>
    <p style="margin: 0 0 24px 0; color: #52525b; font-size: 16px; line-height: 24px;">
      This code will expire in ${process.env.RESET_TOKEN_TTL_MIN ?? 15} minutes.
    </p>
    <p style="margin: 0; color: #71717a; font-size: 14px; line-height: 24px;">
      If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
    </p>
  `;
  return renderEmailLayout("Your Password Reset Code", content);
}
