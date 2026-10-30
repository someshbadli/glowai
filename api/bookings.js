export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = req.body || {};
    const { 
      clinic_id = 'richmond-pilot-01', 
      patient_name, 
      patient_phone, 
      patient_email, 
      service_name, 
      service_reason, 
      start_time, 
      slot_time 
    } = body;

    const patient = patient_name || 'Patient';
    const phone = patient_phone || 'Unlisted';
    const email = patient_email || 'Unlisted';
    const service = service_name || service_reason || 'Doctor Consultation';
    const time = start_time || slot_time || 'Tomorrow at 10:00 AM';

    console.log('[AUTONOMOUS RECEPTIONIST INTAKE HIT]');
    console.log(`Clinic: ${clinic_id}`);
    console.log(`Patient: ${patient} | Phone: ${phone} | Email: ${email}`);
    console.log(`Service: ${service} | Time: ${time}`);

    const confirmationSummary = `Consultation reserved for ${patient} for ${service} on ${time}. Logged under ${email}.`;

    return res.status(200).json({
      result: confirmationSummary,
      success: true,
      message: confirmationSummary,
      booking_id: `rec_${Date.now()}`,
      intake: { patient, phone, email, service, time }
    });
  } catch (err) {
    console.error('[BOOKING_ERROR]:', err);
    return res.status(500).json({ 
      result: "Failed to record consultation.",
      error: 'Internal Server Error' 
    });
  }
}
