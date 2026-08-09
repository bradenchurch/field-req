import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
export const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !twilioPhoneNumber) {
  console.warn('WARNING: Missing Twilio credentials. SMS functionality will not work.');
}

// Export the client so it can be used if needed
export const twilioClient = accountSid && authToken ? twilio(accountSid, authToken) : null;

export const sendSMS = async (to: string, body: string): Promise<void> => {
  if (!twilioClient) {
    console.error('Cannot send SMS: Twilio client not initialized.');
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
