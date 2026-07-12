import { Resend } from "resend";
import { SITE_NAME } from "@/lib/brand";
import { SITE_URL } from "@/lib/constants";
import { buildPasswordResetUrl } from "@/lib/password-reset";

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

function getFromAddress(): string {
  return (
    process.env.EMAIL_FROM || `${SITE_NAME} <noreply@wealthcircle.info>`
  );
}

export async function sendPasswordResetEmail(input: {
  to: string;
  fullName: string;
  token: string;
}) {
  const resetUrl = buildPasswordResetUrl(input.token, SITE_URL);
  const resend = getResendClient();

  const { error } = await resend.emails.send({
    from: getFromAddress(),
    to: input.to,
    subject: `Reset your ${SITE_NAME} password`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; color: #0f172a;">
        <p style="font-size: 14px; color: #64748b;">${SITE_NAME}</p>
        <h1 style="font-size: 24px; font-weight: 600; margin: 0 0 16px;">Reset your password</h1>
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">
          Hi ${input.fullName},
        </p>
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">
          We received a request to reset the password for your ${SITE_NAME} account.
          Click the button below to choose a new password. This link expires in 1 hour.
        </p>
        <p style="margin: 28px 0;">
          <a href="${resetUrl}" style="display: inline-block; background: #0f172a; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-size: 14px; font-weight: 600;">
            Reset password
          </a>
        </p>
        <p style="font-size: 13px; line-height: 1.6; color: #64748b;">
          If you did not request this, you can ignore this email. Your password will stay the same.
        </p>
        <p style="font-size: 12px; line-height: 1.6; color: #94a3b8; word-break: break-all;">
          Or copy this link: ${resetUrl}
        </p>
      </div>
    `,
  });

  if (error) {
    throw new Error(error.message);
  }
}
