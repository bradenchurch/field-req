import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
export const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export async function parseWorkerReply(body: string, categories: string[]): Promise<{ category_label: string; items: string[] }[]> {
  if (!ai) {
    console.warn('[GEMINI MOCK] parseWorkerReply');
    return categories.map(c => ({ category_label: c, items: [body] }));
  }

  const prompt = `
You are parsing a text message from a construction worker.
Available categories: ${categories.join(', ')}.
Message: "${body}"

Extract the requested items into the appropriate categories. Return ONLY a valid JSON array of objects with keys "category_label" and "items" (an array of strings).
If the worker is just saying "none" or "we're good", return an empty array or empty items array.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error('Gemini parseWorkerReply error:', error);
    return [];
  }
}

export async function understandOwnerCommand(body: string): Promise<{ action: string; params: Record<string, any> }> {
  if (!ai) {
    console.warn('[GEMINI MOCK] understandOwnerCommand');
    return { action: 'help', params: {} };
  }

  const prompt = `
You are interpreting a text message from a construction company owner.
They are managing their workers and projects via SMS.
Possible actions:
- 'add_worker' (params: name, phone)
- 'add_project' (params: name)
- 'assign_worker' (params: worker_name, project_name)
- 'move_worker' (params: worker_name, project_name)
- 'status_request' (params: project_name or 'all')
- 'approve_request' (params: project_name)
- 'opt_in_status' (params: {})
- 'help' (params: {})

Message: "${body}"

Extract the intent and any relevant parameters. Return ONLY a valid JSON object with keys "action" (string) and "params" (object).
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text;
    if (!text) return { action: 'help', params: {} };
    return JSON.parse(text);
  } catch (error) {
    console.error('Gemini understandOwnerCommand error:', error);
    return { action: 'help', params: {} };
  }
}

export async function generateSummary(requests: any[]): Promise<string> {
  if (!ai) {
    console.warn('[GEMINI MOCK] generateSummary');
    return 'Summary mock...';
  }
  
  // Could use Gemini to generate a natural language summary instead of structured HTML
  // But Resend service does HTML generation. We'll leave this for potential SMS summaries.
  return 'Not implemented';
}