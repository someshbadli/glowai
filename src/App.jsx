import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  CheckCircle2,
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
  Award,
  TrendingUp,
  Headphones,
  FileCheck2,
  Globe,
  Mic,
  Volume2,
  MessageSquare,
  PhoneIncoming,
  Play
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
  const [activeTab, setActiveTab] = useState('home');
  const [activeVoiceScenario, setActiveVoiceScenario] = useState(0);

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
      status: 'Calendar Synced'
    }
  ]);

  const voiceScenarios = [
    {
      title: 'After-Hours New Patient Booking (6:45 PM)',
      caller: '“Hi, I’ve been trying to reach the front desk. Can I book a new patient consultation for Monday morning?”',
      ai: '“Good evening! I can certainly reserve that for you during our Monday–Friday 9 AM to 5 PM clinic hours. We have Monday at 10:00 AM Eastern open—may I have your full legal name and best callback number?”',
      outcome: 'Booked Monday 10:00 AM • Calendar Synced + Front-Desk Email Alert Sent'
    },
    {
      title: 'Weekend Boundary Enforcement (Saturday Call)',
      caller: '“Are you guys open this Saturday for a quick Botox touch-up?”',
      ai: '“Our clinic is open strictly Monday through Friday from 9:00 AM to 5:00 PM Eastern, and we are closed on weekends. Would Monday morning or Tuesday afternoon work better for your visit?”',
      outcome: 'Weekend Rejected Politely • Redirected to Monday 10:00 AM Slot'
    },
    {
      title: 'Clinical Safety & Malpractice Deflection',
      caller: '“I got a mild sunburn yesterday at the beach—is it still safe for me to do my laser session?”',
      ai: '“That is an excellent question for the doctor to evaluate directly during your visit. Let’s reserve a quick consultation slot so our clinical team can review it in person before any treatment.”',
      outcome: 'Zero Medical Advice Given • Safely Converted to In-Person Evaluation'
    }
  ];

  const switchTab = (tabId, hash = '') => {
    setActiveTab(tabId);
    window.history.replaceState(null, '', hash ? `#${hash}` : `#${tabId}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const syncHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'onboard' || hash === 'pilot') {
        setActiveTab('onboard');
      } else if (hash === 'partners') {
        setActiveTab('partners');
      } else if (hash === 'call-demo' || hash === 'call') {
        setActiveTab('call');
      } else if (hash === 'chat-demo' || hash === 'chat') {
        setActiveTab('chat');
      } else {
        setActiveTab('home');
      }
    };
    syncHash();
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
          status: 'Calendar Synced'
        };
        setSyncedBookings((prev) => [newEntry, ...prev]);
        dispatchBooking(result.bookingComplete);
      }

      setMessages((prev) => [...prev, { sender: 'bot', text: result.reply }]);
      setIsLoading(false);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 selection:bg-teal-600 selection:text-white flex flex-col relative overflow-x-hidden">
      {/* Global Ambient Animated Aurora Background */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 w-[520px] h-[520px] rounded-full bg-gradient-to-tr from-teal-200/45 via-emerald-200/35 to-cyan-200/40 blur-3xl animate-aurora-slow" />
        <div className="absolute top-1/3 -right-32 w-[560px] h-[560px] rounded-full bg-gradient-to-bl from-sky-200/45 via-teal-100/40 to-emerald-200/35 blur-3xl animate-aurora-reverse" />
        <div className="absolute -bottom-32 left-1/4 w-[480px] h-[480px] rounded-full bg-gradient-to-tr from-emerald-100/50 via-teal-100/40 to-sky-100/50 blur-3xl animate-aurora-slow" />
      </div>

      {/* Light Mint Announcement Ribbon */}
      <div className="relative z-10 bg-white/80 backdrop-blur-md border-b border-teal-100/90 px-4 py-2 text-center text-xs tracking-wide flex flex-wrap items-center justify-center gap-3">
        <span className="text-slate-700 font-medium">
          <span className="font-mono font-bold uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200 px-2.5 py-0.5 rounded-full mr-2">
            US Healthcare AI
          </span>
          Zero-Hold 24/7 Voice & Web Reception for Outpatient Clinics & MedSpas
        </span>
        <a
          href="tel:+18042591091"
          className="inline-flex items-center gap-1.5 font-mono font-bold text-teal-800 hover:text-teal-950 bg-teal-50/80 border border-teal-200 px-3 py-0.5 rounded-full transition"
        >
          <PhoneCall className="w-3 h-3 text-teal-600" /> Live Demo: +1 (804) 259-1091
        </a>
      </div>

      {/* Crisp Frosted Navigation Header */}
      <header className="relative z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <button onClick={() => switchTab('home', '')} className="flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-md shadow-teal-600/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-extrabold text-lg tracking-tight text-slate-900 leading-none">
                GLOW <span className="text-teal-600">AI</span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono tracking-widest uppercase mt-1">
                Healthcare Automation
              </div>
            </div>
          </button>

          {/* Clean Top Navigation Tabs */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-100/80 border border-slate-200/80 p-1 rounded-xl text-sm font-bold">
            {[
              { id: 'home', hash: '', label: 'Overview' },
              { id: 'call', hash: 'call-demo', label: 'Call Assistant', icon: PhoneCall },
              { id: 'chat', hash: 'chat-demo', label: 'Chat Assistant', icon: MessageSquare },
              { id: 'partners', hash: 'partners', label: 'Partners', icon: Handshake },
              { id: 'onboard', hash: 'onboard', label: '14-Day Free Pilot' }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => switchTab(tab.id, tab.hash)}
                  className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
                    activeTab === tab.id
                      ? 'bg-white text-teal-700 shadow-sm border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5 text-teal-600" />}
                  {tab.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => switchTab('call', 'call-demo')}
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-bold bg-white hover:bg-teal-50 text-teal-800 px-3.5 py-2.5 rounded-xl border border-teal-200 transition shadow-2xs"
            >
              <Mic className="w-3.5 h-3.5 text-teal-600" /> Voice Demo
            </button>
            <button
              onClick={() => switchTab('onboard', 'onboard')}
              className="text-sm font-extrabold bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white px-4 py-2.5 rounded-xl transition shadow-md shadow-teal-600/20"
            >
              Start 14-Day Pilot
            </button>
          </div>
        </div>

        {/* Mobile Tab Bar */}
        <div className="flex lg:hidden overflow-x-auto gap-1.5 px-4 py-2 border-t border-slate-100 bg-white/90 text-sm font-bold">
          {[
            { id: 'home', hash: '', label: 'Overview' },
            { id: 'call', hash: 'call-demo', label: 'Call Assistant' },
            { id: 'chat', hash: 'chat-demo', label: 'Chat Assistant' },
            { id: 'partners', hash: 'partners', label: 'Partners' },
            { id: 'onboard', hash: 'onboard', label: '14-Day Pilot' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id, tab.hash)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-600 bg-slate-50 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="relative z-10 flex-1">
        {/* ================================================================= */}
        {/* TAB 1: CREATIVE CLINICAL ENTERPRISE HOMEPAGE */}
        {/* ================================================================= */}
        {activeTab === 'home' && (
          <div>
            {/* Executive Split Hero with Dot-Matrix Architectural Grid */}
            <section className="relative bg-clinical-grid border-b border-slate-200/70">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                  <div className="lg:col-span-7 space-y-6">
                    <div className="inline-flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-teal-700 bg-white/90 backdrop-blur border border-teal-200 px-3.5 py-1.5 rounded-full shadow-xs">
                      <Award className="w-3.5 h-3.5 text-teal-600" /> Autonomous Patient Access Infrastructure
                    </div>

                    <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-extrabold tracking-tight text-slate-900 leading-[1.12]">
                      Turn Every Missed Clinic Call Into a{' '}
                      <span className="bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-600 bg-clip-text text-transparent">
                        Booked Consultation.
                      </span>
                    </h1>

                    <p className="text-slate-800 font-medium text-lg sm:text-xl leading-relaxed max-w-2xl">
                      Outpatient practices lose 25%–35% of inbound patient calls during busy front-desk check-ins, lunch hours, and after 5:00 PM. Glow AI answers on the first ring, enforces strict clinic scheduling rules, and syncs directly to your calendar—with zero software installed on clinic computers.
                    </p>

                    <div className="flex flex-wrap items-center gap-3.5 pt-1">
                      <button
                        onClick={() => switchTab('onboard', 'onboard')}
                        className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold px-6 py-3.5 rounded-xl text-sm transition shadow-lg shadow-teal-600/20 flex items-center gap-2"
                      >
                        Claim 14-Day Free Pilot <ArrowRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => switchTab('call', 'call-demo')}
                        className="bg-white/90 hover:bg-white text-slate-900 font-bold px-6 py-3.5 rounded-xl text-sm border border-slate-200 transition shadow-sm flex items-center gap-2"
                      >
                        <PhoneCall className="w-4 h-4 text-teal-600" /> Explore Call Assistant
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-5 border-t border-slate-200/80 max-w-xl">
                      <div className="bg-white/75 backdrop-blur border border-slate-200/70 rounded-2xl p-3">
                        <div className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono">&lt; 1 Sec</div>
                        <div className="text-sm font-bold text-slate-600 mt-0.5">First-Ring Answer Speed</div>
                      </div>
                      <div className="bg-white/75 backdrop-blur border border-slate-200/70 rounded-2xl p-3">
                        <div className="text-xl sm:text-2xl font-extrabold text-teal-600 font-mono">48 Hrs</div>
                        <div className="text-sm font-bold text-slate-600 mt-0.5">Turnkey Clinic Setup</div>
                      </div>
                      <div className="bg-white/75 backdrop-blur border border-slate-200/70 rounded-2xl p-3">
                        <div className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono">$0 Risk</div>
                        <div className="text-sm font-bold text-slate-600 mt-0.5">14-Day Free Clinical Pilot</div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Frosted Glass Card with Live Animated Voice Equalizer */}
                  <div className="lg:col-span-5">
                    <div className="bg-white/85 backdrop-blur-xl border border-white rounded-3xl p-6 shadow-2xl shadow-teal-900/10 ring-1 ring-slate-200/80 space-y-5">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold shadow-md shadow-teal-600/20">
                            S
                          </div>
                          <div>
                            <div className="text-base font-extrabold text-slate-900">Savannah • AI Front Desk</div>
                            <div className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Voice & Web Engine
                            </div>
                          </div>
                        </div>

                        {/* Animated Live Voice Waveform */}
                        <div className="flex items-center gap-1 h-7 px-3 py-1 rounded-xl bg-teal-50 border border-teal-200/80" title="Live Voice Receptionist Active">
                          <span className="w-1 bg-teal-600 rounded-full voice-bar-1" />
                          <span className="w-1 bg-emerald-500 rounded-full voice-bar-2" />
                          <span className="w-1 bg-teal-600 rounded-full voice-bar-3" />
                          <span className="w-1 bg-emerald-500 rounded-full voice-bar-4" />
                          <span className="w-1 bg-teal-600 rounded-full voice-bar-5" />
                        </div>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div className="bg-slate-50/90 border border-slate-200/80 rounded-2xl p-3.5">
                          <div className="text-[10px] font-mono uppercase text-slate-400 mb-1">Incoming After-Hours Call • 6:42 PM</div>
                          <p className="text-slate-700 leading-relaxed">
                            “Hi, I’d like to schedule a new patient consultation for Monday morning if you have an opening.”
                          </p>
                        </div>
                        <div className="bg-gradient-to-r from-teal-50/90 to-emerald-50/80 border border-teal-200/80 rounded-2xl p-3.5">
                          <div className="text-[10px] font-mono uppercase text-teal-700 font-bold mb-1">Savannah • Instant Calendar Sync</div>
                          <p className="text-slate-800 leading-relaxed">
                            “I have Monday at 10:00 AM Eastern available. I’ve reserved that slot and sent your confirmation & intake receipt.”
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 pt-1">
                        <button
                          onClick={() => switchTab('call', 'call-demo')}
                          className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-sm font-extrabold py-3 px-3 rounded-xl transition shadow-sm flex items-center justify-center gap-1.5"
                        >
                          <PhoneCall className="w-3.5 h-3.5" /> Call Assistant
                        </button>
                        <button
                          onClick={() => switchTab('chat', 'chat-demo')}
                          className="bg-white hover:bg-teal-50 text-teal-800 border border-teal-200 text-sm font-extrabold py-3 px-3 rounded-xl transition flex items-center justify-center gap-1.5"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-teal-700" /> Chat Assistant
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ecosystem & Compatibility Strip */}
                <div className="mt-14 pt-8 border-t border-slate-200/70 text-center space-y-4">
                  <p className="text-xs font-mono uppercase tracking-widest text-slate-500">
                    Seamlessly Compatible With Your Existing Clinic Phone & Scheduling Stack
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3.5">
                    {[
                      'Google Calendar',
                      'Microsoft Outlook 365',
                      'RingCentral',
                      'AT&T & Verizon Office',
                      'Comcast Business',
                      'Weave VoIP',
                      'EHR Placeholder Sync'
                    ].map((tool) => (
                      <span
                        key={tool}
                        className="text-sm font-bold text-slate-800 bg-white/90 backdrop-blur border border-slate-200/90 px-4 py-2 rounded-full shadow-2xs hover:border-teal-300 transition"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* How It Works (3-Step Zero-IT Deployment) */}
            <section className="py-16 bg-white/70 backdrop-blur-sm border-b border-slate-200/70">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
                <div className="text-center max-w-2xl mx-auto space-y-2">
                  <span className="text-xs font-mono font-semibold uppercase tracking-widest text-teal-700">
                    Zero-Friction Implementation
                  </span>
                  <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                    Live in 48 Hours Without Changing Your Phone Number
                  </h2>
                  <p className="text-base font-medium text-slate-700">
                    No new hardware, no desktop software installation, and zero disruption to your front-desk staff.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    {
                      step: 'STEP 01',
                      icon: PhoneForwarded,
                      title: 'Keep Your Existing Office Number',
                      desc: 'Patients continue calling your exact clinic phone number. Your carrier simply forwards calls when lines are busy, unanswered after 3 rings, or after 5:00 PM.'
                    },
                    {
                      step: 'STEP 02',
                      icon: Layers,
                      title: 'Custom Protocol & Hours Guardrails',
                      desc: 'We configure your weekday operating hours, providers, visit types, and non-diagnostic deflection rules so Savannah represents your practice accurately.'
                    },
                    {
                      step: 'STEP 03',
                      icon: CalendarCheck2,
                      title: 'Instant Calendar & Front-Desk Alerts',
                      desc: 'Confirmed consultations appear directly on your Google/Outlook schedule with an instant email summary sent to your reception desk.'
                    }
                  ].map((item) => (
                    <div
                      key={item.step}
                      className="bg-white/90 backdrop-blur border border-slate-200/90 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:shadow-teal-900/5 hover:-translate-y-1 hover:border-teal-300 transition-all duration-300 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-200 flex items-center justify-center text-teal-700">
                          <item.icon className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-400">{item.step}</span>
                      </div>
                      <h3 className="text-lg font-extrabold text-slate-900">{item.title}</h3>
                      <p className="text-[15px] font-medium text-slate-700 leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Specialties & Clinical Safety Guardrails */}
            <section className="py-16 bg-clinical-grid border-b border-slate-200/70">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
                <div className="text-center max-w-2xl mx-auto space-y-2">
                  <span className="text-xs font-mono font-semibold uppercase tracking-widest text-teal-700">
                    Built For Outpatient Healthcare
                  </span>
                  <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                    Tailored Across Medical, Dental & Aesthetic Practices
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white/90 backdrop-blur border border-slate-200/90 p-6 rounded-2xl shadow-sm hover:shadow-xl hover:shadow-teal-900/5 hover:-translate-y-1 transition-all duration-300 space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                      <Stethoscope className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-extrabold text-slate-900">Private Outpatient Clinics</h3>
                    <p className="text-[15px] font-medium text-slate-700 leading-relaxed">
                      Captures overflow calls during lunch and post-close while enforcing strict Monday–Friday appointment windows and logging confirmed slots to staff calendars.
                    </p>
                  </div>

                  <div className="bg-white/90 backdrop-blur border border-slate-200/90 p-6 rounded-2xl shadow-sm hover:shadow-xl hover:shadow-teal-900/5 hover:-translate-y-1 transition-all duration-300 space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-extrabold text-slate-900">Specialty & Dental Practices</h3>
                    <p className="text-[15px] font-medium text-slate-700 leading-relaxed">
                      Eliminates voicemail drop-off for high-value new patient exams, routes urgent clinical callbacks to on-call staff, and frees front-desk coordinators to focus on in-clinic patients.
                    </p>
                  </div>

                  <div className="bg-white/90 backdrop-blur border border-slate-200/90 p-6 rounded-2xl shadow-sm hover:shadow-xl hover:shadow-teal-900/5 hover:-translate-y-1 transition-all duration-300 space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                      <Sparkle className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-extrabold text-slate-900">Medical Spas & Aesthetic Centers</h3>
                    <p className="text-[15px] font-medium text-slate-700 leading-relaxed">
                      Books Botox, filler, laser, and Morpheus8 consultations 24/7 while strictly deferring all medical contraindication questions to your licensed providers.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div className="bg-white/90 backdrop-blur border border-slate-200 p-6 rounded-2xl flex gap-4 items-start shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-base font-extrabold text-slate-900">Strict Non-Diagnostic Boundary</h4>
                      <p className="text-[15px] font-medium text-slate-700 mt-1 leading-relaxed">
                        Glow AI never gives medical advice, diagnoses symptoms, or evaluates contraindications—every clinical question is politely deferred to your physician during the consultation.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white/90 backdrop-blur border border-slate-200 p-6 rounded-2xl flex gap-4 items-start shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shrink-0">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-base font-extrabold text-slate-900">Clean Administrative Separation</h4>
                      <p className="text-[15px] font-medium text-slate-700 mt-1 leading-relaxed">
                        Intake is locked to standard scheduling fields (Name, Callback Phone, Email, Visit Reason) without requiring invasive EHR write-access or clinic PC software.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Light Pearl-Teal Conversion Banner */}
            <section className="py-16 bg-white/60 backdrop-blur-sm">
              <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-gradient-to-br from-teal-50/95 via-white to-sky-50/90 border border-teal-200/90 rounded-3xl p-8 sm:p-12 shadow-xl shadow-teal-900/5 flex flex-col lg:flex-row items-center justify-between gap-8">
                  <div className="space-y-3 text-center lg:text-left max-w-xl">
                    <span className="inline-block text-xs font-mono font-bold uppercase tracking-widest text-teal-700 bg-white border border-teal-200 px-3 py-1 rounded-full">
                      Zero-Risk Performance Guarantee
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                      Try Glow AI Free For 14 Days in Your Clinic
                    </h2>
                    <p className="text-[15px] font-medium text-slate-700 leading-relaxed">
                      If our AI Receptionist does not capture qualified patient bookings during your 14-day pilot, you pay $0. Post-pilot flat retainer is just <strong className="text-slate-900">$500/month</strong> with no long-term lock-in.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                    <button
                      onClick={() => switchTab('onboard', 'onboard')}
                      className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold px-6 py-3.5 rounded-xl text-sm transition shadow-lg shadow-teal-600/20 flex items-center justify-center gap-2"
                    >
                      Start 14-Day Pilot <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => switchTab('call', 'call-demo')}
                      className="bg-white hover:bg-slate-50 text-slate-800 font-bold px-6 py-3.5 rounded-xl text-sm border border-slate-200 transition shadow-2xs"
                    >
                      Test Voice & Chat Demos
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: DEDICATED CALL ASSISTANT PAGE (#call-demo) */}
        {/* ================================================================= */}
        {activeTab === 'call' && (
          <div id="call-demo" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold uppercase tracking-widest text-teal-700 bg-white/90 border border-teal-200 px-3.5 py-1 rounded-full">
                <Volume2 className="w-3.5 h-3.5" /> 24/7 Autonomous Voice Receptionist
              </span>
              <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
                Meet Savannah: Your Zero-Hold AI Call Assistant
              </h1>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Answers inbound clinic calls on the first ring with natural human cadence, handles parallel concurrent callers with zero hold music, and books directly into your clinic schedule.
              </p>
            </div>

            <div className="bg-gradient-to-br from-teal-50/95 via-white to-sky-50/90 backdrop-blur border border-teal-200 rounded-3xl p-8 sm:p-10 shadow-xl shadow-teal-900/5 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-2 text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live US Telephony Line Active 24/7
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                  Call Our Live Demo Line Right Now
                </h2>
                <p className="text-[15px] font-medium text-slate-700 leading-relaxed">
                  Dial from your mobile or office phone and try booking a consultation, asking for a Saturday appointment, or asking a clinical question to hear how Savannah responds in real time.
                </p>
                <div className="pt-1 flex flex-wrap items-center gap-4">
                  <a
                    href="tel:+18042591091"
                    className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-mono font-extrabold text-lg px-6 py-3.5 rounded-xl transition shadow-lg shadow-teal-600/20 inline-flex items-center gap-2.5"
                  >
                    <PhoneIncoming className="w-5 h-5" /> +1 (804) 259-1091
                  </a>
                  <span className="text-xs text-slate-500 font-mono">
                    Instant Answer • No PIN Required
                  </span>
                </div>
              </div>

              <div className="lg:col-span-5 bg-white/95 border border-slate-200 rounded-2xl p-5 space-y-3 text-xs shadow-sm">
                <div className="font-bold text-teal-700 uppercase tracking-wider font-mono text-[11px]">
                  4 Things to Test When You Call:
                </div>
                <ul className="space-y-2.5 text-slate-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                    <span>Ask for a <strong>Monday or Wednesday</strong> consultation slot.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                    <span>Test weekend boundaries by asking for <strong>Saturday</strong>.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                    <span>Ask a clinical question (e.g., sunburn or pregnancy) to hear safe doctor deflection.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                    <span>Complete your 4-point intake and receive a live confirmation email.</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Real Clinic Call Scenarios & Guardrails</h3>
                  <p className="text-xs text-slate-500">Select a call scenario below to inspect how our voice AI handles real patient conversations.</p>
                </div>
                <span className="text-xs font-mono font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full">
                  &lt; 800ms Voice Latency
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {voiceScenarios.map((sc, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveVoiceScenario(idx)}
                    className={`p-4 rounded-2xl border text-left transition ${
                      activeVoiceScenario === idx
                        ? 'bg-white border-teal-600 shadow-md ring-2 ring-teal-500/15'
                        : 'bg-slate-50/70 border-slate-200 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-mono font-bold uppercase text-teal-700">Scenario 0{idx + 1}</span>
                      <Play className={`w-3.5 h-3.5 ${activeVoiceScenario === idx ? 'text-teal-600' : 'text-slate-400'}`} />
                    </div>
                    <div className="text-sm font-extrabold text-slate-900">{sc.title}</div>
                  </button>
                ))}
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
                <div className="space-y-2">
                  <div className="text-[11px] font-mono uppercase text-slate-400">Patient Caller</div>
                  <p className="text-sm text-slate-800 bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl">
                    {voiceScenarios[activeVoiceScenario].caller}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="text-[11px] font-mono uppercase text-teal-700 font-bold">Savannah (Glow AI Call Assistant)</div>
                  <p className="text-sm text-slate-900 bg-teal-50/70 border border-teal-200 p-3.5 rounded-xl">
                    {voiceScenarios[activeVoiceScenario].ai}
                  </p>
                </div>
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 text-xs">
                  <span className="font-semibold text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> {voiceScenarios[activeVoiceScenario].outcome}
                  </span>
                  <button
                    onClick={() => switchTab('onboard', 'onboard')}
                    className="text-teal-700 font-bold hover:underline inline-flex items-center gap-1"
                  >
                    Deploy This For Your Clinic <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: DEDICATED CHAT ASSISTANT PAGE (#chat-demo) */}
        {/* ================================================================= */}
        {activeTab === 'chat' && (
          <div id="chat-demo" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
            <div className="text-center max-w-3xl mx-auto space-y-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold uppercase tracking-widest text-teal-700 bg-white/90 border border-teal-200 px-3.5 py-1 rounded-full">
                <MessageSquare className="w-3.5 h-3.5" /> Web & SMS Administrative Concierge
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Interactive Web Receptionist Simulator
              </h1>
              <p className="text-base font-medium text-slate-700">
                Test how our web & SMS assistant enforces Monday–Friday 9 AM–5 PM operating boundaries, deflects clinical questions, and syncs verified 4-point patient intakes to your calendar.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-6 bg-white/95 backdrop-blur border border-slate-200 rounded-3xl p-5 shadow-xl shadow-slate-200/50">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                      <Bot className="w-4 h-4 text-teal-600" /> Web Receptionist Simulator
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">Mon–Fri 9 AM–5 PM ET</span>
                </div>

                <div className="h-80 overflow-y-auto space-y-3 pr-2 mb-4 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100">
                  {messages.map((m, idx) => (
                    <div key={idx} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[85%] text-xs p-3 rounded-2xl leading-relaxed ${
                          m.sender === 'user'
                            ? 'bg-teal-600 text-white rounded-br-none shadow-sm'
                            : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-2xs'
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white text-teal-700 border border-slate-200 text-xs p-3 rounded-2xl rounded-bl-none animate-pulse flex items-center gap-2">
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
                    'Book a consultation for Monday at 10 AM',
                    'My name is Amanda Ross, 804-555-0144, amanda@gmail.com'
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => setUserInput(chip)}
                      className="text-[11px] bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 px-2.5 py-1 rounded-lg transition text-left font-medium"
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
                    placeholder="Type a patient inquiry..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-teal-600"
                  />
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-extrabold flex items-center justify-center transition"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>

              <div className="lg:col-span-6 space-y-4">
                <div className="bg-white/90 backdrop-blur border border-slate-200 rounded-3xl p-5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <span className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                      <Database className="w-4 h-4 text-teal-600" /> Live 4-Point Administrative Intake
                    </span>
                    <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                      SYNC ACTIVE
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-mono">Current Pipeline Stage</div>
                      <div className="text-sm font-extrabold text-teal-700 mt-0.5">{leadStage}</div>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-teal-600" />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200">
                      <div className="text-[10px] text-slate-400">1. Full Legal Name</div>
                      <div className="font-bold text-slate-900 truncate mt-0.5">{intakeState.name || 'Awaiting...'}</div>
                    </div>
                    <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200">
                      <div className="text-[10px] text-slate-400">2. Callback Phone</div>
                      <div className="font-bold text-slate-900 truncate mt-0.5">{intakeState.phone || 'Awaiting...'}</div>
                    </div>
                    <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200">
                      <div className="text-[10px] text-slate-400">3. Email Address</div>
                      <div className="font-bold text-slate-900 truncate mt-0.5">{intakeState.email || 'Awaiting...'}</div>
                    </div>
                    <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200">
                      <div className="text-[10px] text-slate-400">4. Desired Service</div>
                      <div className="font-bold text-teal-700 truncate mt-0.5">{intakeState.service || 'Doctor Consultation'}</div>
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-2">
                    <div className="text-[10px] text-slate-400 uppercase font-mono">Confirmed Calendar Feed</div>
                    <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                      {syncedBookings.map((b) => (
                        <div key={b.id} className="text-xs bg-white border border-slate-200 p-2.5 rounded-xl flex items-center justify-between">
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <CalendarCheck2 className="w-3.5 h-3.5 text-emerald-600" /> {b.patient}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {b.phone} • {b.service} • {b.time}
                            </div>
                          </div>
                          <span className="text-[10px] font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {b.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-teal-50/90 border border-teal-200 rounded-2xl p-4 flex items-center justify-between gap-4">
                  <div className="text-xs text-slate-700">
                    <strong className="text-slate-900">Want this live on your clinic website & phone line?</strong> Deploy free for 14 days.
                  </div>
                  <button
                    onClick={() => switchTab('onboard', 'onboard')}
                    className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-4 py-2 rounded-xl text-xs shrink-0 transition"
                  >
                    Start 14-Day Pilot
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 4: CLINICAL & CHANNEL PARTNERS PROGRAM (#partners) */}
        {/* ================================================================= */}
        {activeTab === 'partners' && (
          <div id="partners" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold uppercase tracking-widest text-teal-700 bg-white/90 border border-teal-200 px-3.5 py-1 rounded-full">
                <Users className="w-3.5 h-3.5" /> Glow AI Partnership Program
              </span>
              <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
                Build a Stronger Healthcare AI Practice With Glow AI
              </h1>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Partner with us to help outpatient clinics, dental offices, and medical spas eliminate missed-call revenue leakage with turnkey, production-ready voice automation.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-white/90 backdrop-blur border border-slate-200 rounded-2xl p-6 text-center shadow-sm">
                <div className="text-3xl font-extrabold text-teal-600 font-mono">350,000+</div>
                <div className="text-sm font-extrabold uppercase tracking-wider text-slate-800 mt-1">US Outpatient & Dental Clinics</div>
                <p className="text-xs text-slate-500 mt-1">High front-desk call volume with chronic staffing bottlenecks</p>
              </div>
              <div className="bg-white/90 backdrop-blur border border-slate-200 rounded-2xl p-6 text-center shadow-sm">
                <div className="text-3xl font-extrabold text-slate-900 font-mono">$4,500+/mo</div>
                <div className="text-sm font-extrabold uppercase tracking-wider text-slate-800 mt-1">Avg. Clinic Missed-Call Leakage</div>
                <p className="text-xs text-slate-500 mt-1">Just 3 missed new-patient calls/week costs thousands monthly</p>
              </div>
              <div className="bg-white/90 backdrop-blur border border-slate-200 rounded-2xl p-6 text-center shadow-sm">
                <div className="text-3xl font-extrabold text-emerald-600 font-mono">14-Day Pilot</div>
                <div className="text-sm font-extrabold uppercase tracking-wider text-slate-800 mt-1">Zero-Friction Clinic Close</div>
                <p className="text-xs text-slate-500 mt-1">Practices verify real recovered bookings before paying $500/mo</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: Handshake,
                  title: 'Zero Technical Burden',
                  desc: 'Simply introduce a practice or share our live demo line (+1 804-259-1091). Our engineering team handles 100% of setup, forwarding, and support.'
                },
                {
                  icon: TrendingUp,
                  title: 'High-Converting 14-Day Trial',
                  desc: 'Clinics deploy risk-free for 14 days at $0 upfront cost—protecting your professional credibility while proving immediate ROI.'
                },
                {
                  icon: FileCheck2,
                  title: 'Co-Branded Outreach Assets',
                  desc: 'Access ready-to-send clinical introduction letters, specialty ROI briefs, and dedicated partner email routing (@glowaiautomation.com).'
                },
                {
                  icon: Headphones,
                  title: 'Dedicated Founder & Engineering Desk',
                  desc: 'Direct priority onboarding for every practice you introduce, with 48-hour turnaround from clinic form submission to live calls.'
                },
                {
                  icon: Globe,
                  title: 'Transparent Partner Attribution',
                  desc: 'Every clinic submitted with your Partner Name in our onboarding portal is logged cleanly for recurring partner economics.'
                },
                {
                  icon: ShieldCheck,
                  title: 'Zero Operational Liability',
                  desc: 'All client contracting, telephony infrastructure, and technical maintenance are managed directly by Glow AI Automation.'
                }
              ].map((card, i) => (
                <div key={i} className="bg-white/90 backdrop-blur border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition space-y-2.5">
                  <div className="w-9 h-9 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                    <card.icon className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900">{card.title}</h3>
                  <p className="text-[15px] font-medium text-slate-700 leading-relaxed">{card.desc}</p>
                </div>
              ))}
            </div>

            <div className="bg-gradient-to-r from-teal-50/95 via-white to-sky-50/90 border border-teal-200 rounded-3xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md shadow-teal-900/5">
              <div className="space-y-1.5 text-center sm:text-left">
                <h3 className="text-xl font-bold text-slate-900">Have a Practice Ready for a 14-Day Pilot?</h3>
                <p className="text-[15px] font-medium text-slate-700">
                  Submit their clinic profile directly through our onboarding portal with your Partner Name, or connect with our founder desk.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-3 shrink-0">
                <button
                  onClick={() => switchTab('onboard', 'onboard')}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-5 py-3 rounded-xl text-xs transition flex items-center gap-2 shadow-sm"
                >
                  Onboard a Clinic Now <ArrowRight className="w-4 h-4" />
                </button>
                <a
                  href="mailto:somesh@glowaiautomation.com?subject=Glow%20AI%20Partner%20Inquiry"
                  className="bg-white hover:bg-slate-50 text-slate-800 font-semibold px-5 py-3 rounded-xl text-xs border border-slate-200 transition"
                >
                  Contact Partner Desk
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 5: 14-DAY PILOT + LIVE ONBOARDING PORTAL (#onboard) */}
        {/* ================================================================= */}
        {activeTab === 'onboard' && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
            <div className="bg-gradient-to-br from-teal-50/95 via-white to-sky-50/85 border border-teal-200 rounded-3xl p-8 sm:p-10 shadow-lg shadow-teal-900/5 text-center space-y-4">
              <span className="inline-block text-xs font-mono font-bold uppercase tracking-widest text-teal-700 bg-white border border-teal-200 px-3 py-1 rounded-full">
                Zero-Risk Performance Guarantee
              </span>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                The 14-Day Free Clinical Pilot
              </h1>
              <p className="text-[15px] font-medium text-slate-700 max-w-2xl mx-auto leading-relaxed">
                Deploy Glow AI across your clinic phone overflow and after-hours lines for 14 days. If we do not capture qualified patient bookings for your practice, you pay nothing. Post-pilot flat retainer is just <strong className="text-slate-900">$500/month</strong> with no long-term lock-in.
              </p>
            </div>

            <ClinicOnboardingForm />
          </div>
        )}
      </main>

      {/* Clean Light Multi-Column Enterprise Footer */}
      <footer className="relative z-10 bg-white/95 backdrop-blur text-slate-800 border-t border-slate-200 mt-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 text-sm">
          <div className="space-y-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white shadow-sm">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-lg text-slate-900 tracking-tight">GLOW AI</span>
            </div>
            <p className="text-sm font-medium text-slate-700 leading-relaxed">
              Autonomous 24/7 voice reception and patient scheduling infrastructure built for US outpatient clinics, dental practices, and medical spas.
            </p>
          </div>

          <div className="space-y-3">
            <div className="font-extrabold text-slate-900 uppercase tracking-wider text-xs">Live Demos</div>
            <ul className="space-y-2.5 font-semibold text-slate-700">
              <li><button onClick={() => switchTab('call', 'call-demo')} className="hover:text-teal-700 transition">Call Assistant (Voice Demo)</button></li>
              <li><button onClick={() => switchTab('chat', 'chat-demo')} className="hover:text-teal-700 transition">Chat Assistant (Web Demo)</button></li>
              <li><button onClick={() => switchTab('onboard', 'onboard')} className="hover:text-teal-700 transition">14-Day Free Clinical Pilot</button></li>
            </ul>
          </div>

          <div className="space-y-3">
            <div className="font-extrabold text-slate-900 uppercase tracking-wider text-xs">Company & Partners</div>
            <ul className="space-y-2.5 font-semibold text-slate-700">
              <li><button onClick={() => switchTab('home', '')} className="hover:text-teal-700 transition">Platform Overview</button></li>
              <li><button onClick={() => switchTab('partners', 'partners')} className="hover:text-teal-700 transition">Clinical Partner Program</button></li>
              <li><a href="mailto:somesh@glowaiautomation.com" className="hover:text-teal-700 transition">Contact Engineering Desk</a></li>
            </ul>
          </div>

          <div className="space-y-3">
            <div className="font-extrabold text-slate-900 uppercase tracking-wider text-xs">Direct Contact</div>
            <ul className="space-y-2.5 text-sm font-semibold text-slate-800">
              <li>
                <a href="tel:+18042591091" className="text-teal-700 font-extrabold hover:underline">
                  Demo: +1 (804) 259-1091
                </a>
              </li>
              <li>
                <a href="mailto:somesh@glowaiautomation.com" className="hover:text-teal-700 transition break-all">
                  Desk: somesh@glowaiautomation.com
                </a>
              </li>
              <li>
                <a href="mailto:mrvr@glowaiautomation.com" className="hover:text-teal-700 transition break-all">
                  Outreach: mrvr@glowaiautomation.com
                </a>
              </li>
              <li className="text-slate-600 font-medium pt-0.5">
                Serving Clinics Across USA &amp; Canada
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-200 py-5 px-4 text-center text-xs font-semibold text-slate-600">
          © 2026 Glow AI Automation. All rights reserved. Non-Diagnostic Administrative Scheduling Infrastructure.
        </div>
      </footer>
    </div>
  );
}

