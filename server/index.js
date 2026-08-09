import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const PORT = 3001;

// Path to JSON data files
const RESPONSES_FILE = path.join(__dirname, 'responses.json');
const CREW_FILE = path.join(__dirname, 'crew.json');

// Helper to write to JSON safely
function writeJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// Helper to read from JSON safely
function readJsonFile(filePath, defaultData = []) {
  if (!fs.existsSync(filePath)) {
    writeJsonFile(filePath, defaultData);
    return defaultData;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return defaultData;
  }
}

// Initialize files
const initialCrew = [
  { id: 1, name: "Mike (EN)", phone: "+15550001111", language: "en", project: "Pearson High School" },
  { id: 2, name: "Jose (ES)", phone: "+15550002222", language: "es", project: "Pearson High School" },
  { id: 3, name: "Alex (EN)", phone: "+15550003333", language: "en", project: "Pioneer Ridge Dev" }
];
if (!fs.existsSync(CREW_FILE)) {
  writeJsonFile(CREW_FILE, initialCrew);
}
if (!fs.existsSync(RESPONSES_FILE)) {
  writeJsonFile(RESPONSES_FILE, []);
}

// Simulated SMS Sending
app.post('/api/check-in/send', (req, res) => {
  const crew = readJsonFile(CREW_FILE);

  // Here we would normally use Twilio to send SMS
  crew.forEach(member => {
    const msg = member.language === 'es'
      ? `Hola ${member.name.split(' ')[0]}, ¿necesitas algún material para ${member.project} esta semana?`
      : `Hi ${member.name.split(' ')[0]}, do you need any materials for ${member.project} this week?`;

    console.log(`[Twilio Mock] Sending to ${member.phone}: ${msg}`);
  });

  res.json({ success: true, message: `Check-in sent to ${crew.length} crew members.` });
});

// Twilio Webhook (Inbound SMS)
app.post('/api/twilio/inbound', (req, res) => {
  const { From, Body } = req.body;
  const messageBody = Body ? Body.trim() : '';
  const crew = readJsonFile(CREW_FILE);

  // Find crew member
  const member = crew.find(c => c.phone === From) || { name: 'Unknown', language: 'en', project: 'Unknown Project' };

  // Detect Spanish (very basic check for POC)
  const isSpanish = /necesito|para|tubos|gracias|hola|si|sí/i.test(messageBody) || member.language === 'es';
  const language = isSpanish ? 'es' : 'en';

  // Intent Classification (very basic)
  let intent = 'general';
  if (/(pipe|tubo|fitting|glue|pvc|copper)/i.test(messageBody)) {
    intent = 'material_request';
  }

  // Save Response
  const responses = readJsonFile(RESPONSES_FILE);
  const newResponse = {
    phone: From,
    name: member.name,
    project: member.project,
    message: messageBody,
    language,
    intent,
    timestamp: new Date().toISOString()
  };
  responses.unshift(newResponse); // Add to top
  writeJsonFile(RESPONSES_FILE, responses);

  // Generate Reply
  let replyMsg = '';
  if (intent === 'material_request') {
    replyMsg = language === 'es'
      ? `¡Recibido! Agregado a la lista de ${member.project}.`
      : `Got it! Added to the list for ${member.project}.`;
  } else {
    replyMsg = language === 'es'
      ? `¡Entendido! Le avisaré al jefe.`
      : `Understood! I'll let the boss know.`;
  }

  console.log(`[Twilio Mock] Replying to ${From}: ${replyMsg}`);

  // Send TwiML response
  res.set('Content-Type', 'text/xml');
  res.send(`
    <Response>
      <Message>${replyMsg}</Message>
    </Response>
  `);
});

// API for Demo Page
app.get('/api/check-in/responses', (req, res) => {
  const responses = readJsonFile(RESPONSES_FILE);
  res.json(responses);
});

app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
});
