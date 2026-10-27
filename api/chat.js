// api/chat.js - Vercel Serverless API Proxy for Groq
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { messages } = req.body;
  const apiKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Missing Groq API Key in environment variables.' });
  }

  const SYSTEM_PROMPT = `
You are the AI Front-Desk Concierge for Radiance Aesthetic Institute led by Dr. Sarah Jenkins.
CLINICAL & PRICING RULES:
1. Botox is $14/unit (20-40 units typical). Fillers are $650-$800/syringe. Morpheus8 is $850/session (minimal 24-48 hr downtime).
2. SUNBURN / MORPHEUS8: If the patient had a sunburn within the last 7-10 days, advise that Morpheus8 radiofrequency microneedling cannot be performed on compromised or peeling skin due to high risk of post-inflammatory hyperpigmentation (PIH). Advise waiting until skin is 100% healed.
3. PREGNANCY: Elective Botox, fillers, and lasers are strictly contraindicated during pregnancy or breastfeeding. Refuse gently and offer safe hydrating facials.
4. BOOKING CONVERSATION:
   - Understand time requests flexibly. If someone says "tomorrow at 8pm", acknowledge that the clinic closes at 6:00 PM, or offer an available evening slot like 5:00 PM, or accommodate their request if reasonable.
   - When asking for details, keep it natural: ask for their name, then their email.
   - If they correct a time (e.g., "not 2 pm, its 8 pm"), recognize the correction immediately and DO NOT confuse it for their name!
5. TRIGGER FORMAT: When you have confirmed their Name, Email, Service, and Date/Time, append this tag at the very end of your response:
   [BOOKING_READY: Patient Name | Email | Service | Slot Time]
`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages
        ],
        temperature: 0.3,
        max_tokens: 350
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: errText });
    }

    const data = await response.json();
    const reply = data.choices[0].message.content;
    return res.status(200).json({ reply });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
