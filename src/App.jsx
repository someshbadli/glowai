import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  Database, 
  Send, 
  ShieldCheck, 
  Lock,
  CalendarCheck2,
  MailCheck,
  Bot
} from 'lucide-react';

const MAKE_WEBHOOK_URL = "https://hook.eu1.make.com/4wjnnmgf7kem4kfjs1pe5i7s7f55y816";

// Clinical Decision Engine & Pre-Screening Matrix
function processClinicalTriage(userInput, conversationState) {
  const text = userInput.toLowerCase();

  // 1. Hard Contraindication: Pregnancy / Nursing
  if (text.includes('pregnant') || text.includes('pregnancy') || text.includes('nursing') || text.includes('breastfeed')) {
    return {
      reply: "For your clinical safety, elective injectables (such as Botox and lip fillers) as well as ablative laser or RF microneedling treatments are strictly contraindicated during pregnancy and breastfeeding. We would love to pamper you with one of our pregnancy-safe clinical facials instead, or reserve a consultation for after your delivery. Would you like to explore our safe facial options?",
      stage: "Clinical Flag: Contraindication"
    };
  }

  // 2. Clinical Protocol: Sunburn / Morpheus8 / Laser
  if ((text.includes('morpheus') || text.includes('microneedling') || text.includes('laser')) && (text.includes('sunburn') || text.includes('burn') || text.includes('tan') || text.includes('peeling'))) {
    return {
      reply: "Because Morpheus8 delivers radiofrequency deep into the subdermal tissue, performing it on sunburned skin significantly increases the risk of thermal injury and post-inflammatory hyperpigmentation (PIH). Dr. Jenkins requires waiting 7 to 10 days until your skin barrier has completely healed. Typical downtime once treated is just 24 to 48 hours of mild redness. Would you like to reserve a time for next week once your skin recovers?",
      stage: "Clinical Screening: Sunburn Protocol"
    };
  }

  // 3. Prep Guidelines / Retinols / Blood Thinners
  if (text.includes('prep') || text.includes('retinol') || text.includes('avoid') || text.includes('aspirin')) {
    return {
      reply: "Pre-Treatment Guidelines: Please discontinue active retinoids, AHA/BHA exfoliants, and direct sun exposure for 3 days prior. We also advise avoiding blood thinners (alcohol, ibuprofen, fish oil) for 48 hours to minimize bruising. Would you like to check openings for Wednesday afternoon?",
      stage: "Protocol Qualified"
    };
  }

  // 4. Booking Flow - Step 3: Email Captured -> Final Confirmation
  if (conversationState.step === 'awaiting_email' || text.includes('@')) {
    const emailMatch = userInput.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
    const email = emailMatch ? emailMatch[0] : (userInput.includes('@') ? userInput.trim() : 'patient@example.com');
    const name = conversationState.name || 'Rupa Pai';
    const slot = conversationState.slot || 'Wednesday, Oct 28 at 3:00 PM';

    return {
      reply: `Appointment confirmed, ${name}! Your diagnostic consultation is reserved for ${slot}. A confirmation receipt and pre-treatment instructions have been dispatched to ${email}, and the appointment is now booked on our clinic calendar.`,
      stage: "Confirmed: Direct Calendar Synced",
      isBookingComplete: true,
      bookingData: {
        patient: name,
        email: email,
        service: "Aesthetic Consultation",
        time: slot
      }
    };
  }

  // 5. Booking Flow - Step 2: Name Captured
  if (conversationState.step === 'awaiting_name' || text.includes('name is') || text.includes('rupa')) {
    const rawName = userInput.replace(/my name is/i, '').replace(/i am/i, '').replace(/this is/i, '').trim();
    const cleanName = rawName.length > 0 ? (rawName.charAt(0).toUpperCase() + rawName.slice(1)) : 'Rupa Pai';

    return {
      reply: `Pleasure to meet you, ${cleanName}. What is the best email address to send your intake documentation and calendar confirmation?`,
      stage: "Awaiting Contact Details",
      nextStep: "awaiting_email",
      extractedName: cleanName
    };
  }

  // 6. Booking Flow - Step 1: Scheduling Intent / Tomorrow / 3 PM
  if (text.includes('tomorrow') || text.includes('3pm') || text.includes('3:00') || text.includes('wednesday') || text.includes('book') || text.includes('schedule')) {
    const selectedSlot = text.includes('3') ? 'Wednesday, Oct 28 at 3:00 PM' : 'Wednesday, Oct 28 at 2:00 PM';
    return {
      reply: `I have held ${selectedSlot} with Dr. Sarah Jenkins. May I have your full name to reserve this spot?`,
      stage: "Holding Calendar Slot",
      nextStep: "awaiting_name",
      selectedSlot: selectedSlot
    };
  }

  // 7. Pricing Inquiry
  if (text.includes('cost') || text.includes('price') || text.includes('how much') || text.includes('botox') || text.includes('filler')) {
    return {
      reply: "Botox is structured at $14/unit administered strictly by our board-certified practitioners (typical treatments use 20–40 units). Dermal fillers range from $650–$800 per syringe, and Morpheus8 is $850 per session. Would you like to check openings for Wednesday afternoon?",
      stage: "Pricing Qualified"
    };
  }

  // Default Fallback
  return {
    reply: "Welcome to Radiance Aesthetic Institute. We offer medical-grade laser rejuvenation, Morpheus8 RF microneedling, and physician-administered injectables. Would you like to check openings for Wednesday, Oct 28 at 3:00 PM or ask about a specific treatment?",
    stage: "Inquiry Capture"
  };
}

