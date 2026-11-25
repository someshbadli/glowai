import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const rawBody = req.body || {};
    // Support both direct JSON calls and Vapi tool-call nested payloads
    const toolArgs =
      rawBody?.message?.toolCalls?.[0]?.function?.arguments ||
      rawBody?.message?.toolWithToolCallList?.[0]?.toolCall?.function?.arguments ||
      rawBody;

    const parsedArgs = typeof toolArgs === 'string' ? JSON.parse(toolArgs) : toolArgs;

    const {
      clinic_id = 'richmond-pilot-01',
      patient_name,
      patient_phone,
      patient_email,
      service_name,
      service_reason,
      start_time,
      slot_time
    } = parsedArgs;

    const vapiPhoneId = rawBody?.message?.phoneNumber?.id || null;
    const patient = patient_name || 'Patient';
    const phone = patient_phone || rawBody?.message?.customer?.number || 'Unlisted';
    const email = patient_email || 'Unlisted';
    const service = service_name || service_reason || 'Consultation';
    const time = start_time || slot_time || 'Next Available Slot';

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    let resolvedClinicId = clinic_id;
    let resolvedClinicName = 'Glow AI Enrolled Clinic';
    let clinicContactEmail = 'someshbadli@gmail.com';

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Look up clinic dynamically by vapi_phone_id first, then fallback to clinic_id/email
      let clinicQuery = supabase.from('clinics').select('*');
      if (vapiPhoneId) {
        clinicQuery = clinicQuery.eq('vapi_phone_id', vapiPhoneId);
      } else {
        clinicQuery = clinicQuery.eq('email', clinic_id);
      }

      const { data: clinics } = await clinicQuery.limit(1);
      if (clinics && clinics.length > 0) {
        resolvedClinicId = clinics[0].email || clinics[0].id;
        resolvedClinicName = clinics[0].clinic_name || resolvedClinicName;
        clinicContactEmail = clinics[0].email || clinicContactEmail;
      }

      await supabase.from('appointments').insert([
        {
          clinic_id: resolvedClinicId,
          clinic_name: resolvedClinicName,
          patient_name: patient,
          patient_phone: phone,
          patient_email: email,
          service_name: service,
          slot_time: time,
          source: vapiPhoneId ? 'vapi_voice' : 'web_or_api',
          status: 'confirmed'
        }
      ]);
    }

    // Dispatch instant booking notification via Web3Forms to clinic + admin
    const web3Key = process.env.VITE_WEB3FORMS_KEY || 'd24cb467-d97f-4fca-9689-aab1f1ac5344';
    await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: web3Key,
        subject: `New Glow AI Appointment — ${resolvedClinicName} (${patient})`,
        from_name: 'Glow AI Autonomous Receptionist',
        Clinic: resolvedClinicName,
        Clinic_Email: clinicContactEmail,
        Patient_Name: patient,
        Patient_Phone: phone,
        Patient_Email: email,
        Service: service,
        Scheduled_Time: time
      })
    }).catch(() => {});

    const confirmationText = `Consultation reserved for ${patient} for ${service} on ${time} at ${resolvedClinicName}. Confirmation logged for ${email}.`;

    return res.status(200).json({
      result: confirmationText,
      success: true,
      message: confirmationText,
      booking_id: `rec_${Date.now()}`,
      clinic: resolvedClinicName,
      intake: { patient, phone, email, service, time }
    });
  } catch (err) {
    console.error('[MULTI_TENANT_BOOKING_ERROR]:', err);
    return res.status(500).json({
      result: 'There was a temporary issue logging the appointment. Our front desk will follow up shortly.',
      error: 'Internal Server Error'
    });
  }
}
