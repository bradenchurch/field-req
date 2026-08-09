import { db } from '../db';
import { organizations, workers, projects, assignments, categories, requests, requestItems, outreachLog } from '../db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { sendSMS } from './twilio';
import { parseWorkerReply, understandOwnerCommand } from './gemini';
import { sendSummaryEmail } from './resend';

export async function handleIncomingSMS(from: string, body: string) {
  // Check if it's a known worker
  const workerList = await db.select().from(workers).where(eq(workers.phone, from));
  if (workerList.length > 0) {
    const worker = workerList[0];
    if (body.trim().toUpperCase() === 'JOIN') {
      await db.update(workers).set({ optedIn: true }).where(eq(workers.id, worker.id));
      await sendSMS(from, "You're set up! I'll text you here for material requests.");
      return;
    }
    
    const org = await db.select().from(organizations).where(eq(organizations.id, worker.orgId)).then(r => r[0]);
    if (org) {
      await handleWorkerReply(worker, body, org);
    }
    return;
  }

  // Handle Owner / Onboarding
  const orgList = await db.select().from(organizations).limit(1); // V1 assumption
  if (orgList.length === 0) {
    if (body.trim().toUpperCase() === 'START' || body.trim().toUpperCase() === 'JOIN') {
      await sendSMS(from, "Hi! Let's get you set up. What should I call your company?");
    } else {
      await db.insert(organizations).values({ name: body.trim() });
      await sendSMS(from, "What should I ask your guys each week? (e.g. Materials needed, Safety issues, Equipment)");
    }
    return;
  }

  const org = orgList[0];
  const catList = await db.select().from(categories).where(eq(categories.orgId, org.id));
  if (catList.length === 0) {
    const labels = body.split(',').map(s => s.trim()).filter(s => s);
    const newCats = labels.map((l, i) => ({ orgId: org.id, label: l, sortOrder: i }));
    await db.insert(categories).values(newCats);
    await sendSMS(from, "Great. Send me your workers' names and numbers. You can send one at a time or all at once. Format: Name, Phone (e.g. Mike, 5551234)");
    return;
  }

  const workerCount = await db.select().from(workers).where(eq(workers.orgId, org.id));
  if (workerCount.length === 0 || body.toLowerCase().includes('done with workers')) {
    // Basic worker parsing logic: assume "Name, Phone"
    if (body.includes(',')) {
      const lines = body.split('\n').filter(l => l.trim());
      let added = 0;
      for (const line of lines) {
        const [name, phone] = line.split(',');
        if (name && phone) {
          await db.insert(workers).values({ orgId: org.id, name: name.trim(), phone: phone.trim() });
          added++;
        }
      }
      if (added > 0) {
        await sendSMS(from, `Added ${added} workers. Send more, or if done, send me any active projects one at a time. (Say "Project: Name")`);
        return;
      }
    }
  }

  // If message starts with "Project:", add project
  if (body.toLowerCase().startsWith('project:')) {
    const projName = body.substring(8).trim();
    const newProj = await db.insert(projects).values({ orgId: org.id, name: projName }).returning();
    await sendSMS(from, `Who's on ${projName}? (Reply with "Assign: Name")`);
    return;
  }

  // If message starts with "Assign:", assign worker to the most recent project
  if (body.toLowerCase().startsWith('assign:')) {
    const workerName = body.substring(7).trim();
    const recentProjects = await db.select().from(projects).where(eq(projects.orgId, org.id)).orderBy(desc(projects.createdAt)).limit(1);
    if (recentProjects.length > 0) {
      const workerMatch = await db.select().from(workers).where(and(eq(workers.orgId, org.id), eq(workers.name, workerName))).limit(1);
      if (workerMatch.length > 0) {
        await db.insert(assignments).values({ projectId: recentProjects[0].id, workerId: workerMatch[0].id });
        await sendSMS(from, `Assigned ${workerName} to ${recentProjects[0].name}. Send another, or say "All set" if finished.`);
      } else {
        await sendSMS(from, `Couldn't find a worker named ${workerName}.`);
      }
    }
    return;
  }

  if (body.toLowerCase().includes('all set')) {
    await sendSMS(from, "All set! I'll reach out Thursday at 3pm. Text me anytime to manage your crew.");
    return;
  }

  // Standard commands
  await handleOwnerCommand(from, body, org);
}

async function handleWorkerReply(worker: any, body: string, org: any) {
  const activeAssignments = await db.select().from(assignments).where(eq(assignments.workerId, worker.id));
  if (activeAssignments.length === 0) {
    await sendSMS(worker.phone, "You aren't assigned to any active projects right now.");
    return;
  }
  
  const projectId = activeAssignments[0].projectId;
  
  let activeRequest = await db.select().from(requests).where(
    and(
      eq(requests.workerId, worker.id),
      eq(requests.projectId, projectId),
      inArray(requests.status, ['pending', 'replied', 'approved'])
    )
  ).orderBy(desc(requests.periodStart)).limit(1).then(r => r[0]);
  
  if (!activeRequest) {
    activeRequest = await db.insert(requests).values({
      projectId,
      workerId: worker.id,
      periodStart: new Date().toISOString().split('T')[0],
      periodEnd: new Date().toISOString().split('T')[0],
      status: 'replied'
    }).returning().then(r => r[0]);
  } else if (activeRequest.status === 'pending') {
    await db.update(requests).set({ status: 'replied' }).where(eq(requests.id, activeRequest.id));
  }

  await db.update(outreachLog)
    .set({ repliedAt: new Date(), status: 'replied' })
    .where(
      and(
        eq(outreachLog.workerId, worker.id),
        eq(outreachLog.status, 'sent')
      )
    );

  const allCats = await db.select().from(categories).where(eq(categories.orgId, org.id));
  const parsed = await parseWorkerReply(body, allCats.map(c => c.label));
  
  let addedCount = 0;
  for (const cat of parsed) {
    const catRecord = allCats.find(c => c.label === cat.category_label);
    if (!catRecord) continue;
    
    for (const item of cat.items) {
      await db.insert(requestItems).values({
        requestId: activeRequest.id,
        categoryId: catRecord.id,
        content: item
      });
      addedCount++;
    }
  }

  if (addedCount > 0) {
    await sendSMS(worker.phone, `Got it. Added ${addedCount} items to your request.`);
  } else {
    await sendSMS(worker.phone, "Got it. You're all set.");
  }
}

