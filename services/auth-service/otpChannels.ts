// Delivery of one-time codes over WhatsApp (Meta Cloud API) and SMS (MSG91).
// Email delivery stays in index.ts. Everything is configured through env vars so
// no secret ever lives in the repo:
//
//   WHATSAPP_ACCESS_TOKEN     permanent System User token (Meta Business Suite)
//   WHATSAPP_PHONE_NUMBER_ID  the sending number's Phone Number ID
//   WHATSAPP_TEMPLATE_NAME    approved template NAME (not its numeric ID)
//   WHATSAPP_TEMPLATE_LANG    template language code, default "en"
//   WHATSAPP_TEMPLATE_BUTTON  "true" (default) if it's an Authentication template
//                             with the copy-code button, "false" for body-only
//   WHATSAPP_API_VERSION      Graph API version, default "v21.0"
//   INTERAKT_API_KEY          optional: send via Interakt instead of/after Meta direct
//                             (needed when the number is managed through Interakt)
//   MSG91_AUTH_KEY / MSG91_TEMPLATE_ID   SMS OTP via MSG91 (DLT-approved template)

export type OtpChannel = 'email' | 'whatsapp' | 'sms';
export interface DeliveryResult { sent: boolean; reason?: string }

export function isOtpChannel(v: unknown): v is OtpChannel {
  return v === 'email' || v === 'whatsapp' || v === 'sms';
}

/** Digits-only international number; a bare 10-digit number is treated as Indian (+91). */
export function normalizePhone(raw: unknown): string | null {
  let d = String(raw ?? '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  if (d.length === 10) d = `91${d}`;
  return d.length >= 11 && d.length <= 15 ? d : null;
}

async function post(url: string, init: RequestInit, timeoutMs = 10000): Promise<Response> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctl.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Interakt public API - for numbers managed through Interakt (same approved template name). */
async function sendInteraktOtp(phone: string, code: string): Promise<DeliveryResult> {
  const key = process.env.INTERAKT_API_KEY;
  const template = process.env.WHATSAPP_TEMPLATE_NAME;
  if (!key || !template) return { sent: false, reason: 'Interakt is not configured (INTERAKT_API_KEY / WHATSAPP_TEMPLATE_NAME).' };
  // Interakt wants the country code and national number separately.
  const countryCode = `+${phone.slice(0, phone.length - 10)}`;
  const national = phone.slice(-10);
  const body: any = {
    countryCode,
    phoneNumber: national,
    type: 'Template',
    template: { name: template, languageCode: process.env.WHATSAPP_TEMPLATE_LANG || 'en_US', bodyValues: [code] },
  };
  if (process.env.WHATSAPP_TEMPLATE_BUTTON !== 'false') body.template.buttonValues = { '0': [code] };
  try {
    const r = await post('https://api.interakt.ai/v1/public/message/', {
      method: 'POST',
      headers: { Authorization: `Basic ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const j: any = await r.json().catch(() => ({}));
    if (r.ok && j?.result !== false) return { sent: true };
    return { sent: false, reason: `Interakt API ${r.status}: ${j?.message || 'request failed'}` };
  } catch (e: any) {
    return { sent: false, reason: `Interakt request failed: ${e?.message || e}` };
  }
}

/** WhatsApp OTP: Meta Cloud API directly; if that is refused and Interakt is configured, via Interakt. */
export async function sendWhatsAppOtp(phone: string, code: string): Promise<DeliveryResult> {
  const direct = await sendWhatsAppDirect(phone, code);
  if (direct.sent || !process.env.INTERAKT_API_KEY) return direct;
  console.warn(`[OTP] Meta direct send failed (${direct.reason}); trying Interakt`);
  const viaInterakt = await sendInteraktOtp(phone, code);
  return viaInterakt.sent ? viaInterakt : { sent: false, reason: `${direct.reason} | ${viaInterakt.reason}` };
}

async function sendWhatsAppDirect(phone: string, code: string): Promise<DeliveryResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const template = process.env.WHATSAPP_TEMPLATE_NAME;
  if (!token || !phoneId || !template) {
    return { sent: false, reason: 'WhatsApp is not configured (WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_TEMPLATE_NAME).' };
  }
  const components: any[] = [{ type: 'body', parameters: [{ type: 'text', text: code }] }];
  // Authentication templates carry the code in a copy-code button too.
  if (process.env.WHATSAPP_TEMPLATE_BUTTON !== 'false') {
    components.push({ type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: code }] });
  }
  try {
    const r = await post(`https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION || 'v21.0'}/${phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'template',
        template: { name: template, language: { code: process.env.WHATSAPP_TEMPLATE_LANG || 'en' }, components },
      }),
    });
    if (r.ok) return { sent: true };
    const body: any = await r.json().catch(() => ({}));
    return { sent: false, reason: `WhatsApp API ${r.status}: ${body?.error?.message || 'request failed'}` };
  } catch (e: any) {
    return { sent: false, reason: `WhatsApp request failed: ${e?.message || e}` };
  }
}

export async function sendSmsOtp(phone: string, code: string): Promise<DeliveryResult> {
  const authkey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;
  if (!authkey || !templateId) {
    return { sent: false, reason: 'SMS is not configured (MSG91_AUTH_KEY / MSG91_TEMPLATE_ID).' };
  }
  try {
    const url = `https://control.msg91.com/api/v5/otp?template_id=${encodeURIComponent(templateId)}&mobile=${phone}&otp=${code}`;
    const r = await post(url, { method: 'POST', headers: { authkey, 'Content-Type': 'application/json' }, body: '{}' });
    const body: any = await r.json().catch(() => ({}));
    if (r.ok && body?.type !== 'error') return { sent: true };
    return { sent: false, reason: `SMS API ${r.status}: ${body?.message || 'request failed'}` };
  } catch (e: any) {
    return { sent: false, reason: `SMS request failed: ${e?.message || e}` };
  }
}

// Codes cost money over WhatsApp/SMS, so allow one send per number per minute.
const lastSent = new Map<string, number>();
export function phoneCooldownLeft(phone: string, windowMs = 60_000): number {
  const left = (lastSent.get(phone) || 0) + windowMs - Date.now();
  return left > 0 ? Math.ceil(left / 1000) : 0;
}
export function markPhoneSent(phone: string): void {
  lastSent.set(phone, Date.now());
  if (lastSent.size > 5000) for (const [k, t] of lastSent) if (Date.now() - t > 120_000) lastSent.delete(k);
}
