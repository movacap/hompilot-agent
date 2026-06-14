import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

let _client: twilio.Twilio;

export function getTwilioClient(): twilio.Twilio {
  if (!_client) {
    _client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return _client;
}

export async function sendSMS(to: string, from: string, body: string): Promise<void> {
  const client = getTwilioClient();
  await client.messages.create({ to, from, body });
}

export function twimlResponse(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
