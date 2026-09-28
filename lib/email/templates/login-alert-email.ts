import { renderEmailLayout } from "./layout";

export function renderLoginAlertEmail(name: string, time: string): string {
  const content = `
    <h2 style="margin: 0 0 24px 0; color: #09090b; font-size: 20px; font-weight: 600;">Security Alert: New Login</h2>
    <p style="margin: 0 0 16px 0; color: #52525b; font-size: 16px; line-height: 24px;">
      Hi <strong style="color: #09090b;">${name}</strong>,
    </p>
    <p style="margin: 0 0 24px 0; color: #52525b; font-size: 16px; line-height: 24px;">
      We noticed a new login to your account. Here are the details of this session:
    </p>
    <div style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0; color: #991b1b; font-size: 15px; font-weight: 500;">
        <span style="display: inline-block; width: 60px;">Time:</span> ${time}
      </p>
    </div>
    <p style="margin: 0 0 24px 0; color: #52525b; font-size: 16px; line-height: 24px;">
      If this was you, you can safely ignore this email.
    </p>
    <p style="margin: 0; color: #71717a; font-size: 14px; line-height: 24px;">
      <strong style="color: #09090b;">If you didn't authorize this login</strong>, please log in immediately and change your password to secure your account.
    </p>
  `;
  return renderEmailLayout("New Login to Your Account", content);
}
