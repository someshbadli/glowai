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
  Bot,
  Building2,
  Stethoscope,
  Sparkle,
  ArrowRight,
  Users,
  Handshake,
  PhoneForwarded,
  Layers,
  Award
} from 'lucide-react';
import ClinicOnboardingForm from './components/ClinicOnboardingForm';

export const SYSTEM_PROMPT = `You are the autonomous administrative receptionist for Glow AI Automation, serving private medical practices, outpatient clinics, and aesthetic centers.
Your objective is strictly administrative: triage inquiries and schedule an in-person consultation by gathering verified patient intake details.

RULES:
1. OPERATING HOURS & APPOINTMENT BOUNDARIES:
   - Operating Hours: Strictly Monday through Friday, 9:00 AM to 5:00 PM Eastern Time.
   - Closed: Saturdays and Sundays.
   - If a caller asks for a weekend (Saturday or Sunday) or evening past 5:00 PM, politely decline and offer a standard weekday slot (e.g., Monday through Friday, 9:00 AM to 5:00 PM).
2. ZERO MEDICAL ADVICE:
   - Never diagnose, triage clinical severity, or evaluate contraindications (sunburn, pregnancy, peeling, medications, downtime).
   - Deflect clinical questions: "That is an excellent question for the doctor during your consultation. Let's get you scheduled so the clinical team can review this in person."
3. DETERMINISTIC 4-POINT INTAKE ONLY:
   - Full Legal Name
   - Primary Phone Number
   - Email Address
   - Reason for Visit / Desired Service
4. STYLE: Polite, concise, and administrative. 1 to 2 sentences per reply.`;

