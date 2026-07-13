import { SITE_NAME } from "@/lib/brand";
import { SITE_URL } from "@/lib/constants";
import { formatPhoneForSmsApi } from "@/lib/phone";

const SMS_API_URL = "https://portal.nigeriabulksms.com/api/";

type SmsConfig = {
  username: string;
  password: string;
  sender: string;
};

function getSmsConfig(): SmsConfig | null {
  const username = process.env.NIGERIA_BULK_SMS_USERNAME?.trim();
  const password = process.env.NIGERIA_BULK_SMS_PASSWORD;
  const sender = process.env.NIGERIA_BULK_SMS_SENDER?.trim() || "wealthcircle";

  if (!username || !password) {
    return null;
  }

  return { username, password, sender };
}

type SendSmsInput = {
  mobiles: string[];
  message: string;
};

type SmsApiSuccess = {
  status: "OK";
  count: number;
  price: number;
};

type SmsApiError = {
  error: string;
  errno?: string;
};

export async function sendSms(input: SendSmsInput): Promise<void> {
  const config = getSmsConfig();
  if (!config) {
    return;
  }

  const mobiles = [...new Set(input.mobiles.filter(Boolean))];
  if (mobiles.length === 0 || !input.message.trim()) {
    return;
  }

  const params = new URLSearchParams({
    username: config.username,
    password: config.password,
    sender: config.sender,
    message: input.message.trim(),
    mobiles: mobiles.join(","),
  });

  const response = await fetch(`${SMS_API_URL}?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`SMS gateway HTTP ${response.status}`);
  }

  const body = (await response.json()) as SmsApiSuccess | SmsApiError;
  if ("error" in body && body.error) {
    throw new Error(body.error);
  }

  if (!("status" in body) || body.status !== "OK") {
    throw new Error("Unexpected SMS gateway response");
  }
}

export async function sendMergeNotificationSms(
  payer: { phone: string; fullName: string },
  parent: { phone: string; fullName: string }
): Promise<void> {
  const dashboardUrl = `${SITE_URL.replace(/\/$/, "")}/dashboard`;
  const message = `${SITE_NAME}: You have been merged. Please check your dashboard for next steps: ${dashboardUrl}`;

  const mobiles = [payer.phone, parent.phone]
    .map((phone) => formatPhoneForSmsApi(phone))
    .filter((phone): phone is string => phone !== null);

  await sendSms({ mobiles, message });
}
