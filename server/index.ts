import express from 'express';
import dotenv from 'dotenv';
import twilioRoutes from './routes/twilio';
import { initScheduler } from './services/scheduler';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Need urlencoded for Twilio webhooks
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Routes
app.use('/api/twilio', twilioRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start scheduler only in production or if explicitly enabled
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  // If running on Vercel, use Vercel cron instead of node-cron
  initScheduler();
}

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

export default app;