async function handleOwnerCommand(from: string, body: string, org: any) {
  const intent = await understandOwnerCommand(body);
  
  switch(intent.action) {
    case 'add_worker':
      if (intent.params.name && intent.params.phone) {
        await db.insert(workers).values({
          orgId: org.id,
          name: intent.params.name,
          phone: intent.params.phone
        });
        await sendSMS(from, `Added worker ${intent.params.name}.`);
        await sendSMS(intent.params.phone, `You've been added to FieldReq for ${org.name}. Please reply JOIN to opt-in to SMS updates.`);
      }
      break;
    case 'add_project':
      if (intent.params.name) {
        await db.insert(projects).values({ orgId: org.id, name: intent.params.name });
        await sendSMS(from, `Added project ${intent.params.name}.`);
      }
      break;
    case 'assign_worker':
      await sendSMS(from, `Acknowledged: assign worker. Need exact lookup implementation.`);
      break;
    case 'status_request':
      await sendSMS(from, `I can send you a summary email. Generating...`);
      break;
    default:
      await sendSMS(from, "I didn't quite catch that command. Try 'add worker Mike 555-1234' or 'add project Pioneer'.");
  }
}

export async function sendWeeklyOutreach() {
  const orgs = await db.select().from(organizations);
  for (const org of orgs) {
    const cats = await db.select().from(categories).where(eq(categories.orgId, org.id));
    const catLabels = cats.map(c => c.label).join(', ');
    const activeProjects = await db.select().from(projects).where(and(eq(projects.orgId, org.id), eq(projects.isActive, true)));
    
    for (const project of activeProjects) {
      const assigned = await db.select().from(assignments).where(eq(assignments.projectId, project.id));
      for (const a of assigned) {
        const worker = await db.select().from(workers).where(and(eq(workers.id, a.workerId), eq(workers.optedIn, true))).then(r => r[0]);
        if (!worker) continue;
        
        await db.insert(requests).values({
          projectId: project.id,
          workerId: worker.id,
          periodStart: new Date().toISOString().split('T')[0],
          periodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'pending'
        });
        
        await db.insert(outreachLog).values({
          orgId: org.id,
          workerId: worker.id,
          projectId: project.id,
          status: 'sent'
        });
        
        const msg = `Hey ${worker.name} - ${project.name} check-in: ${catLabels}. Reply with anything you need.`;
        await sendSMS(worker.phone, msg);
      }
    }
  }
}

export async function sendNudgeReminders() {
  const pending = await db.select().from(outreachLog).where(eq(outreachLog.status, 'sent'));
  for (const log of pending) {
    const worker = await db.select().from(workers).where(eq(workers.id, log.workerId)).then(r => r[0]);
    const project = await db.select().from(projects).where(eq(projects.id, log.projectId)).then(r => r[0]);
    if (worker && project) {
      await sendSMS(worker.phone, `Just checking - anything needed for ${project.name}? Taylor needs to place orders.`);
      await db.update(outreachLog).set({ status: 'nudged' }).where(eq(outreachLog.id, log.id));
    }
  }
}

export async function sendFridaySummary() {
  const orgs = await db.select().from(organizations);
  for (const org of orgs) {
    const activeProjects = await db.select().from(projects).where(and(eq(projects.orgId, org.id), eq(projects.isActive, true)));
    const summaryData = [];
    
    for (const proj of activeProjects) {
      const projSummary: any = { name: proj.name, requests: [], nonResponders: [] };
      const reqs = await db.select().from(requests).where(eq(requests.projectId, proj.id));
      
      for (const req of reqs) {
        const worker = await db.select().from(workers).where(eq(workers.id, req.workerId)).then(r => r[0]);
        
        if (req.status === 'pending') {
          projSummary.nonResponders.push(worker?.name || 'Unknown');
        } else {
          const items = await db.select().from(requestItems).where(eq(requestItems.requestId, req.id));
          const populatedItems = [];
          for (const item of items) {
            const cat = await db.select().from(categories).where(eq(categories.id, item.categoryId)).then(r => r[0]);
            populatedItems.push({ category: cat?.label || 'General', content: item.content });
          }
          projSummary.requests.push({ workerName: worker?.name || 'Unknown', items: populatedItems });
          await db.update(requests).set({ status: 'completed' }).where(eq(requests.id, req.id));
        }
      }
      summaryData.push(projSummary);
    }
    
    const ownerEmail = process.env.OWNER_EMAIL || 'taylor@example.com';
    await sendSummaryEmail(ownerEmail, org.name, summaryData);
  }
}