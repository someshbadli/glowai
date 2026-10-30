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
  PhoneCall,
  Bot
} from 'lucide-react';

export const SYSTEM_PROMPT = `You are the after-hours administrative receptionist for the clinic.
Your objective is strictly administrative: schedule an in-person consultation by gathering patient details.

RULES:
1. ZERO MEDICAL ADVICE: Never diagnose, triage, or evaluate contraindications (e.g., sunburn, pregnancy, peeling, medications, downtime). If a patient asks a clinical or treatment question, respond:
   "That is a great question for the doctor during your consultation. Let's get you scheduled so the clinical team can review this in person."
2. 4-POINT INTAKE ONLY: Capture exactly these four items:
   - Full Name
   - Phone Number
   - Email Address
   - Reason for Visit / Desired Service
3. SCHEDULING:
   - Offer standard openings (e.g., tomorrow at 10:00 AM or 2:00 PM).
   - Once all 4 points are gathered and the patient confirms a time, confirm the booking and end your reply with the trigger tag:
   [BOOKING_READY: Full Name | Phone Number | Email | Reason for Visit | Slot Time]
4. STYLE: Polite, concise, and purely administrative. 1 to 2 sentences per reply.`;

export default function App() {
  const [activeTab, setActiveTab] = useState('simulation');
  const [messages, setMessages] = useState([
    { 
      sender: 'bot', 
      text: 'Hello, thank you for contacting the clinic. I can reserve an in-person consultation for you. What day or time works best for you?' 
    }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [leadStage, setLeadStage] = useState('Administrative Intake');
  const chatBottomRef = useRef(null);

  // 4-Point Intake State Tracker
  const [intakeState, setIntakeState] = useState({
    name: '',
    phone: '',
    email: '',
    service: '',
    slot: 'Tomorrow at 10:00 AM'
  });

  const [syncedBookings, setSyncedBookings] = useState([
    {
      id: 1,
      patient: 'Sarah Jenkins',
      phone: '(804) 555-0192',
      email: 's.jenkins@example.com',
      service: 'In-Person Consultation',
      time: 'Tomorrow • 10:00 AM',
      status: 'Confirmed (Calendar Synced)'
    }
  ]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Dispatch directly to local multi-tenant API
  const dispatchBooking = async (bookingData) => {
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinic_id: 'richmond-pilot-01',
          patient_name: bookingData.patient,
          patient_phone: bookingData.phone,
          patient_email: bookingData.email,
          service_reason: bookingData.service,
          slot_time: bookingData.time
        })
      });
      const data = await response.json();
      console.log('[BOOKING DISPATCH SUCCESS]:', data);
    } catch (err) {
      console.log('[BOOKING DISPATCH LOCAL LOG]:', err);
    }
  };

  // Pure Administrative Fallback & Guardrail Engine
  const processAdministrativeTurn = (text, currentState) => {
    const q = text.toLowerCase();
    const updated = { ...currentState };

    // 1. Clinical / Malpractice Deflection Guardrail
    if (
      q.includes('sunburn') || 
      q.includes('burn') || 
      q.includes('pregnant') || 
      q.includes('pregnancy') || 
      q.includes('peeling') || 
      q.includes('downtime') || 
      q.includes('safe') || 
      q.includes('retinol') ||
      q.includes('contraindication')
    ) {
      return {
        reply: "That is a great question for the doctor during your consultation. Let's get you scheduled so the clinical team can review this in person. What day or time works best for you?",
        stage: "Clinical Deflection -> In-Person Consultation",
        state: updated
      };
    }

    // Extract Email
    const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) updated.email = emailMatch[0];

    // Extract Phone
    const phoneMatch = text.match(/(\+?\d{1,2}\s?)?(\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}/);
    if (phoneMatch && phoneMatch[0].length >= 10) updated.phone = phoneMatch[0];

    // Extract Desired Service / Reason
    if (q.includes('morpheus') || q.includes('botox') || q.includes('filler') || q.includes('laser') || q.includes('facial')) {
      if (q.includes('morpheus')) updated.service = 'Morpheus8 Consultation';
      else if (q.includes('botox')) updated.service = 'Botox Consultation';
      else if (q.includes('filler')) updated.service = 'Dermal Filler Consultation';
      else updated.service = 'Aesthetic Consultation';
    }

    // Extract Slot / Time
    if (q.includes('tomorrow') || q.includes('2pm') || q.includes('10am') || q.includes('afternoon') || q.includes('morning')) {
      if (q.includes('2') || q.includes('afternoon')) updated.slot = 'Tomorrow at 2:00 PM';
      else updated.slot = 'Tomorrow at 10:00 AM';
    }

    // Extract Name
    if (q.includes('name is') || q.includes('i am') || q.includes('this is')) {
      const clean = text.replace(/my name is/i, '').replace(/i am/i, '').replace(/this is/i, '').split(/[,.]/)[0].trim();
      if (clean) updated.name = clean;
    } else if (!updated.name && !emailMatch && !phoneMatch && text.trim().split(' ').length <= 3 && !q.includes('book') && !q.includes('pm') && !q.includes('am')) {
      updated.name = text.trim();
    }

    // Missing Field Prompts (Strict 4-Point Intake)
    if (!updated.name) {
      return {
        reply: "I would be happy to reserve that consultation slot. May I have your full name?",
        stage: "Intake: Awaiting Full Name",
        state: updated
      };
    }

    if (!updated.phone) {
      return {
        reply: `Pleasure to assist you, ${updated.name}. What is the best phone number for the clinic to reach you?`,
        stage: "Intake: Awaiting Phone Number",
        state: updated
      };
    }

    if (!updated.email) {
      return {
        reply: "Thank you. What email address should we send your appointment confirmation to?",
        stage: "Intake: Awaiting Email Address",
        state: updated
      };
    }

    if (!updated.service) {
      return {
        reply: "Got it. What service or reason for visit would you like to discuss with the doctor?",
        stage: "Intake: Awaiting Reason for Visit",
        state: updated
      };
    }

    // All 4 points completed
    const confirmedBooking = {
      patient: updated.name,
      phone: updated.phone,
      email: updated.email,
      service: updated.service || 'Doctor Consultation',
      time: updated.slot || 'Tomorrow at 10:00 AM'
    };

    return {
      reply: `Your consultation is reserved for ${confirmedBooking.time}. A confirmation has been sent to ${confirmedBooking.email}. We look forward to seeing you!`,
      stage: "Appointment Confirmed (Calendar Synced)",
      state: updated,
      bookingComplete: confirmedBooking
    };
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading) return;

    const query = userInput.trim();
    setUserInput('');
    setIsLoading(true);

    const updatedMessages = [...messages, { sender: 'user', text: query }];
    setMessages(updatedMessages);

    setTimeout(() => {
      const result = processAdministrativeTurn(query, intakeState);
      setIntakeState(result.state);
      setLeadStage(result.stage);

      if (result.bookingComplete) {
        const newEntry = {
          id: Date.now(),
          patient: result.bookingComplete.patient,
          phone: result.bookingComplete.phone,
          email: result.bookingComplete.email,
          service: result.bookingComplete.service,
          time: result.bookingComplete.time,
          status: 'Confirmed (Calendar Synced)'
        };
        setSyncedBookings(prev => [newEntry, ...prev]);
        dispatchBooking(result.bookingComplete);
      }

      setMessages(prev => [...prev, { sender: 'bot', text: result.reply }]);
      setIsLoading(false);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-teal-500 selection:text-white">
      <div className="bg-gradient-to-r from-teal-900/60 via-slate-900 to-emerald-950/60 border-b border-teal-500/20 px-4 py-2 text-center text-xs tracking-wide text-teal-300">
        <span className="font-semibold uppercase tracking-wider bg-teal-500/20 px-2 py-0.5 rounded text-teal-200 mr-2 border border-teal-500/30">K.I.S.S. Model Node</span>
        Autonomous Administrative Receptionist • Zero Malpractice Liability
      </div>

      <nav className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Sparkles className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">GLOW AI</div>
              <div className="text-[10px] text-teal-400 font-mono tracking-widest uppercase">AUTONOMOUS RECEPTIONIST</div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1 bg-slate-900/80 border border-slate-800 p-1 rounded-lg text-sm">
            {[
              { id: 'simulation', label: 'Receptionist Desk' },
              { id: 'intake', label: '4-Point Intake Specs' },
              { id: 'liability', label: 'Malpractice Elimination' }
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
            <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700">
              Pilot: Richmond Clinics
            </span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'simulation' && (
          <div className="space-y-8">
            <div className="text-center max-w-3xl mx-auto space-y-2">
              <span className="text-xs font-mono font-semibold uppercase tracking-widest text-teal-400 bg-teal-950/60 border border-teal-500/30 px-3 py-1 rounded-full">
                Pure Receptionist Workflow
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                Zero Medical Advice. <br />
                <span className="bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-200 bg-clip-text text-transparent">
                  100% Administrative Consultation Scheduling.
                </span>
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm">
                Solves after-hours missed phone traffic by gathering the 4 core intake points and scheduling the visit without clinical commentary.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Chat Simulation */}
              <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl relative">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <Bot className="w-4 h-4 text-teal-400" />
                      After-Hours Receptionist Engine
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">Status: Active</span>
                </div>

                <div className="h-80 overflow-y-auto space-y-3 pr-2 mb-4">
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
                        <Sparkles className="w-3.5 h-3.5" /> Receptionist is typing...
                      </div>
                    </div>
                  )}
                  <div ref={chatBottomRef} />
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {[
                    "I have a sunburn, can I still get Morpheus8 tomorrow?",
                    "I want to book an appointment tomorrow at 2pm",
                    "My name is Amanda Ross, 804-555-0144, amanda@gmail.com"
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => setUserInput(chip)}
                      className="text-[11px] bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/20 px-2.5 py-1 rounded-md transition text-left"
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
                    placeholder="Enter patient reply..."
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

              {/* Right Column: Live Administrative Pipeline */}
              <div className="lg:col-span-6 space-y-4">
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                    <span className="text-xs font-semibold tracking-wide text-slate-300 flex items-center gap-2">
                      <Database className="w-4 h-4 text-teal-400" />
                      Live Intake State (4 Points)
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
                      SYNC ACTIVE
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider">Current Pipeline Stage</div>
                        <div className="text-xs font-semibold text-teal-300">{leadStage}</div>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-teal-400" />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                        <div className="text-[10px] text-slate-500">1. Full Name</div>
                        <div className="font-semibold text-white truncate">{intakeState.name || 'Awaiting...'}</div>
                      </div>
                      <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                        <div className="text-[10px] text-slate-500">2. Phone Number</div>
                        <div className="font-semibold text-white truncate">{intakeState.phone || 'Awaiting...'}</div>
                      </div>
                      <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                        <div className="text-[10px] text-slate-500">3. Email Address</div>
                        <div className="font-semibold text-white truncate">{intakeState.email || 'Awaiting...'}</div>
                      </div>
                      <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                        <div className="text-[10px] text-slate-500">4. Desired Service</div>
                        <div className="font-semibold text-teal-300 truncate">{intakeState.service || 'Doctor Consultation'}</div>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl space-y-2">
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider">Native Calendar Sync Feed</div>
                      <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                        {syncedBookings.map((b) => (
                          <div key={b.id} className="text-xs bg-slate-900 border border-slate-800 p-2.5 rounded-lg flex items-center justify-between">
                            <div>
                              <div className="font-semibold text-white flex items-center gap-1.5">
                                <CalendarCheck2 className="w-3.5 h-3.5 text-emerald-400" />
                                {b.patient}
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                <PhoneCall className="w-3 h-3 text-teal-400" /> {b.phone}
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
                  </div>
                </div>

                <div className="bg-teal-950/20 border border-teal-500/20 rounded-xl p-3 flex gap-3 items-center">
                  <Clock className="w-5 h-5 text-teal-400 shrink-0" />
                  <div className="text-xs text-slate-300">
                    <strong className="text-white">Call Forwarding Architecture:</strong> The clinic simply forwards unanswered after-hours phone calls to the system. Appointments land directly into their existing calendar.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'intake' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-white">The 4 Administrative Intake Points</h2>
              <p className="text-slate-400 text-xs">The conversational flow is locked to administrative data collection only.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-xl">
                <div className="font-bold text-teal-300 text-sm mb-1">1. Full Legal Name</div>
                <p className="text-xs text-slate-400">Used to match existing clinic EMR charts or create a pending patient record.</p>
              </div>
              <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-xl">
                <div className="font-bold text-teal-300 text-sm mb-1">2. Primary Phone Number</div>
                <p className="text-xs text-slate-400">Direct callback number captured automatically from telephony or conversational input.</p>
              </div>
              <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-xl">
                <div className="font-bold text-teal-300 text-sm mb-1">3. Email Address</div>
                <p className="text-xs text-slate-400">Target for booking confirmation invitations and clinic-dispatched pre-visit medical history forms.</p>
              </div>
              <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-xl">
                <div className="font-bold text-teal-300 text-sm mb-1">4. Reason for Visit / Desired Service</div>
                <p className="text-xs text-slate-400">Logged strictly as the patient's stated interest without commentary or clinical feasibility triage.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'liability' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-white">Malpractice Liability Elimination</h2>
              <p className="text-slate-400 text-xs">Architectural boundaries established during our strategy session.</p>
            </div>
            <div className="space-y-4">
              <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex gap-3">
                <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-bold text-white text-xs">Non-Clinical Boundary Guardrail</div>
                  <div className="text-xs text-slate-400 mt-1">
                    The assistant refuses all contraindication assessments (pregnancy, sunburn, recovery times) and defers evaluation entirely to the doctor during the in-person consultation.
                  </div>
                </div>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex gap-3">
                <Lock className="w-6 h-6 text-teal-400 shrink-0" />
                <div>
                  <div className="font-bold text-white text-xs">US Data Boundary & Compliance</div>
                  <div className="text-xs text-slate-400 mt-1">
                    All patient intake credentials reside in secure, US-based hosting environments without third-party webhook leaks or international transit.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 px-4 text-center text-xs text-slate-500">
        <p>© 2026 Glow AI Automation. Streamlined K.I.S.S. Receptionist Architecture.</p>
      </footer>
    </div>
  );
}