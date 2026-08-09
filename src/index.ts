import express from 'express';
import dotenv from 'dotenv';
import webhookRoutes from './routes/webhook';
import { startCronJobs } from './jobs/cron';

// Load environment variables
dotenv.config();

// Ensure basic critical env vars exist
const requiredVars = [
  'DATABASE_URL',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER',
  'RESEND_API_KEY',
  'GEMINI_API_KEY',
  'OWNER_PHONE',
  'OWNER_EMAIL'
];

for (const envVar of requiredVars) {
  if (!process.env[envVar]) {
    console.warn(`WARNING: Missing environment variable ${envVar}. Some features may not work as expected.`);
  }
}

const app = express();

app.use(express.urlencoded({ extended: true })); // Twilio sends webhooks as application/x-www-form-urlencoded
app.use(express.json());

// Routes
app.use('/api/twilio', webhookRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`FieldReq server listening on port ${PORT}`);

  // Start background jobs
  startCronJobs();
});
