// api/chat.js - Vercel Edge Function for Zero-Latency Llama 3.3
export const config = {
  runtime: 'edge',
};

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

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { messages } = await req.json();
    const apiKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Groq API Key on server.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages,
        ],
        temperature: 0.3,
        max_tokens: 350,
      }),
    });

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      return new Response(
        JSON.stringify({ error: `Groq upstream error: ${errText}` }),
        { status: groqResponse.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await groqResponse.json();
    const reply = data.choices[0].message.content;

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || 'Internal Edge Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}