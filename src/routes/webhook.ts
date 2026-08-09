import { Router, Request, Response } from 'express';
import { db } from '../db';
import { workers, organizations, categories, requests, requestItems, outreachLog, projects } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { sendSMS, twilioPhoneNumber } from '../services/sms';
import { parseWorkerReply, parseOwnerCommand } from '../services/ai';
import twilio from 'twilio';

const router = Router();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

// Twilio webhook validation middleware
const validateTwilio = (req: Request, res: Response, next: any) => {
  if (process.env.NODE_ENV === 'development') {
    return next(); // Skip in dev
  }

  const twilioSignature = req.headers['x-twilio-signature'] as string;
  const url = process.env.PUBLIC_URL ? `${process.env.PUBLIC_URL}${req.originalUrl}` : `https://${req.headers.host}${req.originalUrl}`;

  if (!authToken) {
    return next();
  }

  const isValid = twilio.validateRequest(
    authToken,
    twilioSignature,
    url,
    req.body
  );

  if (isValid) {
    next();
  } else {
    res.status(403).send('Forbidden: Invalid Twilio Signature');
  }
};

router.post('/webhook', validateTwilio, async (req: Request, res: Response) => {
  const from = req.body.From as string; // Phone number of sender
  const body = req.body.Body as string; // Message content

  console.log(`Received SMS from ${from}: ${body}`);

  const ownerPhone = process.env.OWNER_PHONE; // Hardcoded for V1

  if (!db.select) {
     // DB not initialized
     await sendSMS(from, 'System is currently unavailable. Missing database configuration.');
     res.type('text/xml');
     res.send('<Response></Response>');
     return;
  }

  // Find org
  const orgs = await db.select().from(organizations).limit(1);
  let org = orgs.length > 0 ? orgs[0] : null;

  if (ownerPhone && from === ownerPhone) {
    // Message from Taylor
    const parsedCommand = await parseOwnerCommand(body);
    console.log('Parsed owner command:', parsedCommand);

    if (!org && parsedCommand.action !== 'setup_org') {
      await sendSMS(from, 'Welcome to FieldReq! It looks like your organization is not set up. Please text me something like "Set up my company named Acme Plumbing".');
      res.type('text/xml');
      res.send('<Response></Response>');
      return;
    }

    switch (parsedCommand.action) {
      case 'setup_org':
        if (org) {
          await sendSMS(from, `Organization ${org.name} is already set up.`);
        } else {
          const orgName = parsedCommand.orgName || 'My Plumbing Company';
          const newOrgs = await db.insert(organizations).values({ name: orgName }).returning();
          org = newOrgs[0];
          await sendSMS(from, `Created organization "${org.name}". Next, let's set up categories. Try texting "Add categories: PVC, Copper, Tools".`);
        }
        break;

      case 'setup_categories':
        if (org && parsedCommand.items && parsedCommand.items.length > 0) {
          for (let i = 0; i < parsedCommand.items.length; i++) {
            await db.insert(categories).values({
              orgId: org.id,
              label: parsedCommand.items[i],
              sortOrder: i
            });
          }
          await sendSMS(from, `Added ${parsedCommand.items.length} categories. Next, add some projects: "Add project Pioneer High School".`);
        } else {
          await sendSMS(from, `I couldn't understand the categories. Try "Add categories: PVC, Copper, Tools".`);
        }
        break;

      case 'setup_projects':
        if (org && parsedCommand.items && parsedCommand.items.length > 0) {
          for (const projectName of parsedCommand.items) {
             await db.insert(projects).values({
               orgId: org.id,
               name: projectName
             });
          }
          await sendSMS(from, `Added projects. You can now tell workers to text JOIN to this number, or add them manually: "Add worker John 555-1234".`);
        } else {
          await sendSMS(from, `I couldn't understand the projects. Try "Add project Downtown Condo".`);
        }
        break;

      case 'setup_workers':
        if (org && parsedCommand.items && parsedCommand.items.length > 0) {
          // This is a naive implementation, ideally AI parses out phone numbers
          for (const workerInfo of parsedCommand.items) {
             // Basic regex to find phone number if present
             const phoneMatch = workerInfo.match(/\d{3}[-\s]?\d{3}[-\s]?\d{4}/);
             const phone = phoneMatch ? phoneMatch[0].replace(/\D/g, '') : `+1${Math.floor(Math.random() * 10000000000)}`;
             const name = workerInfo.replace(/\d{3}[-\s]?\d{3}[-\s]?\d{4}/, '').trim();

             await db.insert(workers).values({
               orgId: org.id,
               name: name || 'Unknown',
               phone: phone,
               optedIn: false
             });
          }
          await sendSMS(from, `Added workers. They still need to text JOIN to this number to opt in.`);
        } else {
           await sendSMS(from, `I couldn't understand the workers. Try "Add worker John 555-1234".`);
        }
        break;

      case 'assign':
        await sendSMS(from, `I see you want to assign ${parsedCommand.targetWorker} to ${parsedCommand.targetProject}. (Assignment logic to be fully implemented).`);
        break;

      case 'status':
        await sendSMS(from, `Checking status for ${parsedCommand.targetProject}... (Status logic to be fully implemented).`);
        break;

      case 'approve':
         await sendSMS(from, `Approving requests for ${parsedCommand.targetProject}... (Approval logic to be fully implemented).`);
         break;

      default:
        await sendSMS(from, `I didn't quite catch that. You can ask me to set up categories, projects, or check project status.`);
        break;
    }

    res.type('text/xml');
    res.send('<Response></Response>');
    return;
  }

  // Handle worker message
  if (!org) {
    // If the org isn't even set up, the system isn't ready for workers
    await sendSMS(from, 'System is not yet configured. Please contact your administrator.');
    res.type('text/xml');
    res.send('<Response></Response>');
    return;
  }

  let workerList = await db.select().from(workers).where(eq(workers.phone, from));
  let worker = workerList[0];

  if (!worker) {
    if (body.trim().toUpperCase() === 'JOIN') {
      worker = (await db.insert(workers).values({
        orgId: org.id,
        phone: from,
        optedIn: true,
        name: 'Unknown Worker'
      }).returning())[0];
      await sendSMS(from, 'You have opted in to FieldReq material requests. You will receive updates here.');
    } else {
      await sendSMS(from, 'Please reply JOIN to opt in to material requests.');
    }
  } else {
    if (body.trim().toUpperCase() === 'JOIN') {
      await db.update(workers).set({ optedIn: true }).where(eq(workers.id, worker.id));
      await sendSMS(from, 'You are already opted in.');
    } else if (worker.optedIn) {
      // Find most recent pending request for this worker
      const recentRequests = await db.select().from(requests)
        .where(and(eq(requests.workerId, worker.id), eq(requests.status, 'pending')))
        .orderBy(desc(requests.periodStart))
        .limit(1);

      if (recentRequests.length > 0) {
        const reqRecord = recentRequests[0];

        // Mark log as replied
        await db.update(outreachLog)
          .set({ repliedAt: new Date(), status: 'replied' })
          .where(and(
            eq(outreachLog.workerId, worker.id),
            eq(outreachLog.projectId, reqRecord.projectId),
            eq(outreachLog.status, 'sent')
          ));

        // Parse items
        const orgCategories = await db.select().from(categories).where(eq(categories.orgId, org.id));
        const parsedItems = await parseWorkerReply(body, orgCategories);

        for (const item of parsedItems) {
          await db.insert(requestItems).values({
            requestId: reqRecord.id,
            content: item.content,
            categoryId: item.categoryId || null
          });
        }

        await db.update(requests).set({ status: 'submitted' }).where(eq(requests.id, reqRecord.id));

        await sendSMS(from, 'Thanks, recorded your materials. Reply with more items if needed.');
      } else {
        // Just record generic or late message if no pending request
        await sendSMS(from, 'Noted. There is no active request right now, but we saved your message.');
      }
    }
  }

  res.type('text/xml');
  res.send('<Response></Response>');
});

export default router;
