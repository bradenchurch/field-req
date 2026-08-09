import { Request, Response, NextFunction } from 'express';
import twilio from 'twilio';

const authToken = process.env.TWILIO_AUTH_TOKEN;

export function validateTwilioSignature(req: Request, res: Response, next: NextFunction) {
  // If no auth token (local testing), bypass
  if (!authToken) {
    return next();
  }

  const twilioSignature = req.headers['x-twilio-signature'] as string;
  
  if (!twilioSignature) {
    return res.status(403).send('No Twilio signature provided');
  }

  // Use the host and path to reconstruct URL, or env var
  const url = process.env.APP_URL ? `${process.env.APP_URL}${req.originalUrl}` : `https://${req.get('host')}${req.originalUrl}`;
  const params = req.body;

  if (twilio.validateRequest(authToken, twilioSignature, url, params)) {
    next();
  } else {
    res.status(403).send('Invalid Twilio signature');
  }
}