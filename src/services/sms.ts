import twilio from 'twilio';

// Twilio auth supports two modes:
//  1. API Key auth (recommended): TWILIO_API_KEY_SID (SK... prefix) + TWILIO_API_KEY_SECRET + TWILIO_ACCOUNT_SID
//  2. Legacy credentials:         TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN
// API-key auth requires the account SID passed as an option (twilio-node throws
// "accountSid must start with AC" otherwise), so the account SID is mandatory
// for both modes.
const apiKeySid = process.env.TWILIO_API_KEY_SID;
const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
export const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

export interface TwilioInitResult {
  client: ReturnType<typeof twilio> | null;
  error: string | null;
}

function initTwilioClient(): TwilioInitResult {
  if (apiKeySid && apiKeySecret) {
    if (accountSid) {
      return { client: twilio(apiKeySid, apiKeySecret, { accountSid }), error: null };
    }
    return {
      client: null,
      error:
        'TWILIO_ACCOUNT_SID is required when using Twilio API key auth ' +
        '(TWILIO_API_KEY_SID/TWILIO_API_KEY_SECRET are set but TWILIO_ACCOUNT_SID is missing).',
    };
  }

  if (accountSid && authToken) {
    return { client: twilio(accountSid, authToken), error: null };
  }

  return {
    client: null,
    error:
      'No Twilio credentials configured. Set either ' +
      'TWILIO_API_KEY_SID + TWILIO_API_KEY_SECRET + TWILIO_ACCOUNT_SID, or ' +
      'TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN.',
  };
}

const init = initTwilioClient();

// Export the client so it can be used if needed (null when not configured)
export const twilioClient = init.client;

if (init.error) {
  console.warn(`WARNING: ${init.error} SMS functionality will not work.`);
} else if (twilioClient && !twilioPhoneNumber) {
  console.warn('WARNING: Missing TWILIO_PHONE_NUMBER. Sending SMS will fail.');
}

export const sendSMS = async (to: string, body: string): Promise<void> => {
  if (!twilioClient) {
    console.error(`Cannot send SMS to ${to}: ${init.error || 'Twilio client not initialized.'}`);
    return;
  }

  if (!twilioPhoneNumber) {
    console.error(`Cannot send SMS to ${to}: TWILIO_PHONE_NUMBER is not set.`);
    return;
  }

  try {
    await twilioClient.messages.create({
      body,
      from: twilioPhoneNumber,
      to,
    });
    console.log(`Sent SMS to ${to}: ${body.substring(0, 50)}...`);
  } catch (error) {
    console.error(`Failed to send SMS to ${to}:`, error);
  }
};
