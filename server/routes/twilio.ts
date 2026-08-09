import { Router, Request, Response } from 'express';
import { handleIncomingSMS } from '../services/agent';
import { validateTwilioSignature } from '../middleware/twilio-signature';
import twilio from 'twilio';

const router = Router();

router.post('/webhook', validateTwilioSignature, async (req: Request, res: Response) => {
  const from = req.body.From;
  const body = req.body.Body;

  if (from && body) {
    try {
      await handleIncomingSMS(from, body);
    } catch (error) {
      console.error('Error handling SMS:', error);
    }
  }

  // Twilio expects a TwiML response. We send an empty one because we reply asynchronously.
  const twiml = new twilio.twiml.MessagingResponse();
  res.type('text/xml').send(twiml.toString());
});

export default router;