export default function App() {
  const [activeTab, setActiveTab] = useState('simulation');
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'Hello, thank you for contacting the clinic. I can reserve an in-person consultation for you during our standard clinic hours (Monday–Friday, 9:00 AM – 5:00 PM ET). What weekday or time works best for you?'
    }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [leadStage, setLeadStage] = useState('Administrative Intake');
  const chatBottomRef = useRef(null);

  const [intakeState, setIntakeState] = useState({
    name: '',
    phone: '',
    email: '',
    service: '',
    slot: 'Monday at 10:00 AM'
  });

  const [syncedBookings, setSyncedBookings] = useState([
    {
      id: 1,
      patient: 'Sarah Jenkins',
      phone: '(804) 555-0192',
      email: 's.jenkins@example.com',
      service: 'In-Person Consultation',
      time: 'Monday • 10:00 AM',
      status: 'Confirmed (Calendar Synced)'
    }
  ]);

  useEffect(() => {
    const syncHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'onboard' || hash === 'offer') {
        setActiveTab('offer');
        setTimeout(() => {
          document.getElementById('onboard')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else if (hash === 'partners') {
        setActiveTab('partners');
      }
    };
    syncHash();
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const navigateToPilot = () => {
    setActiveTab('offer');
    window.history.replaceState(null, '', '#onboard');
    setTimeout(() => {
      document.getElementById('onboard')?.scrollIntoView({ behavior: 'smooth' });
    }, 60);
  };

  const dispatchBooking = async (bookingData) => {
    try {
      await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinic_id: 'glow-pilot-01',
          patient_name: bookingData.patient,
          patient_phone: bookingData.phone,
          patient_email: bookingData.email,
          service_reason: bookingData.service,
          slot_time: bookingData.time
        })
      });
    } catch (err) {
      console.log('[BOOKING DISPATCH LOCAL LOG]:', err);
    }
  };

  const processAdministrativeTurn = (text, currentState) => {
    const q = text.toLowerCase();
    const updated = { ...currentState };

    if (
      q.includes('saturday') ||
      q.includes('sunday') ||
      q.includes('weekend') ||
      (q.includes('tomorrow') && new Date().getDay() === 5)
    ) {
      return {
        reply: 'Our clinic is open strictly Monday through Friday from 9:00 AM to 5:00 PM Eastern. We are closed on weekends. Would Monday morning or another weekday opening suit your schedule?',
        stage: 'Hours Guardrail: Weekend Rejected',
        state: updated
      };
    }

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
        reply: "That is an excellent question for the doctor during your consultation. Let's get you scheduled so the clinical team can review this in person. What weekday works best for you?",
        stage: 'Clinical Deflection -> In-Person Consultation',
        state: updated
      };
    }

    const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) updated.email = emailMatch[0];

    const phoneMatch = text.match(/(\+?\d{1,2}\s?)?(\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}/);
    if (phoneMatch && phoneMatch[0].length >= 10) updated.phone = phoneMatch[0];

    if (q.includes('morpheus') || q.includes('botox') || q.includes('filler') || q.includes('laser') || q.includes('facial') || q.includes('consultation')) {
      if (q.includes('morpheus')) updated.service = 'Morpheus8 Consultation';
      else if (q.includes('botox')) updated.service = 'Botox Consultation';
      else if (q.includes('filler')) updated.service = 'Dermal Filler Consultation';
      else updated.service = 'Clinical Consultation';
    }

    if (q.includes('monday') || q.includes('tuesday') || q.includes('wednesday') || q.includes('thursday') || q.includes('friday') || q.includes('tomorrow') || q.includes('2pm') || q.includes('10am')) {
      if (q.includes('2') || q.includes('afternoon')) updated.slot = 'Weekday at 2:00 PM';
      else updated.slot = 'Weekday at 10:00 AM';
    }

    if (q.includes('name is') || q.includes('i am') || q.includes('this is')) {
      const clean = text.replace(/my name is/i, '').replace(/i am/i, '').replace(/this is/i, '').split(/[,.]/)[0].trim();
      if (clean) updated.name = clean;
    } else if (!updated.name && !emailMatch && !phoneMatch && text.trim().split(' ').length <= 3 && !q.includes('book') && !q.includes('pm') && !q.includes('am')) {
      updated.name = text.trim();
    }

    if (!updated.name) {
      return {
        reply: 'I would be glad to reserve that consultation slot. May I have your full legal name?',
        stage: 'Intake: Awaiting Full Name',
        state: updated
      };
    }

    if (!updated.phone) {
      return {
        reply: `Pleasure to assist you, ${updated.name}. What is the best phone number for the clinic to reach you?`,
        stage: 'Intake: Awaiting Phone Number',
        state: updated
      };
    }

    if (!updated.email) {
      return {
        reply: 'Thank you. What email address should we send your appointment confirmation and pre-visit intake forms to?',
        stage: 'Intake: Awaiting Email Address',
        state: updated
      };
    }

    if (!updated.service) {
      return {
        reply: 'Understood. What service or reason for visit would you like to discuss with the doctor?',
        stage: 'Intake: Awaiting Reason for Visit',
        state: updated
      };
    }

    const confirmedBooking = {
      patient: updated.name,
      phone: updated.phone,
      email: updated.email,
      service: updated.service || 'Doctor Consultation',
      time: updated.slot || 'Monday at 10:00 AM'
    };

    return {
      reply: `Your consultation is confirmed for ${confirmedBooking.time}. A verification receipt and clinic intake details have been sent to ${confirmedBooking.email}. We look forward to welcoming you!`,
      stage: 'Appointment Confirmed (Calendar Synced)',
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

    setMessages((prev) => [...prev, { sender: 'user', text: query }]);

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
        setSyncedBookings((prev) => [newEntry, ...prev]);
        dispatchBooking(result.bookingComplete);
      }

      setMessages((prev) => [...prev, { sender: 'bot', text: result.reply }]);
      setIsLoading(false);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-teal-500 selection:text-white">
      <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-emerald-950 border-b border-teal-500/20 px-4 py-2 text-center text-xs tracking-wide text-teal-200 flex flex-wrap items-center justify-center gap-3">
        <span>
          <span className="font-semibold uppercase tracking-wider bg-teal-500/20 px-2 py-0.5 rounded text-teal-300 mr-2 border border-teal-500/30">
            US Healthcare AI
          </span>
          Zero-Hold 24/7 Voice & Web Reception for Outpatient Clinics & MedSpas
        </span>
        <a
          href="tel:+18042591091"
          className="inline-flex items-center gap-1.5 font-mono font-bold text-white bg-teal-600/30 hover:bg-teal-600/50 border border-teal-400/40 px-2.5 py-0.5 rounded-full transition"
        >
          <PhoneCall className="w-3 h-3 text-teal-300" /> Test Live Demo: +1 (804) 259-1091
        </a>
      </div>

      <nav className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button
            onClick={() => setActiveTab('simulation')}
            className="flex items-center gap-3 text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Sparkles className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                GLOW AI
              </div>
              <div className="text-[10px] text-teal-400 font-mono tracking-widest uppercase">
                HEALTHCARE AUTOMATION
              </div>
            </div>
          </button>

          <div className="hidden lg:flex items-center gap-1 bg-slate-900/80 border border-slate-800 p-1 rounded-lg text-xs">
            {[
              { id: 'simulation', label: 'Platform & Live Demo' },
              { id: 'sectors', label: 'Solutions by Specialty' },
              { id: 'liability', label: 'Security & Guardrails' },
              { id: 'partners', label: 'Clinical Partners' },
              { id: 'offer', label: '14-Day Free Pilot' }
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

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActiveTab('partners')}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-slate-200 px-3 py-2 rounded-lg border border-slate-700 transition"
            >
              <Handshake className="w-3.5 h-3.5 text-teal-400" /> Partners
            </button>
            <button
              onClick={navigateToPilot}
              className="text-xs bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-4 py-2 rounded-lg transition shadow-md shadow-teal-500/20"
            >
              Start 14-Day Pilot
            </button>
          </div>
        </div>

        <div className="flex lg:hidden overflow-x-auto gap-1.5 px-4 py-2 border-t border-slate-900 bg-slate-950 text-xs">
          {[
            { id: 'simulation', label: 'Platform' },
            { id: 'sectors', label: 'Specialties' },
            { id: 'liability', label: 'Guardrails' },
            { id: 'partners', label: 'Partners' },
            { id: 'offer', label: '14-Day Pilot' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1 rounded-md whitespace-nowrap font-medium ${
                activeTab === tab.id
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                  : 'text-slate-400 bg-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {activeTab === 'simulation' && (
          <div className="space-y-14">
            <div className="text-center max-w-4xl mx-auto space-y-5">
              <span className="inline-flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-widest text-teal-400 bg-teal-950/60 border border-teal-500/30 px-3.5 py-1 rounded-full">
                <Award className="w-3.5 h-3.5" /> Autonomous Patient Access Infrastructure
              </span>
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
                Never Miss Another High-Value <br />
                <span className="bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-200 bg-clip-text text-transparent">
                  Patient Call or Consultation.
                </span>
              </h1>
              <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
                US outpatient clinics lose 25%–35% of inbound calls during busy front-desk check-ins, lunch hours, and after 5:00 PM. Glow AI answers in under 1 second, enforces strict clinic scheduling rules, and books directly into your calendar with zero software installed on clinic PCs.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={navigateToPilot}
                  className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-6 py-3 rounded-xl text-sm transition shadow-lg shadow-teal-500/20 flex items-center gap-2"
                >
                  Claim 14-Day Free Clinic Pilot <ArrowRight className="w-4 h-4" />
                </button>
                <a
                  href="tel:+18042591091"
                  className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-6 py-3 rounded-xl text-sm border border-slate-700 transition flex items-center gap-2"
                >
                  <PhoneCall className="w-4 h-4 text-teal-400" /> Call Live Demo: +1 (804) 259-1091
                </a>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 max-w-3xl mx-auto">
                {[
                  { metric: '< 1 Sec', label: 'First-Ring Answer Speed' },
                  { metric: '48 Hours', label: 'Turnkey Clinic Deployment' },
                  { metric: 'Zero IT', label: 'Keep Existing Office Number' },
                  { metric: '$0 Risk', label: '14-Day Performance Guarantee' }
                ].map((item, i) => (
                  <div key={i} className="bg-slate-900/70 border border-slate-800/90 rounded-xl p-3.5 text-center">
                    <div className="text-lg sm:text-xl font-extrabold text-teal-400 font-mono">{item.metric}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl relative">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <Bot className="w-4 h-4 text-teal-400" />
                      Interactive Receptionist Simulator
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">Mon–Fri 9 AM–5 PM ET</span>
                </div>

                <div className="h-80 overflow-y-auto space-y-3 pr-2 mb-4">
                  {messages.map((m, idx) => (
                    <div key={idx} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[85%] text-xs p-3 rounded-xl leading-relaxed ${
                          m.sender === 'user'
                            ? 'bg-teal-600 text-white rounded-br-none shadow-md'
                            : 'bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-bl-none'
                        }`}
                      >
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
                    'Can I book for this Saturday at 11 AM?',
                    'I have a sunburn, can I still get Morpheus8?',
                    'I want to book an appointment for Monday at 10 AM',
                    'My name is Amanda Ross, 804-555-0144, amanda@gmail.com'
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
                    placeholder="Test a caller inquiry..."
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

              <div className="lg:col-span-6 space-y-4">
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                    <span className="text-xs font-semibold tracking-wide text-slate-300 flex items-center gap-2">
                      <Database className="w-4 h-4 text-teal-400" />
                      Live 4-Point Patient Intake & Calendar Feed
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
                        <div className="text-[10px] text-slate-500">1. Full Legal Name</div>
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
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider">Direct Calendar Feed (EHR Compatible)</div>
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

                <div className="bg-teal-950/20 border border-teal-500/20 rounded-xl p-3.5 flex gap-3 items-center">
                  <Clock className="w-5 h-5 text-teal-400 shrink-0" />
                  <div className="text-xs text-slate-300">
                    <strong className="text-white">Zero Staff Burden:</strong> Clinics keep their exact existing phone number—unanswered or after-hours calls forward automatically to your dedicated Glow AI line.
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
              <div className="text-center max-w-2xl mx-auto space-y-1.5">
                <span className="text-[11px] font-mono uppercase tracking-widest text-teal-400">
                  Zero-Friction Deployment
                </span>
                <h2 className="text-2xl font-bold text-white">How Clinic Onboarding Works in 3 Simple Steps</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[
                  {
                    step: '01',
                    icon: PhoneForwarded,
                    title: 'Keep Your Existing Phone Number',
                    desc: 'No hardware changes or new phone lines for patients to learn. Your carrier (AT&T, Verizon, RingCentral, Comcast, Weave) simply enables conditional forwarding when busy, unanswered after 3 rings, or after 5:00 PM.'
                  },
                  {
                    step: '02',
                    icon: Layers,
                    title: '48-Hour Custom Protocol Setup',
                    desc: 'We configure your clinic hours, providers, visit types, and non-clinical deflection boundaries so Savannah represents your practice with executive polish.'
                  },
                  {
                    step: '03',
                    icon: CalendarCheck2,
                    title: 'Direct Calendar & Email Alerts',
                    desc: 'Every booked consultation lands straight on your Google/Outlook schedule (or EHR placeholder feed) with an instant summary email sent to your front desk.'
                  }
                ].map((item) => (
                  <div key={item.step} className="bg-slate-950/90 border border-slate-800 p-5 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <item.icon className="w-5 h-5 text-teal-400" />
                      <span className="text-xs font-mono font-bold text-slate-600">STEP {item.step}</span>
                    </div>
                    <h3 className="text-sm font-bold text-white">{item.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sectors' && (
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="text-center space-y-2">
              <span className="text-xs font-mono font-semibold uppercase tracking-widest text-teal-400 bg-teal-950/60 border border-teal-500/30 px-3 py-1 rounded-full">
                Tailored Across Clinical Workflows
              </span>
              <h2 className="text-3xl font-bold text-white">Serving Outpatient Clinics, Hospitals & MedSpas</h2>
              <p className="text-slate-400 text-xs sm:text-sm max-w-xl mx-auto">
                Purpose-built AI communication infrastructure customized to the administrative boundaries of your practice.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-xl hover:border-teal-500/40 transition space-y-3">
                <div className="w-10 h-10 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-2">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div className="text-white font-bold text-base">Private Outpatient Clinics</div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Autonomous phone answering during lunch hours and post-close. Enforces strict Monday–Friday clinic boundaries, collects verified contact details, and logs bookings directly to staff schedules without hold times.
                </p>
                <div className="text-[11px] font-mono text-teal-400 pt-1">✓ Mon–Fri 9 AM–5 PM rules • Calendar sync</div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-xl hover:border-teal-500/40 transition space-y-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-2">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="text-white font-bold text-base">Hospitals & Specialty Centers</div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Zero-wait triage for departmental routing, physician schedule coordination, and routine intake. Offloads high call volumes from switchboards without adding administrative headcount or software friction.
                </p>
                <div className="text-[11px] font-mono text-emerald-400 pt-1">✓ Switchboard relief • Department routing</div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-xl hover:border-teal-500/40 transition space-y-3">
                <div className="w-10 h-10 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-2">
                  <Sparkle className="w-5 h-5" />
                </div>
                <div className="text-white font-bold text-base">Medical Spas & Aesthetic Practices</div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Captures high-ticket Botox, filler, laser, and Morpheus8 consultations 24/7 while deferring all clinical contraindication assessments directly to your licensed providers.
                </p>
                <div className="text-[11px] font-mono text-teal-400 pt-1">✓ 24/7 consultation capture • Zero medical risk</div>
              </div>
            </div>

            <div className="text-center pt-2">
              <button
                onClick={navigateToPilot}
                className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-6 py-3 rounded-xl text-xs transition inline-flex items-center gap-2"
              >
                Configure For Your Practice <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'liability' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-white">Clinical Safety & Administrative Guardrails</h2>
              <p className="text-slate-400 text-xs">Strict non-diagnostic intake architecture engineered for US healthcare compliance.</p>
            </div>
            <div className="space-y-4">
              <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl flex gap-3.5">
                <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-bold text-white text-sm">Non-Clinical Boundary Guardrail</div>
                  <div className="text-xs text-slate-400 mt-1 leading-relaxed">
                    The receptionist never diagnoses symptoms or evaluates contraindications (pregnancy, sunburn, medications, recovery times) and defers all medical evaluation to the physician during the in-person visit.
                  </div>
                </div>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl flex gap-3.5">
                <Lock className="w-6 h-6 text-teal-400 shrink-0" />
                <div>
                  <div className="font-bold text-white text-sm">Deterministic 4-Point Administrative Intake</div>
                  <div className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Intake is locked strictly to Full Legal Name, Callback Number, Email Address, and Stated Reason for Visit—keeping scheduling fast, accurate, and cleanly separated from EHR clinical charts.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'partners' && (
          <div id="partners" className="max-w-5xl mx-auto space-y-10">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold uppercase tracking-widest text-teal-400 bg-teal-950/60 border border-teal-500/30 px-3.5 py-1 rounded-full">
                <Users className="w-3.5 h-3.5" /> Clinical & Channel Partner Network
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
                Partner With Glow AI to Modernize US Outpatient Practices
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                Designed for practicing physicians, healthcare consultants, and regional channel leaders introducing medical, dental, and aesthetic practices to zero-hold AI reception infrastructure.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl space-y-3">
                <div className="text-teal-400 font-bold text-base">1. Zero Technical Burden</div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Partners simply make a warm introduction or share our live demo line (+1 804-259-1091). Our engineering team handles 100% of custom voice configuration, carrier forwarding guidance, calendar sync, and ongoing support.
                </p>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl space-y-3">
                <div className="text-teal-400 font-bold text-base">2. Effortless 14-Day Pilot Close</div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Practices experience real recovered patient bookings for 14 days at $0 setup cost before paying a cent—eliminating sales friction and protecting your professional reputation with every clinic you introduce.
                </p>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl space-y-3">
                <div className="text-teal-400 font-bold text-base">3. Dedicated Partner Attribution</div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Every practice onboarded through your network is tracked directly via your partner code in our onboarding portal, with transparent recurring partner economics and priority deployment slots.
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-teal-950/40 border border-teal-500/30 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-1.5 text-center sm:text-left">
                <h3 className="text-lg sm:text-xl font-bold text-white">Have a Practice Ready for a 14-Day Pilot?</h3>
                <p className="text-xs text-slate-300">
                  Submit their clinic profile directly through our onboarding portal with your partner name, or connect with our founder desk.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-3 shrink-0">
                <button
                  onClick={navigateToPilot}
                  className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-5 py-3 rounded-xl text-xs transition flex items-center gap-2"
                >
                  Onboard a Clinic Now <ArrowRight className="w-4 h-4" />
                </button>
                <a
                  href="mailto:somesh@glowaiautomation.com?subject=Glow%20AI%20Partner%20Inquiry"
                  className="bg-slate-950 hover:bg-slate-800 text-slate-200 font-semibold px-5 py-3 rounded-xl text-xs border border-slate-700 transition"
                >
                  Contact Partner Desk
                </a>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'offer' && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-slate-900/90 border border-teal-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5 text-center">
              <span className="text-xs font-mono uppercase tracking-widest text-teal-400 bg-teal-950 px-3 py-1 rounded-full border border-teal-800">
                Zero-Risk Performance Guarantee
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">The 14-Day Free Clinical Pilot</h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed">
                Deploy our autonomous voice receptionist across your clinic channels for 14 days. If it does not capture qualified appointments and eliminate missed calls, you pay nothing.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left text-xs text-slate-300 bg-slate-950/70 border border-slate-800 p-5 rounded-xl max-w-2xl mx-auto">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>Turnkey 48-hour setup handled end-to-end</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>Customized to your clinic schedule & providers</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>Zero software installation needed on clinic PCs</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>Post-pilot: Flat $500/month retainer (no lock-in)</span>
                </div>
              </div>
            </div>

            <ClinicOnboardingForm />
          </div>
        )}
      </main>

      <footer className="border-t border-slate-800/80 bg-slate-950 py-8 px-4 text-center text-xs text-slate-500 space-y-2 mt-12">
        <div className="flex flex-wrap justify-center gap-4 text-slate-400">
          <button onClick={() => setActiveTab('simulation')} className="hover:text-teal-400 transition">Platform</button>
          <button onClick={() => setActiveTab('sectors')} className="hover:text-teal-400 transition">Specialties</button>
          <button onClick={() => setActiveTab('partners')} className="hover:text-teal-400 transition">Clinical Partners</button>
          <button onClick={navigateToPilot} className="hover:text-teal-400 transition">14-Day Pilot Onboarding</button>
        </div>
        <p>© 2026 Glow AI Automation. Autonomous Healthcare Receptionist Infrastructure.</p>
        <p className="font-mono text-[11px] text-slate-600">
          Live US Demo: +1 (804) 259-1091 • Direct Desk: somesh@glowaiautomation.com
        </p>
      </footer>
    </div>
  );
}
