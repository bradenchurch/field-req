import cron from 'node-cron';
import { db } from '../db';
import { organizations, projects, workers, assignments, categories, requests, outreachLog, requestItems } from '../db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { sendSMS } from '../services/sms';
import { sendFridaySummaryEmail, ProjectSummary } from '../services/email';

export const startCronJobs = () => {
  // Thursday 3pm: Send outreach
  cron.schedule('0 15 * * 4', async () => {
    if (!db.select) return; // DB not initialized

    console.log('Running Thursday 3pm outreach job...');
    const activeProjects = await db.select().from(projects).where(eq(projects.isActive, true));

    for (const project of activeProjects) {
      const assignedWorkers = await db.select({
        worker: workers
      }).from(assignments)
        .innerJoin(workers, eq(assignments.workerId, workers.id))
        .where(and(eq(assignments.projectId, project.id), eq(workers.optedIn, true)));

      const orgCategories = await db.select().from(categories).where(eq(categories.orgId, project.orgId));
      let categoryPrompt = orgCategories.map((c: any) => c.label).join(', ');

      const periodStart = new Date();
      const periodEnd = new Date();
      periodEnd.setDate(periodEnd.getDate() + 3); // Until Sunday

      for (const { worker } of assignedWorkers) {
        // Create a request record
        const [req] = await db.insert(requests).values({
          projectId: project.id,
          workerId: worker.id,
          periodStart,
          periodEnd,
          status: 'pending'
        }).returning();

        // Log outreach
        await db.insert(outreachLog).values({
          orgId: project.orgId,
          projectId: project.id,
          workerId: worker.id,
          status: 'sent'
        });

        const msg = `Hi ${worker.name || 'there'}, what materials do you need for ${project.name} next week? (Categories: ${categoryPrompt})`;
        await sendSMS(worker.phone, msg);
      }
    }
  });

  // Friday 10am: Nudge non-responders
  cron.schedule('0 10 * * 5', async () => {
    if (!db.select) return;

    console.log('Running Friday 10am nudge job...');
    const nonResponders = await db.select({
      log: outreachLog,
      worker: workers,
      project: projects
    }).from(outreachLog)
      .innerJoin(workers, eq(outreachLog.workerId, workers.id))
      .innerJoin(projects, eq(outreachLog.projectId, projects.id))
      .where(and(
        eq(outreachLog.status, 'sent'),
        isNull(outreachLog.repliedAt)
      ));

    for (const { log, worker, project } of nonResponders) {
      await db.update(outreachLog).set({ status: 'nudged' }).where(eq(outreachLog.id, log.id));
      await sendSMS(worker.phone, `Reminder: Please send your material requests for ${project.name} today.`);
    }
  });

  // Friday 3pm: Send summary email
  cron.schedule('0 15 * * 5', async () => {
    if (!db.select) return;

    console.log('Running Friday 3pm summary email job...');
    const activeProjects = await db.select().from(projects).where(eq(projects.isActive, true));
    const summaries: ProjectSummary[] = [];

    for (const project of activeProjects) {
      const projectReqs = await db.select({
        request: requests,
        worker: workers
      }).from(requests)
        .innerJoin(workers, eq(requests.workerId, workers.id))
        .where(and(eq(requests.projectId, project.id), eq(requests.status, 'submitted')));

      const workerRequests = [];

      for (const { request, worker } of projectReqs) {
        const items = await db.select({
          item: requestItems,
          category: categories
        }).from(requestItems)
          .leftJoin(categories, eq(requestItems.categoryId, categories.id))
          .where(eq(requestItems.requestId, request.id));

        if (items.length > 0) {
          workerRequests.push({
            workerName: worker.name || worker.phone,
            items: items.map((i: any) => ({
              category: i.category?.label || 'Uncategorized',
              content: i.item.content
            }))
          });
        }
      }

      if (workerRequests.length > 0) {
        summaries.push({
          projectName: project.name,
          workerRequests
        });
      }
    }

    const ownerEmail = process.env.OWNER_EMAIL; // Could select from org owners
    if (ownerEmail) {
      await sendFridaySummaryEmail([ownerEmail], summaries);
    } else {
      console.warn('Cannot send Friday summary: OWNER_EMAIL is not set.');
    }
  });

  // Sunday 12am: Reset and close out requests
  cron.schedule('0 0 * * 0', async () => {
    if (!db.update) return;

    console.log('Running Sunday weekly reset job...');
    // Clean up old pending requests that were never responded to
    await db.update(requests)
      .set({ status: 'closed' })
      .where(eq(requests.status, 'pending'));
  });

  console.log('Cron jobs scheduled successfully.');
};
