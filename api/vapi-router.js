import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const body = req.body || {};
    const messageType = body?.message?.type;

    // Only intercept Vapi assistant-request events; pass other events through cleanly
    if (messageType && messageType !== 'assistant-request') {
      return res.status(200).json({ ok: true });
    }

    const vapiPhoneId = body?.message?.phoneNumber?.id || null;
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    let clinic = {
      clinic_name: 'Richmond Aesthetic & Outpatient Center',
      operating_days: 'Mon–Fri',
      operating_hours: '9:00 AM – 5:00 PM ET',
      services_offered: 'New Patient Consultations, Follow-Up Visits, Aesthetic & Outpatient Services',
      country: 'USA'
    };

    if (supabaseUrl && supabaseKey && vapiPhoneId) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data } = await supabase
        .from('clinics')
        .select('*')
        .eq('vapi_phone_id', vapiPhoneId)
        .limit(1);

      if (data && data.length > 0) {
        clinic = { ...clinic, ...data[0] };
      }
    }

    const complianceLabel = clinic.country === 'Canada' ? 'PIPEDA/PHIPA' : 'HIPAA';
    const systemPrompt = `You are Savannah, the 24/7 administrative receptionist for ${clinic.clinic_name}.
Operating Schedule: ${clinic.operating_days}, ${clinic.operating_hours}.
Approved Services: ${clinic.services_offered}.

STRICT RULES:
1. Administrative scheduling only (${complianceLabel}-safe). Never give medical advice, diagnose symptoms, or ask for Date of Birth, Home Address, or Insurance IDs.
2. Keep responses warm, concise, and natural (1–2 sentences max per turn).
3. Collect exactly 4 administrative intake items to book a consultation:
   - Patient Full Name
   - 10-digit Callback Phone Number (repeat back once to confirm, then immediately ask for email in the same breath)
   - Email Address
   - Preferred Day/Time & Consultation Reason
4. Mention our standard 24-hour cancellation courtesy notice, then call the book_consultation tool immediately without saying "just a moment".`;

    return res.status(200).json({
      assistant: {
        name: `${clinic.clinic_name} AI Receptionist`,
        firstMessage: `Thank you for calling ${clinic.clinic_name}. I'm Savannah, the 24/7 administrative scheduling assistant. How may I help reserve your consultation today?`,
        model: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          messages: [{ role: 'system', content: systemPrompt }]
        }
      }
    });
  } catch (err) {
    console.error('[VAPI_ROUTER_ERROR]:', err);
    return res.status(500).json({ error: 'Failed to resolve clinic assistant' });
  }
}
