import { renderEmailLayout } from "./layout";

export function renderWelcomeEmail(name: string): string {
  const companyName = process.env.COMPANY_NAME || "Company";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${process.env.COMPANY_DOMAIN || "example.com"}`;
  
  const content = `
    <h2 style="margin: 0 0 24px 0; color: #09090b; font-size: 20px; font-weight: 600;">Welcome to ${companyName}!</h2>
    <p style="margin: 0 0 16px 0; color: #52525b; font-size: 16px; line-height: 24px;">
      Hi <strong style="color: #09090b;">${name}</strong>,
    </p>
    <p style="margin: 0 0 24px 0; color: #52525b; font-size: 16px; line-height: 24px;">
      We are thrilled to have you on board. Your account has been successfully created, and you are now ready to explore our platform and its features.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom: 24px;">
      <tr>
        <td align="center">
          <a href="${appUrl}" style="display: inline-block; background-color: #09090b; color: #ffffff; font-size: 16px; font-weight: 500; text-decoration: none; padding: 14px 28px; border-radius: 6px;">
            Get Started Now
          </a>
        </td>
      </tr>
    </table>
    <p style="margin: 0; color: #71717a; font-size: 14px; line-height: 24px;">
      If you have any questions or need assistance, feel free to reach out to our support team. We're here to help!
    </p>
  `;
  return renderEmailLayout(`Welcome to ${companyName}!`, content);
}
