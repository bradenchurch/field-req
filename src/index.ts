import app from './app';
import { startCronJobs } from './jobs/cron';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`FieldReq server listening on port ${PORT}`);

  // Start background jobs (local/self-hosted only; on Vercel use Vercel Cron instead)
  startCronJobs();
});
