import cron from 'node-cron';
import { sendWeeklyOutreach, sendNudgeReminders, sendFridaySummary } from './agent';

export function initScheduler() {
  // Thu 3pm
  cron.schedule('0 15 * * 4', async () => {
    console.log('Running weekly outreach...');
    await sendWeeklyOutreach();
  });

  // Fri 10am
  cron.schedule('0 10 * * 5', async () => {
    console.log('Running nudge reminders...');
    await sendNudgeReminders();
  });

  // Fri 3pm
  cron.schedule('0 15 * * 5', async () => {
    console.log('Running Friday summary...');
    await sendFridaySummary();
  });
  
  // Sun 12am (Reset could go here if needed)
  cron.schedule('0 0 * * 0', () => {
    console.log('Weekly reset / maintenance...');
  });

  console.log('Scheduler initialized.');
}