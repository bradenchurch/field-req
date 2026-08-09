import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
  console.warn('WARNING: Missing RESEND_API_KEY. Email functionality will not work.');
}

const resend = resendApiKey ? new Resend(resendApiKey) : null;

export interface ProjectSummary {
  projectName: string;
  workerRequests: {
    workerName: string;
    items: {
      category: string;
      content: string;
    }[];
  }[];
}

export const sendFridaySummaryEmail = async (to: string[], summaries: ProjectSummary[]): Promise<void> => {
  if (!resend) {
    console.error('Cannot send email: Resend client not initialized.');
    return;
  }

  const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev'; // Using resend testing email by default

  let htmlContent = `<h1>FieldReq Friday Summary</h1>\n\n`;

  if (summaries.length === 0) {
    htmlContent += `<p>No material requests for this week.</p>`;
  } else {
    for (const project of summaries) {
      htmlContent += `<h2>Project: ${project.projectName}</h2>\n`;
      if (project.workerRequests.length === 0) {
        htmlContent += `<p>No requests for this project.</p>\n`;
      } else {
        for (const workerReq of project.workerRequests) {
          htmlContent += `<h3>${workerReq.workerName}</h3>\n<ul>\n`;
          for (const item of workerReq.items) {
            htmlContent += `<li><strong>${item.category}:</strong> ${item.content}</li>\n`;
          }
          htmlContent += `</ul>\n`;
        }
      }
    }
  }

  htmlContent += `<p><br><a href="https://your-dashboard-url.com">View Dashboard</a></p>`;

  try {
    const data = await resend.emails.send({
      from: `FieldReq <${fromEmail}>`,
      to,
      subject: 'Weekly Material Requests Summary',
      html: htmlContent,
    });
    console.log(`Sent email summary to ${to.join(', ')}`);
  } catch (error) {
    console.error('Error sending email summary:', error);
  }
};
