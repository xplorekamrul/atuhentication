export function renderEmailLayout(title: string, contentHtml: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; color: #18181b;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f4f4f5; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
              <!-- Header -->
              <tr>
                <td style="padding: 32px 40px; background-color: #09090b; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">${process.env.COMPANY_NAME || "Company"}</h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  ${contentHtml}
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 32px 40px; background-color: #fafafa; border-top: 1px solid #e4e4e7; text-align: center;">
                  <p style="margin: 0 0 8px 0; color: #71717a; font-size: 14px;">
                    © ${new Date().getFullYear()} ${process.env.COMPANY_DOMAIN || "example.com"}. All rights reserved.
                  </p>
                  <p style="margin: 0; color: #a1a1aa; font-size: 12px;">
                    This email was sent by ${process.env.COMPANY_NAME || "Company"}. Please do not reply directly to this email.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}
