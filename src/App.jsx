import React, { useState } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  Database, 
  Send, 
  ShieldCheck, 
  Lock
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('simulation');
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Hi there! Welcome to Radiance Aesthetic Institute. Are you interested in scheduling an appointment or inquiring about our laser and injectable treatments?' }
  ]);
  const [userInput, setUserInput] = useState('');
  const [leadStage, setLeadStage] = useState('Inquiry Capture');

  // ROI Calculator States
  const [monthlyLeads, setMonthlyLeads] = useState(120);
  const [averageTicket, setAverageTicket] = useState(950);
  const [dropoffRate, setDropoffRate] = useState(40);

  const calculateLostRevenue = () => {
    const afterHoursDropoff = (monthlyLeads * (dropoffRate / 100));
    return Math.round(afterHoursDropoff * averageTicket);
  };

  const calculateRecovered = () => {
    const lost = calculateLostRevenue();
    return Math.round(lost * 0.35);
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const userText = userInput;
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setUserInput('');

    setTimeout(() => {
      let reply = "I would be happy to coordinate that for you. Our physician-led team offers Morpheus8, neurotoxin injectables, and advanced skin resurfacing. Would you prefer a morning or late afternoon consultation slot this Thursday?";
      if (userText.toLowerCase().includes('botox') || userText.toLowerCase().includes('price') || userText.toLowerCase().includes('cost')) {
        reply = "Botox is structured at $14/unit, administered strictly by board-certified practitioners. Typical sessions use 20–40 units depending on the target areas. Would you like to reserve a 15-minute diagnostic assessment?";
        setLeadStage('Treatment Qualified');
      } else if (userText.toLowerCase().includes('time') || userText.toLowerCase().includes('book') || userText.toLowerCase().includes('thursday') || userText.toLowerCase().includes('yes')) {
        reply = "Confirmed. I have reserved an opening for Thursday at 4:30 PM with Dr. Sarah Jenkins. A calendar invitation and pre-treatment protocol have been dispatched to your mobile.";
        setLeadStage('Direct Calendar Booking Confirmed');
      }
      setMessages(prev => [...prev, { sender: 'bot', text: reply }]);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-teal-500 selection:text-white">
      <div className="bg-gradient-to-r from-teal-900/60 via-slate-900 to-emerald-950/60 border-b border-teal-500/20 px-4 py-2 text-center text-xs tracking-wide text-teal-300">
        <span className="font-semibold uppercase tracking-wider bg-teal-500/20 px-2 py-0.5 rounded text-teal-200 mr-2 border border-teal-500/30">Vercel Production Node</span>
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
                40% of aesthetic inquiries arrive after clinic hours. Glow AI qualifies treatments, answers protocol questions, and deposits confirmed appointments straight into your electronic medical calendar.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-semibold text-slate-200">Live Client View (Simulated Widget)</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">Target: Radiance MedSpa</span>
                </div>

                <div className="h-80 overflow-y-auto space-y-3 pr-2 mb-4 scrollbar-thin">
                  {messages.map((m, idx) => (
                    <div key={idx} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[82%] text-xs p-3 rounded-xl leading-relaxed ${
                        m.sender === 'user'
                          ? 'bg-teal-600 text-white rounded-br-none shadow-md'
                          : 'bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-bl-none'
                      }`}>
                        {m.text}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {[
                    "How much is Botox per unit?",
                    "Do you have openings this Thursday?",
                    "What is Morpheus8 downtime?"
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
                    placeholder="Type an inquiry or pick a sample question above..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                  <button
                    type="submit"
                    className="bg-teal-500 hover:bg-teal-400 text-slate-950 px-4 py-2 rounded-lg text-xs font-semibold flex items-center justify-center transition"
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

                    <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl">
                      <div className="text-[11px] text-slate-500 uppercase tracking-wider mb-1">EHR & CRM Dispatch Status</div>
                      <div className="text-xs text-slate-300 flex items-center justify-between">
                        <span>Aesthetic Record / Boulevard API:</span>
                        <span className="font-mono text-emerald-400">Authenticated (Ready)</span>
                      </div>
                      <div className="text-xs text-slate-300 flex items-center justify-between mt-1">
                        <span>Google Calendar Practitioner Slot:</span>
                        <span className="font-mono text-emerald-400">Holding slot: Thu 4:30 PM</span>
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
                          <div className="text-xs font-bold text-emerald-400">2.4 Seconds</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-teal-950/20 border border-teal-500/20 rounded-xl p-4 flex gap-3 items-center">
                  <Clock className="w-6 h-6 text-teal-400 shrink-0" />
                  <div className="text-xs text-slate-300">
                    <strong className="text-white">Zero Receptionist Workload:</strong> Inquiries arriving between 6 PM Friday and 8 AM Monday are qualified and converted automatically without staff handling phones off-duty.
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
              <p className="text-slate-400 text-sm">Calculate how much high-margin procedural income your clinic forfeits due to missed after-hours and weekend traffic.</p>
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
                  <div className="text-[11px] text-slate-400 mt-1">At standard $500/month flat retainer (ROI: {(calculateRecovered() / 500).toFixed(1)}x)</div>
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
              <h2 className="text-3xl font-bold text-white">Clinical Compliance & Guardrails</h2>
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
                <span>Retainer after pilot: $500/month flat fee with month-to-month cancellation</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <div className="text-xs text-slate-400">Direct Founder Line</div>
                <div className="text-sm font-bold text-white">Somesh Badli</div>
                <div className="text-xs font-mono text-teal-400">+91 79754 94657 | someshbadli@gmail.com</div>
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
        <p className="font-mono text-[11px] text-slate-600">Operating under founder Somesh Badli • someshbadli@gmail.com • +91 79754 94657</p>
      </footer>
    </div>
  );
}