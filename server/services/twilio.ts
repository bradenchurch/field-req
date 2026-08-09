import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

// Only initialize if we have credentials
export const client = (accountSid && authToken) ? twilio(accountSid, authToken) : null;

export async function sendSMS(to: string, body: string): Promise<boolean> {
  if (!client || !twilioNumber) {
    console.warn(`[TWILIO MOCK] SMS to ${to}: ${body}`);
    return true; // fail gracefully if not configured
  }
  try {
    await client.messages.create({
      body,
      from: twilioNumber,
      to,
    });
    return true;
  } catch (error) {
    console.error(`Twilio Error sending to ${to}:`, error);
    return false;
  }
}