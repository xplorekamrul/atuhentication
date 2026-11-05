import { renderEmailLayout } from "./layout";

export function renderStatusUpdateEmail(name: string, status: string): string {
  const isSuspended = status === "SUSPENDED" || status === "INACTIVE";
  
  const content = `
    <h2 style="margin: 0 0 24px 0; color: #09090b; font-size: 20px; font-weight: 600;">Account Status Update</h2>
    <p style="margin: 0 0 16px 0; color: #52525b; font-size: 16px; line-height: 24px;">
      Hi <strong style="color: #09090b;">${name}</strong>,
    </p>
    <p style="margin: 0 0 24px 0; color: #52525b; font-size: 16px; line-height: 24px;">
      An administrator has updated the status of your account. Your account is now marked as:
    </p>
    <div style="background-color: ${isSuspended ? '#fef2f2' : '#f0fdf4'}; border: 1px solid ${isSuspended ? '#fee2e2' : '#dcfce3'}; border-radius: 8px; padding: 16px; text-align: center; margin-bottom: 24px;">
      <span style="color: ${isSuspended ? '#991b1b' : '#166534'}; font-size: 18px; font-weight: 600; letter-spacing: 1px;">
        ${status.toUpperCase()}
      </span>
    </div>
    <p style="margin: 0; color: #71717a; font-size: 14px; line-height: 24px;">
      If you believe this was a mistake or if you have any questions, please contact our support team.
    </p>
  `;
  return renderEmailLayout("Account Status Update", content);
}
