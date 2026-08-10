import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || 'placeholder-key';
const supabase = createClient(supabaseUrl, supabaseKey);

// Auth Middleware
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = user;

  // Ensure a profile exists for this user
  let { data: profile } = await supabase
    .schema('field_req')
    .from('profiles')
    .select('*')
    .eq('email', user.email)
    .single();

  if (!profile) {
    const role = user.email === 'bradenchurch+1@gmail.com' ? 'admin' : 'user';
    const { data: newProfile, error: insertError } = await supabase
      .schema('field_req')
      .from('profiles')
      .insert({
        email: user.email,
        auth_id: user.id,
        role
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to create profile:", insertError);
      return res.status(500).json({ error: 'Failed to create user profile' });
    }
    profile = newProfile;
  }

  req.profile = profile;
  next();
}

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

// --- Crew Endpoints ---

app.get('/api/crew', authMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .schema('field_req')
    .from('crew_members')
    .select('*')
    .eq('profile_id', req.profile.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/crew', authMiddleware, async (req, res) => {
  const { name, phone, language } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'Name and phone required' });

  const { data, error } = await supabase
    .schema('field_req')
    .from('crew_members')
    .insert({ profile_id: req.profile.id, name, phone, language })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.patch('/api/crew/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const { data, error } = await supabase
    .schema('field_req')
    .from('crew_members')
    .update(updates)
    .eq('id', id)
    .eq('profile_id', req.profile.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete('/api/crew/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .schema('field_req')
    .from('crew_members')
    .delete()
    .eq('id', id)
    .eq('profile_id', req.profile.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// --- Project Endpoints ---

app.get('/api/projects', authMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .schema('field_req')
    .from('projects')
    .select('*')
    .eq('profile_id', req.profile.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/projects', authMiddleware, async (req, res) => {
  const { name, address, specs } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const { data, error } = await supabase
    .schema('field_req')
    .from('projects')
    .insert({ profile_id: req.profile.id, name, address, specs })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// --- Check-in and Inbound Endpoints ---

// API for Dashboard Check-in
app.get('/api/check-in/responses', authMiddleware, (req, res) => {
  // In a real app we'd fetch from Supabase. For this POC we can still use responses.json
  // OR we can migrate it to DB. Let's just use responses.json but protected, or if we need to migrate it:
  const responses = readJsonFile(RESPONSES_FILE);
  // Ideally, filter responses by req.profile.id by looking up phone numbers.
  // We'll keep it simple for the POC demo.
  res.json(responses);
});

// Simulated SMS Sending
app.post('/api/check-in/send', authMiddleware, async (req, res) => {
  const { data: crew, error } = await supabase
    .schema('field_req')
    .from('crew_members')
    .select('*')
    .eq('profile_id', req.profile.id);

  if (error || !crew) {
    return res.status(500).json({ error: 'Failed to fetch crew' });
  }

  // Here we would normally use Twilio to send SMS
  crew.forEach(member => {
    // Note: We don't have project assignment strictly tied in this POC, so we use a generic message.
    const msg = member.language === 'es'
      ? `Hola ${member.name.split(' ')[0]}, ¿necesitas algún material para esta semana?`
      : `Hi ${member.name.split(' ')[0]}, do you need any materials for this week?`;

    console.log(`[Twilio Mock] Sending to ${member.phone}: ${msg}`);
  });

  res.json({ success: true, message: `Check-in sent to ${crew.length} crew members.` });
});

// Twilio Webhook (Inbound SMS)
app.post('/api/twilio/inbound', async (req, res) => {
  const { From, Body } = req.body;
  const messageBody = Body ? Body.trim() : '';

  // Find crew member from Supabase
  const { data: member } = await supabase
    .schema('field_req')
    .from('crew_members')
    .select('*')
    .eq('phone', From)
    .single();

  const foundMember = member || { name: 'Unknown', language: 'en', project: 'Unknown Project' };

  // Detect Spanish
  const isSpanish = /necesito|para|tubos|gracias|hola|si|sí/i.test(messageBody) || foundMember.language === 'es';
  const language = isSpanish ? 'es' : 'en';

  // Intent Classification
  let intent = 'general';
  if (/(pipe|tubo|fitting|glue|pvc|copper)/i.test(messageBody)) {
    intent = 'material_request';
  }

  // Save Response to JSON for POC
  const responses = readJsonFile(RESPONSES_FILE);
  const newResponse = {
    phone: From,
    name: foundMember.name,
    project: foundMember.project || 'General',
    message: messageBody,
    language,
    intent,
    timestamp: new Date().toISOString()
  };
  responses.unshift(newResponse);
  writeJsonFile(RESPONSES_FILE, responses);

  // Generate Reply
  let replyMsg = '';
  if (intent === 'material_request') {
    replyMsg = language === 'es'
      ? `¡Recibido! Agregado a la lista.`
      : `Got it! Added to the list.`;
  } else {
    replyMsg = language === 'es'
      ? `¡Entendido! Le avisaré al jefe.`
      : `Understood! I'll let the boss know.`;
  }

  console.log(`[Twilio Mock] Replying to ${From}: ${replyMsg}`);

  res.set('Content-Type', 'text/xml');
  res.send(`
    <Response>
      <Message>${replyMsg}</Message>
    </Response>
  `);
});

// Account Provisioning
app.post('/api/provision', authMiddleware, async (req, res) => {
  if (req.profile.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can provision accounts' });
  }

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  // Use Supabase to send a magic link to the invited user
  const origin = req.headers.origin || 'http://localhost:5173';
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`
    }
  });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ success: true, message: `Magic link sent to ${email}` });
});

app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
});
