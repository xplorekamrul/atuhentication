import { renderEmailLayout } from "./layout";

export function renderPasswordChangedEmail(name: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${process.env.COMPANY_DOMAIN || "example.com"}`;
  
  const content = `
    <h2 style="margin: 0 0 24px 0; color: #09090b; font-size: 20px; font-weight: 600;">Password Changed Successfully</h2>
    <p style="margin: 0 0 16px 0; color: #52525b; font-size: 16px; line-height: 24px;">
      Hi <strong style="color: #09090b;">${name}</strong>,
    </p>
    <p style="margin: 0 0 24px 0; color: #52525b; font-size: 16px; line-height: 24px;">
      This email is to confirm that the password for your account has been successfully changed.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom: 24px;">
      <tr>
        <td align="center">
          <a href="${appUrl}/login" style="display: inline-block; background-color: #09090b; color: #ffffff; font-size: 16px; font-weight: 500; text-decoration: none; padding: 14px 28px; border-radius: 6px;">
            Log In Now
          </a>
        </td>
      </tr>
    </table>
    <p style="margin: 0; color: #71717a; font-size: 14px; line-height: 24px;">
      <strong style="color: #09090b;">If you did not request this change</strong>, please reply to this email or contact support immediately to secure your account.
    </p>
  `;
  return renderEmailLayout("Your Password Has Been Changed", content);
}
