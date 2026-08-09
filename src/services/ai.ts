import { GoogleGenAI } from '@google/genai';

const geminiApiKey = process.env.GEMINI_API_KEY;

if (!geminiApiKey) {
  console.warn('WARNING: Missing GEMINI_API_KEY. AI parsing will not work.');
}

const ai = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;

export interface ParsedItem {
  categoryId?: string; // ID of the category if matched
  content: string;
}

export const parseWorkerReply = async (
  text: string,
  categories: { id: string; label: string }[]
): Promise<ParsedItem[]> => {
  if (!ai) {
    console.error('Cannot parse reply: AI client not initialized.');
    return [{ content: text }];
  }

  const categoryListStr = categories.map(c => `- ${c.label} (ID: ${c.id})`).join('\n');

  const prompt = `
You are an AI assistant for a plumbing company's material request system.
A field worker has sent the following SMS reply regarding materials they need:
"${text}"

Here are the available categories for this organization:
${categoryListStr}

Extract the requested items. If an item clearly belongs to one of the available categories, assign its category ID. If not, leave the category ID empty (null).
Format the output as a valid JSON array of objects, where each object has a "content" string and an optional "categoryId" string. Return ONLY the JSON, without markdown formatting or other text.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    let textResp = response.text || '[]';
    // Remove markdown code block syntax if present
    textResp = textResp.replace(/```json/gi, '').replace(/```/gi, '').trim();
    const parsed = JSON.parse(textResp);
    return parsed;
  } catch (error) {
    console.error('Error parsing worker reply with Gemini:', error);
    // Fallback: return the whole text as a single un-categorized item
    return [{ content: text }];
  }
};

export interface OwnerAction {
  action: 'assign' | 'status' | 'approve' | 'setup_org' | 'setup_categories' | 'setup_projects' | 'setup_workers' | 'unknown';
  targetWorker?: string;
  targetProject?: string;
  orgName?: string;
  items?: string[];
  rawText: string;
}

export const parseOwnerCommand = async (text: string): Promise<OwnerAction> => {
  if (!ai) {
    console.error('Cannot parse command: AI client not initialized.');
    return { action: 'unknown', rawText: text };
  }

  const prompt = `
You are an AI assistant helping the owner of a commercial plumbing company manage their field workers, projects, and system setup via SMS.
The owner has sent the following SMS:
"${text}"

Analyze the intent of the message. The possible actions are:
1. "setup_org" (e.g., "Set up my company named Acme Plumbing")
2. "setup_categories" (e.g., "Add categories: Pipe, Fittings, Tools")
3. "setup_projects" (e.g., "Add project Pearson High School")
4. "setup_workers" (e.g., "Add worker John 555-1234")
5. "assign" (e.g., "Move Mike to Pearson")
6. "status" (e.g., "Status on Pioneer")
7. "approve" (e.g., "Approve Pearson")
8. "unknown" (if none of the above)

Extract additional information if relevant:
- "orgName": The name of the organization (if action is setup_org)
- "items": A list of strings for things to add (categories, project names, or worker names/details) if action is setup_categories, setup_projects, or setup_workers.
- "targetWorker": string (if action is assign or approve)
- "targetProject": string (if action is assign, status, or approve)

Return a valid JSON object with the following keys: "action", "targetWorker", "targetProject", "orgName", "items".
Omit keys that are null or not applicable. Return ONLY the JSON.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    let textResp = response.text || '{"action": "unknown"}';
    textResp = textResp.replace(/```json/gi, '').replace(/```/gi, '').trim();
    const parsed = JSON.parse(textResp);
    return { ...parsed, rawText: text };
  } catch (error) {
    console.error('Error parsing owner command with Gemini:', error);
    return { action: 'unknown', rawText: text };
  }
};