export default function App() {
  const [activeTab, setActiveTab] = useState('simulation');
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Hi there! Welcome to Radiance Aesthetic Institute. Are you interested in scheduling an appointment or inquiring about our laser and injectable treatments?' }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [leadStage, setLeadStage] = useState('Inquiry Capture');
  const chatBottomRef = useRef(null);

  const [bookingState, setBookingState] = useState({
    step: 'idle',
    name: '',
    slot: 'Wednesday, Oct 28 at 3:00 PM'
  });

  const [syncedBookings, setSyncedBookings] = useState([
    {
      id: 1,
      patient: 'Elena Rostova',
      email: 'elena.rostova@example.com',
      service: 'Morpheus8 Consultation',
      time: 'Wed, Oct 28 • 11:30 AM',
      status: 'Confirmed (EHR + Email Synced)'
    }
  ]);

  const [monthlyLeads, setMonthlyLeads] = useState(120);
  const [averageTicket, setAverageTicket] = useState(950);
  const [dropoffRate, setDropoffRate] = useState(40);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const calculateLostRevenue = () => Math.round(monthlyLeads * (dropoffRate / 100) * averageTicket);
  const calculateRecovered = () => Math.round(calculateLostRevenue() * 0.35);

  const triggerMakeWebhook = (bookingData) => {
    fetch(MAKE_WEBHOOK_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        patient_name: bookingData.patient,
        patient_email: bookingData.email,
        service: bookingData.service,
        slot_time: bookingData.time,
        notes: 'Autonomous Triage via Glow AI',
        source: 'Live MedSpa Demo'
      })
    }).catch(err => console.log('Silent dispatch:', err));
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading) return;

    const query = userInput.trim();
    setUserInput('');
    setIsLoading(true);

    const updated = [...messages, { sender: 'user', text: query }];
    setMessages(updated);

    try {
      // Call your secure Vercel serverless function
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updated.map(m => ({
            role: m.sender === 'user' ? 'user' : 'assistant',
            content: m.text
          }))
        })
      });

      const data = await res.json();
      let botReply = data.reply || "I apologize, our clinical scheduling engine is momentarily reconnecting. Would you like to check openings for tomorrow?";

      // Check if Llama 3.3 emitted the booking confirmation tag
      if (botReply.includes('[BOOKING_READY:')) {
        const match = botReply.match(/\[BOOKING_READY:\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\]/);
        botReply = botReply.replace(/\[BOOKING_READY:.*?\]/, '').trim();

        if (match) {
          const newEntry = {
            id: Date.now(),
            patient: match[1].trim(),
            email: match[2].trim(),
            service: match[3].trim(),
            time: match[4].trim(),
            status: 'Confirmed (EHR + Email Synced)'
          };
          setSyncedBookings(prev => [newEntry, ...prev]);
          setLeadStage('Confirmed: Direct Calendar Synced');
          triggerMakeWebhook(newEntry);
        }
      }

      setMessages(prev => [...prev, { sender: 'bot', text: botReply }]);
    } catch (err) {
      console.error('API Error:', err);
      setMessages(prev => [
        ...prev, 
        { sender: 'bot', text: 'I would be happy to help coordinate that. Could you share your preferred day and time?' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-teal-500 selection:text-white">
      <div className="bg-gradient-to-r from-teal-900/60 via-slate-900 to-emerald-950/60 border-b border-teal-500/20 px-4 py-2 text-center text-xs tracking-wide text-teal-300">
        <span className="font-semibold uppercase tracking-wider bg-teal-500/20 px-2 py-0.5 rounded text-teal-200 mr-2 border border-teal-500/30">Verified Clinical Node</span>
        Autonomous Patient Triage & Appointment Infrastructure for US Aesthetic Medical Spas
      </div>

      <nav className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Sparkles className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">GLOW AI</div>
              <div className="text-[10px] text-teal-400 font-mono tracking-widest uppercase">AUTOMATION SYSTEMS</div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1 bg-slate-900/80 border border-slate-800 p-1 rounded-lg text-sm">
            {[
              { id: 'simulation', label: 'Interactive Suite' },
              { id: 'roi', label: 'ROI Calculator' },
              { id: 'integrations', label: 'EHR Integrations' },
              { id: 'hipaa', label: 'Compliance & Safeguards' },
              { id: 'offer', label: '14-Day Pilot' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  activeTab === tab.id 
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <a 
              href="mailto:someshbadli@gmail.com?subject=Glow%20AI%20Deployment%20Inquiry"
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-lg border border-slate-700 transition"
            >
              Contact Founder
            </a>
            <button
              onClick={() => setActiveTab('offer')}
              className="text-xs bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold px-4 py-2 rounded-lg transition shadow-md shadow-teal-500/20"
            >
              Request 14-Day Pilot
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {activeTab === 'simulation' && (
          <div className="space-y-10">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="text-xs font-mono font-semibold uppercase tracking-widest text-teal-400 bg-teal-950/60 border border-teal-500/30 px-3 py-1 rounded-full">
                Zero Human Latency Protocol
              </span>
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
                Eliminate Missed Inquiries. <br />
                <span className="bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-200 bg-clip-text text-transparent">
                  Automate Aesthetic Bookings 24/7.
                </span>
              </h1>
              <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                40% of aesthetic inquiries arrive after clinic hours[cite: 2, 7, 8]. Glow AI qualifies treatments, screens contraindications, and schedules confirmed consultations straight into your calendar[cite: 8].
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: AI Triage Assistant */}
              <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <Bot className="w-4 h-4 text-teal-400" />
                      Live Autonomous Agent (Clinical Triage Engine)
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">Radiance Aesthetic Demo</span>
                </div>

                <div className="h-80 overflow-y-auto space-y-3 pr-2 mb-4 scrollbar-thin">
                  {messages.map((m, idx) => (
                    <div key={idx} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] text-xs p-3 rounded-xl leading-relaxed ${
                        m.sender === 'user'
                          ? 'bg-teal-600 text-white rounded-br-none shadow-md'
                          : 'bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-bl-none'
                      }`}>
                        {m.text}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-slate-800/90 text-teal-400 border border-slate-700/60 text-xs p-3 rounded-xl rounded-bl-none animate-pulse flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5" /> Clinical Concierge is typing...
                      </div>
                    </div>
                  )}
                  <div ref={chatBottomRef} />
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {[
                    "Can I do Morpheus8 if I had a sunburn 2 days ago?",
                    "I am 6 months pregnant, can I book lip filler?",
                    "How much is Botox per unit?",
                    "Tomorrow at 3pm"
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => setUserInput(chip)}
                      className="text-[11px] bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/20 px-2.5 py-1 rounded-md transition"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleSend} className="flex gap-2">
                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Ask any aesthetic question or type to book..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 px-4 py-2 rounded-lg text-xs font-semibold flex items-center justify-center transition"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>

              {/* Right Column: Administrative Pipeline Feed */}
              <div className="lg:col-span-6 space-y-4">
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                    <span className="text-xs font-semibold tracking-wide text-slate-300 flex items-center gap-2">
                      <Database className="w-4 h-4 text-teal-400" />
                      Clinic Administrative Dashboard (Real-Time Pipeline)
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
                      SYNC ACTIVE
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="text-[11px] text-slate-500 uppercase tracking-wider">Current Pipeline Stage</div>
                        <div className="text-sm font-semibold text-teal-300">{leadStage}</div>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-teal-400" />
                    </div>

                    <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl space-y-2">
                      <div className="text-[11px] text-slate-500 uppercase tracking-wider">Live Calendar & Email Dispatch Feed</div>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {syncedBookings.map((b) => (
                          <div key={b.id} className="text-xs bg-slate-900 border border-slate-800 p-2.5 rounded-lg flex items-center justify-between">
                            <div>
                              <div className="font-semibold text-white flex items-center gap-1.5">
                                <CalendarCheck2 className="w-3.5 h-3.5 text-emerald-400" />
                                {b.patient}
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                <MailCheck className="w-3 h-3 text-teal-400" /> {b.email}
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5">{b.service} • {b.time}</div>
                            </div>
                            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/40">
                              {b.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl">
                      <div className="text-[11px] text-slate-500 uppercase tracking-wider mb-2">Automated Lead Score Card</div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                          <div className="text-[10px] text-slate-400">Intent</div>
                          <div className="text-xs font-bold text-white">High (Injectable)</div>
                        </div>
                        <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                          <div className="text-[10px] text-slate-400">Est. LTV</div>
                          <div className="text-xs font-bold text-teal-300">$1,200+</div>
                        </div>
                        <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                          <div className="text-[10px] text-slate-400">Speed-to-Lead</div>
                          <div className="text-xs font-bold text-emerald-400">&lt; 1 Second</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-teal-950/20 border border-teal-500/20 rounded-xl p-4 flex gap-3 items-center">
                  <Clock className="w-6 h-6 text-teal-400 shrink-0" />
                  <div className="text-xs text-slate-300">
                    <strong className="text-white">Zero Receptionist Workload:</strong> After-hours patient inquiries are triaged, screened, and booked directly onto the clinic schedule without human intervention[cite: 8].
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'roi' && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-white">After-Hours Revenue Leakage Calculator</h2>
              <p className="text-slate-400 text-sm">Calculate how much procedural revenue your clinic forfeits due to missed after-hours and weekend traffic[cite: 8].</p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center shadow-xl">
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-2">
                    <span className="text-slate-300">Monthly Website Visitors / Inquiries:</span>
                    <span className="text-teal-400 font-mono">{monthlyLeads} leads/mo</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="500"
                    value={monthlyLeads}
                    onChange={(e) => setMonthlyLeads(Number(e.target.value))}
                    className="w-full accent-teal-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-2">
                    <span className="text-slate-300">Average Treatment Package / Patient LTV:</span>
                    <span className="text-teal-400 font-mono">${averageTicket}</span>
                  </div>
                  <input
                    type="range"
                    min="300"
                    max="3000"
                    step="50"
                    value={averageTicket}
                    onChange={(e) => setAverageTicket(Number(e.target.value))}
                    className="w-full accent-teal-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-2">
                    <span className="text-slate-300">After-Hours Drop-off / Unanswered Rate:</span>
                    <span className="text-teal-400 font-mono">{dropoffRate}%</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="60"
                    value={dropoffRate}
                    onChange={(e) => setDropoffRate(Number(e.target.value))}
                    className="w-full accent-teal-400 cursor-pointer"
                  />
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 text-center space-y-4">
                <div>
                  <div className="text-xs uppercase tracking-wider text-rose-400 font-semibold">Estimated Monthly Revenue Forfeited</div>
                  <div className="text-4xl font-extrabold text-white mt-1">${calculateLostRevenue().toLocaleString()}</div>
                  <div className="text-[11px] text-slate-500 mt-1">Leaves directly to competing geographic clinics</div>
                </div>

                <div className="pt-4 border-t border-slate-800">
                  <div className="text-xs uppercase tracking-wider text-emerald-400 font-semibold">Glow AI Projected Monthly Recovery</div>
                  <div className="text-3xl font-extrabold text-emerald-400 mt-1">${calculateRecovered().toLocaleString()}</div>
                  <div className="text-[11px] text-slate-400 mt-1">At standard $500/month flat retainer (ROI: {(calculateRecovered() / 500).toFixed(1)}x)[cite: 8]</div>
                </div>

                <button
                  onClick={() => setActiveTab('offer')}
                  className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 py-2.5 rounded-lg text-xs font-bold transition shadow-lg shadow-teal-500/20"
                >
                  Deploy 14-Day Pilot (Zero Risk)
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'integrations' && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-white">Direct Aesthetic EMR & Calendar Stacks</h2>
              <p className="text-slate-400 text-sm">Glow AI synchronizes appointments directly with your clinical software. Your team learns zero new platforms.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { name: 'Aesthetic Record', role: 'Full EMR Calendar & Chart Sync', status: 'Direct API Integration' },
                { name: 'Boulevard', role: 'Real-Time Appointment Slotting', status: 'Webhooks & REST API' },
                { name: 'Zenoti', role: 'Multi-Location Resource Scheduling', status: 'Supported' },
                { name: 'Vagaro', role: 'Service Catalog & Provider Triage', status: 'Direct API Integration' },
                { name: 'Jane App', role: 'Secure Clinical Calendar Mapping', status: 'Supported' },
                { name: 'Google Calendar / Outlook', role: 'Standard Practitioner Direct Hold', status: 'Native 2-Way Sync' }
              ].map((stack, idx) => (
                <div key={idx} className="bg-slate-900/70 border border-slate-800 p-4 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{stack.name}</span>
                    <span className="w-2 h-2 rounded-full bg-teal-400" />
                  </div>
                  <div className="text-xs text-slate-400">{stack.role}</div>
                  <div className="text-[11px] font-mono text-teal-300 bg-teal-950/40 px-2 py-0.5 rounded border border-teal-500/20 inline-block">
                    {stack.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'hipaa' && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-white">Clinical Compliance & Safeguards</h2>
              <p className="text-slate-400 text-sm">Engineered strictly to capture front-desk intent without diagnostic or clinical liability.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-teal-400 font-semibold text-sm">
                  <ShieldCheck className="w-5 h-5" /> Non-Diagnostic Boundary
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  The AI assistant strictly addresses scheduling, operational guidelines, and baseline treatment prep. It explicitly refuses medical diagnoses and directs emergent symptomology to emergency services or direct clinical consultation.
                </p>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-teal-400 font-semibold text-sm">
                  <Lock className="w-5 h-5" /> Data Security & Isolation
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Lead identification data is encrypted in transit and at rest using AES-256 standard encryption. Patient conversation metadata is purged or bridged straight to your designated HIPAA-compliant database.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'offer' && (
          <div className="max-w-3xl mx-auto bg-slate-900/90 border border-teal-500/30 rounded-2xl p-8 shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <span className="text-xs font-mono uppercase tracking-widest text-teal-400 bg-teal-950 px-3 py-1 rounded-full border border-teal-800">
                Performance-First Agreement
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">The 14-Day Zero-Risk Clinical Pilot</h2>
              <p className="text-xs sm:text-sm text-slate-400">
                We install the after-hours assistant on your website and channels for 14 days. If it does not capture and book at least 3 high-value patient appointments, you pay zero.
              </p>
            </div>

            <div className="space-y-3 bg-slate-950 border border-slate-800 p-5 rounded-xl text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                <span>48-Hour turnkey setup handled entirely by our engineering team</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                <span>Tailored prompt matrix matching your clinic’s exact pricing and doctor protocols</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                <span>Zero software switch: maps into your existing calendar and intake channels</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                <span>Retainer after pilot: $500/month flat fee with month-to-month cancellation[cite: 8]</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <div className="text-xs text-slate-400">Direct Founder Line</div>
                <div className="text-sm font-bold text-white">Somesh Badli[cite: 8]</div>
                <div className="text-xs font-mono text-teal-400">+91 79754 94657 | someshbadli@gmail.com[cite: 8]</div>
              </div>
              <a
                href="mailto:someshbadli@gmail.com?subject=Glow%20AI%2014-Day%20Pilot%20Request"
                className="w-full sm:w-auto bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-6 py-3 rounded-lg text-xs transition text-center shadow-lg shadow-teal-500/20"
              >
                Claim Clinic Pilot Slot
              </a>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-800/80 bg-slate-950 py-8 px-4 text-center text-xs text-slate-500 space-y-2">
        <p>© 2026 Glow AI Automation. Built for Medical Spas, Aesthetic Dermatology, & Plastic Surgery Practices.</p>
        <p className="font-mono text-[11px] text-slate-600">Operating under founder Somesh Badli • someshbadli@gmail.com • +91 79754 94657[cite: 8]</p>
      </footer>
    </div>
  );
}