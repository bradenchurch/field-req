import { Resend } from 'resend';

const resendKey = process.env.RESEND_API_KEY;
export const resend = resendKey ? new Resend(resendKey) : null;

export async function sendSummaryEmail(to: string, orgName: string, projectSummaries: any[]): Promise<boolean> {
  if (!resend) {
    console.warn(`[RESEND MOCK] Email to ${to} for ${orgName}`);
    return true;
  }

  let htmlContent = `<h1>Weekly Material Requests for ${orgName}</h1>`;
  
  for (const proj of projectSummaries) {
    htmlContent += `<h2>Project: ${proj.name}</h2>`;
    
    if (proj.requests && proj.requests.length > 0) {
      for (const req of proj.requests) {
        htmlContent += `<h3>Worker: ${req.workerName}</h3>`;
        if (req.items && req.items.length > 0) {
          htmlContent += '<ul>';
          for (const item of req.items) {
            htmlContent += `<li><strong>${item.category}:</strong> ${item.content}</li>`;
          }
          htmlContent += '</ul>';
        } else {
          htmlContent += `<p><em>No items requested.</em></p>`;
        }
      }
    } else {
      htmlContent += `<p>No responses for this project.</p>`;
    }
    
    if (proj.nonResponders && proj.nonResponders.length > 0) {
      htmlContent += `<p style="color: red;"><strong>Non-responders:</strong> ${proj.nonResponders.join(', ')}</p>`;
    }
  }

  try {
    await resend.emails.send({
      from: 'FieldReq <onboarding@resend.dev>',
      to,
      subject: `${orgName} - Friday Material Requests`,
      html: htmlContent,
    });
    return true;
  } catch (error) {
    console.error('Resend Error:', error);
    return false;
  }
}