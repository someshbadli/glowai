import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import {
  ShieldCheck,
  CreditCard,
  Settings,
  LifeBuoy,
  Users,
  DollarSign,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  ArrowUpRight,
  LogOut,
  Building2,
  PhoneCall,
  CalendarCheck2,
  Send,
  Loader2,
  Sparkles,
  FileText,
  Lock,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react';

const AUTHORIZED_ACCOUNTS = {
  'mrvr@glowaiautomation.com': {
    password: 'GlowVijay2026!',
    role: 'partner',
    name: 'Dr. Vijay (Clinical Advisor)',
    code: 'VIJAY'
  },
  'vikas@glowaiautomation.com': {
    password: 'GlowVikas2026!',
    role: 'partner',
    name: 'Vikas (Channel Partner)',
    code: 'VIKAS'
  },
  'somesh@glowaiautomation.com': {
    password: 'GlowAdmin2026!',
    role: 'partner',
    name: 'Somesh Badli (Founder & Admin)',
    code: 'ADMIN'
  },
  'frontdesk@richmondclinic.com': {
    password: 'GlowClinic2026!',
    role: 'client',
    country: 'USA',
    name: 'Richmond Aesthetic & Outpatient Center'
  },
  'frontdesk@torontoclinic.ca': {
    password: 'GlowClinic2026!',
    role: 'client',
    country: 'Canada',
    name: 'Yorkville Medical & Aesthetic Clinic (Toronto)'
  },
  'canada@glowaiautomation.com': {
    password: 'GlowCanada2026!',
    role: 'partner',
    name: 'Canada Clinical Growth Desk',
    code: 'CANADA'
  }
};

export default function PortalWorkspace() {
  const [session, setSession] = useState(() => {
    try {
      const saved = localStorage.getItem('glow_portal_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [liveClinics, setLiveClinics] = useState([]);
  const [livePayments, setLivePayments] = useState([]);
  const [clinicProfile, setClinicProfile] = useState(null);

  useEffect(() => {
    if (!supabase || !session) return;

    const loadData = async () => {
      if (session.role === 'partner') {
        let query = supabase.from('clinics').select('*').order('created_at', { ascending: false });
        if (session.code !== 'ADMIN') {
          query = query.eq('partner_code', session.code);
        }
        const { data } = await query;
        if (data) setLiveClinics(data);
      } else if (session.role === 'client') {
        const { data: cData } = await supabase
          .from('clinics')
          .select('*')
          .eq('work_email', session.email)
          .order('created_at', { ascending: false })
          .limit(1);
        if (cData && cData[0]) setClinicProfile(cData[0]);

        const { data: pData } = await supabase
          .from('payments')
          .select('*')
          .eq('clinic_email', session.email)
          .order('created_at', { ascending: false });
        if (pData) setLivePayments(pData);
      }
    };

    loadData();

    const channel = supabase
      .channel('portal-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clinics' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, loadData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  // Client Modification & Support Form States
  const [modType, setModType] = useState('Update Operating Hours / Holiday Closure');
  const [modNotes, setModNotes] = useState('');
  const [modSending, setModSending] = useState(false);
  const [modSent, setModSent] = useState(false);

  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSending, setSupportSending] = useState(false);
  const [supportSent, setSupportSent] = useState(false);

  const updateSession = (nextSession) => {
    setSession(nextSession);
    try {
      if (nextSession) {
        localStorage.setItem('glow_portal_session', JSON.stringify(nextSession));
      } else {
        localStorage.removeItem('glow_portal_session');
      }
    } catch {}
  };

  const wiseUsdPaymentUrl =
    import.meta.env.VITE_WISE_PAYMENT_LINK ||
    'https://wise.com/pay/r/6ZCXMQKoAmt7uVA';
  const wiseCadPaymentUrl =
    import.meta.env.VITE_WISE_CAD_PAYMENT_LINK ||
    'https://wise.com/pay/r/7zdQFQgljjpgnZc';
  const wiseAnnualUsdUrl =
    import.meta.env.VITE_WISE_ANNUAL_USD_LINK ||
    'https://wise.com/pay/r/cIPAyTp9uNZX2RM';
  const wiseAnnualCadUrl =
    import.meta.env.VITE_WISE_ANNUAL_CAD_LINK ||
    'https://wise.com/pay/r/wx924QcG2oF-N4Q';

  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError('');

    const cleanEmail = loginEmail.trim().toLowerCase();
    const cleanPass = loginPassword.trim();

    if (!cleanEmail || !cleanPass) {
      setLoginError('Please enter both your registered email address and password.');
      return;
    }

    // Check explicit authorized partner/client accounts first
    const account = AUTHORIZED_ACCOUNTS[cleanEmail];
    if (account) {
      if (cleanPass !== account.password) {
        setLoginError('Incorrect password for this account. Please verify your credentials.');
        return;
      }
      updateSession({
        role: account.role,
        email: cleanEmail,
        name: account.name,
        code: account.code
      });
      setLoginPassword('');
      return;
    }

    // Block unrecognized @glowaiautomation.com partner addresses
    if (cleanEmail.endsWith('@glowaiautomation.com')) {
      setLoginError('Partner account not recognized or invalid password. Contact somesh@glowaiautomation.com.');
      return;
    }

    // Active clinic client login (requires the issued clinic portal password)
    if (cleanPass === 'GlowClinic2026!') {
      const clinicLabel = cleanEmail.split('@')[1]?.split('.')[0] || 'Enrolled Practice';
      const formattedName =
        clinicLabel.charAt(0).toUpperCase() + clinicLabel.slice(1) + ' Clinical Practice';
      updateSession({
        role: 'client',
        email: cleanEmail,
        country: cleanEmail.endsWith('.ca') ? 'Canada' : 'USA',
        name: formattedName
      });
      setLoginPassword('');
      return;
    }

    setLoginError('Invalid email or password. Use the credentials issued in your Glow AI welcome email.');
  };

  const handleCopyReferral = () => {
    const link = `https://glowaiautomation.com/#onboard?ref=${session?.code || 'PARTNER'}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const submitWeb3Ticket = async (subject, payload, setSending, setSent, resetFn) => {
    setSending(true);
    const web3Key = import.meta.env.VITE_WEB3FORMS_KEY || 'd24cb467-d97f-4fca-9689-aab1f1ac5344';
    try {

    if (supabase && session) {
      await supabase.from('portal_tickets').insert([
        {
          clinic_email: session.email,
          clinic_name: clinicProfile?.clinic_name || session.name,
          ticket_type: subject.includes('Modification') ? 'modification' : 'support',
          category: payload.Modification_Category || payload.Subject || 'General',
          details: payload.Requested_Changes || payload.Message || ''
        }
      ]);
    }
    
      await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: web3Key,
          subject,
          from_name: 'Glow AI Client & Partner Portal',
          ...payload
        })
      });
    } finally {
      setSending(false);
      setSent(true);
      if (resetFn) resetFn();
      setTimeout(() => setSent(false), 5000);
    }
  };

  // =========================================================================
  // VIEW 1: PASSWORD-PROTECTED PORTAL SIGN-IN SCREEN
  // =========================================================================
  if (!session) {
    return (
      <div id="portal" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-widest text-teal-700 bg-white border border-teal-200 px-3.5 py-1 rounded-full shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" /> Unified Client &amp; Partner Workspace
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            Glow AI Client &amp; Partner Portal
          </h1>
          <p className="text-base font-medium text-slate-700 leading-relaxed">
            Sign in with your assigned credentials to manage clinic subscriptions, service modifications, support tickets, or partner commission ledgers.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Login Form Card */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-8 shadow-xl shadow-teal-900/5 space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Secure Workspace Login</h2>
              <p className="text-sm font-medium text-slate-600 mt-1">
                Enter your registered clinic or <span className="font-mono text-teal-700">@glowaiautomation.com</span> partner credentials.
              </p>
            </div>

            {loginError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3.5 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1.5">Email Address *</label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="e.g., frontdesk@yourclinic.com or mrvr@glowaiautomation.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-bold text-slate-800">Password *</label>
                  <a
                    href="mailto:somesh@glowaiautomation.com?subject=Glow%20AI%20Portal%20Password%20Reset"
                    className="text-xs font-bold text-teal-700 hover:underline"
                  >
                    Forgot / Request Password?
                  </a>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your workspace password"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-11 py-3 text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-extrabold py-3.5 px-6 rounded-xl text-sm transition shadow-lg shadow-teal-600/20 flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" /> Sign In to Workspace
              </button>
            </form>
          </div>

          {/* Side Overview Card */}
          <div className="lg:col-span-5 bg-gradient-to-br from-teal-50/90 via-white to-sky-50/80 border border-teal-200 rounded-3xl p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white shadow-md">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900">Protected Role-Based Access</h3>
              <ul className="space-y-3 text-sm font-medium text-slate-700">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-1" />
                  <span><strong>Clinics:</strong> Pay your $500/mo retainer via US ACH/Card, view live forwarding configuration, and submit schedule updates.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-1" />
                  <span><strong>Partners &amp; Agents:</strong> Track referred clinics from 14-day pilot to active billing, view payment history, and monitor earned commissions.</span>
                </li>
              </ul>
            </div>

            <div className="bg-white/90 border border-teal-200/80 rounded-2xl p-4 text-xs font-semibold text-slate-700">
              Need your clinic or partner login password issued? Email{' '}
              <a href="mailto:somesh@glowaiautomation.com" className="text-teal-700 font-extrabold underline">
                somesh@glowaiautomation.com
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: CLINIC CLIENT PORTAL
  // =========================================================================
  if (session.role === 'client') {
    return (
      <div id="portal" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase text-teal-700 bg-teal-50 border border-teal-200 px-3 py-0.5 rounded-full">
              Clinic Client Workspace • {session.email}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{session.name}</h1>
          </div>
          <button
            onClick={() => updateSession(null)}
            className="inline-flex items-center gap-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2.5 rounded-xl transition self-start sm:self-auto"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">Subscription &amp; Billing</h2>
                  <p className="text-xs font-semibold text-slate-500">Flat Monthly Retainer • Zero Lock-In</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                14-Day Pilot Active
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <div>
                <div className="text-xs font-semibold text-slate-500">Monthly Plan Rate</div>
                <div className="text-2xl font-extrabold text-slate-900 font-mono mt-0.5">$500.00<span className="text-xs font-sans font-semibold text-slate-500">/mo</span></div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500">Pilot Guarantee Status</div>
                <div className="text-sm font-extrabold text-teal-700 mt-1.5">$0 Due During 14-Day Trial</div>
              </div>
            </div>

            <div className="space-y-2.5">
              <a
                href={wiseUsdPaymentUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-extrabold py-3.5 px-5 rounded-xl text-sm transition shadow-md shadow-teal-600/20 flex items-center justify-center gap-2"
              >
                Pay $500.00 Monthly Subscription (US ACH / Card) <ArrowUpRight className="w-4 h-4" />
              </a>
              <a
                      href={isCanada ? wiseAnnualCadUrl : wiseAnnualUsdUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3 px-5 rounded-xl text-xs sm:text-sm transition flex items-center justify-center gap-2"
                    >
                      Annual Offer: {isCanada ? '$6,500.00 CAD/yr (Save $1,300)' : '$5,000.00 USD/yr (Save $1,000)'} ? 2 Months Free <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                    </a>
                    <p className="text-xs font-medium text-slate-500 text-center">
                Processed securely via Wise Business USD • Instant receipt &amp; invoice emailed to {session.email}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Billing History</div>
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center justify-between text-xs font-semibold">
                <div>
                  <div className="text-slate-900 font-bold">INV-2026-001 • 14-Day Clinical Pilot Onboarding</div>
                  <div className="text-slate-500 mt-0.5">Zero-Risk Trial Period</div>
                </div>
                <span className="font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                  $0.00 PAID
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">Active AI Receptionist Configuration</h2>
                  <p className="text-xs font-semibold text-slate-500">Live Voice &amp; Calendar Routing Profile</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full">
                ONLINE 24/7
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                  <PhoneCall className="w-3.5 h-3.5 text-teal-600" /> Dedicated AI Forwarding Line
                </div>
                <div className="font-mono font-extrabold text-slate-900 mt-1">+1 (804) 259-1091</div>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-teal-600" /> Active Scheduling Window
                </div>
                <div className="font-bold text-slate-900 mt-1">Mon–Fri • 9:00 AM – 5:00 PM ET</div>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                  <CalendarCheck2 className="w-3.5 h-3.5 text-emerald-600" /> Calendar Integration
                </div>
                <div className="font-bold text-slate-900 mt-1">Google Calendar + Email Alerts</div>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-600" /> Clinical Safety Guardrail
                </div>
                <div className="font-bold text-emerald-700 mt-1">USA & Canada Non-Diagnostic Guardrail (PIPEDA/PHIPA Aligned)</div>
              </div>
            </div>

            <div className="bg-teal-50/70 border border-teal-200/80 rounded-2xl p-4 text-xs font-semibold text-slate-700">
              <strong>Booked Services Enabled:</strong> New Patient Consultations, Follow-Up Visits, Botox &amp; Aesthetic Consults.
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Service Modification Application</h2>
                <p className="text-xs font-semibold text-slate-500">Request changes to hours, holiday closures, providers, or services</p>
              </div>
            </div>

            {modSent ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-sm font-bold text-emerald-800 flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                Modification request received! Our engineering team will apply your update within 4 business hours.
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submitWeb3Ticket(
                    `Clinic Modification Request: ${session.name}`,
                    {
                      Client_Email: session.email,
                      Clinic: session.name,
                      Modification_Category: modType,
                      Requested_Changes: modNotes
                    },
                    setModSending,
                    setModSent,
                    () => setModNotes('')
                  );
                }}
                className="space-y-3.5"
              >
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1">Modification Category</label>
                  <select
                    value={modType}
                    onChange={(e) => setModType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-teal-600"
                  >
                    <option>Update Operating Hours / Holiday Closure</option>
                    <option>Add or Remove Consultation Services</option>
                    <option>Change Call Forwarding Mode (24/7 vs After-Hours)</option>
                    <option>Update Calendar Sync or Notification Email</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1">Modification Details *</label>
                  <textarea
                    required
                    rows={3}
                    value={modNotes}
                    onChange={(e) => setModNotes(e.target.value)}
                    placeholder="Describe the exact schedule or script change you need..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-teal-600"
                  />
                </div>
                <button
                  type="submit"
                  disabled={modSending}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-extrabold px-5 py-3 rounded-xl text-sm transition flex items-center gap-2"
                >
                  {modSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Submit Modification Request
                </button>
              </form>
            )}
          </div>

          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700">
                <LifeBuoy className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Priority Customer Support Desk</h2>
                <p className="text-xs font-semibold text-slate-500">Direct engineering &amp; front-desk assistance</p>
              </div>
            </div>

            {supportSent ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-sm font-bold text-emerald-800 flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                Support ticket logged! A Glow AI engineer will reply to {session.email} shortly.
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submitWeb3Ticket(
                    `Priority Support Ticket: ${supportSubject}`,
                    {
                      Client_Email: session.email,
                      Clinic: session.name,
                      Subject: supportSubject,
                      Message: supportMessage
                    },
                    setSupportSending,
                    setSupportSent,
                    () => {
                      setSupportSubject('');
                      setSupportMessage('');
                    }
                  );
                }}
                className="space-y-3.5"
              >
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1">Issue / Question Subject *</label>
                  <input
                    required
                    value={supportSubject}
                    onChange={(e) => setSupportSubject(e.target.value)}
                    placeholder="e.g., Carrier call-forwarding verification or calendar alert"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1">How Can We Help? *</label>
                  <textarea
                    required
                    rows={3}
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    placeholder="Share details and our engineering team will assist right away..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-teal-600"
                  />
                </div>
                <button
                  type="submit"
                  disabled={supportSending}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold px-5 py-3 rounded-xl text-sm transition flex items-center gap-2"
                >
                  {supportSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <LifeBuoy className="w-4 h-4" />}
                  Open Support Ticket
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: PARTNER & AGENT PORTAL
  // =========================================================================
  const partnerClients = liveClinics;

  return (
    <div id="portal" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase text-teal-700 bg-teal-50 border border-teal-200 px-3 py-0.5 rounded-full">
            Partner &amp; Agent Workspace • Code: {session.code}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{session.name}</h1>
          <p className="text-sm font-medium text-slate-600">{session.email}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleCopyReferral}
            className="inline-flex items-center gap-2 text-xs font-extrabold bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 px-4 py-2.5 rounded-xl transition"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-teal-600" />}
            {copiedLink ? 'Copied Referral Onboarding Link!' : `Copy Clinic Onboarding Link (?ref=${session.code})`}
          </button>
          <button
            onClick={() => updateSession(null)}
            className="inline-flex items-center gap-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2.5 rounded-xl transition"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </div>

      {/* Dedicated Shareable Referral Link Box */}
      <div className="bg-gradient-to-r from-teal-50 via-white to-emerald-50 border border-teal-200 rounded-3xl p-6 sm:p-7 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-teal-700">
            Your Dedicated Clinic Referral Link (Auto-Tags Partner Code {session.code})
          </div>
          <p className="text-xs sm:text-sm font-medium text-slate-700">
            Send this link to clinic owners or practice managers. Any 14-day pilot submitted through this link is automatically credited to your account.
          </p>
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="bg-white border border-teal-200 rounded-xl p-2.5">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-teal-700 mb-1">USA Clinics ($500 USD/mo)</div>
              <code className="block text-slate-900 font-mono text-xs font-bold break-all select-all">
                {`https://glowaiautomation.com/#onboard?ref=${session.code}&country=US`}
              </code>
            </div>
            <div className="bg-white border border-teal-200 rounded-xl p-2.5">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 mb-1">Canada Clinics ($650 CAD/mo)</div>
              <code className="block text-slate-900 font-mono text-xs font-bold break-all select-all">
                {`https://glowaiautomation.com/#onboard?ref=${session.code}&country=CA`}
              </code>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={handleCopyReferral}
            className="inline-flex items-center gap-2 text-xs font-extrabold bg-teal-600 hover:bg-teal-700 text-white px-4 py-3 rounded-xl transition shadow-sm"
          >
            {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copiedLink ? 'Referral Link Copied!' : 'Copy Referral Link'}
          </button>
          <a
            href={`mailto:?subject=${encodeURIComponent('14-Day Free AI Receptionist Pilot ? Glow AI Automation')}&body=${encodeURIComponent(`Hi,\n\nYou can activate your 14-day zero-risk AI receptionist pilot here (takes 2 minutes):\nhttps://glowaiautomation.com/#onboard?ref=${session.code}\n\nYou can also call the 24/7 live demo line anytime at +1 (804) 259-1091.\n\nBest regards,\n${session.name}`)}`}
            className="inline-flex items-center gap-2 text-xs font-extrabold bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 px-4 py-3 rounded-xl transition"
          >
            Share via Email <ArrowUpRight className="w-4 h-4 text-teal-600" />
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-teal-600" /> Referred Clinics
          </div>
          <div className="text-3xl font-extrabold text-slate-900 font-mono mt-2">{partnerClients.length}</div>
          <div className="text-xs font-semibold text-slate-500 mt-1">{partnerClients.filter(c => c.pipeline_stage?.includes('Pilot')).length} Active Pilots ? {partnerClients.filter(c => c.pipeline_stage?.includes('Active Paying')).length} Paying</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-emerald-600" /> Active Client MRR
          </div>
          <div className="text-3xl font-extrabold text-slate-900 font-mono mt-2">${partnerClients.filter(c => c.pipeline_stage === 'Active Paying').reduce((s, c) => s + Number(c.monthly_rate || 500), 0).toFixed(2)}</div>
          <div className="text-xs font-semibold text-teal-700 mt-1">${partnerClients.filter(c => c.pipeline_stage !== 'Active Paying').reduce((s, c) => s + Number(c.monthly_rate || 500), 0).toFixed(2)} Pending Pilot Conversions</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-teal-600" /> Total Commissions Earned
          </div>
          <div className="text-3xl font-extrabold text-emerald-600 font-mono mt-2">${partnerClients.reduce((s, c) => s + Number(c.commission_earned || 0), 0).toFixed(2)}</div>
          <div className="text-xs font-semibold text-slate-500 mt-1">$500 Day-1 bounty or $50/mo per active client</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <PhoneCall className="w-4 h-4 text-teal-600" /> Live Demo Line
          </div>
          <div className="text-lg font-extrabold text-teal-700 font-mono mt-2.5">+1 (804) 259-1091</div>
          <div className="text-xs font-semibold text-slate-500 mt-1">Share directly with clinic directors</div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Referred Clinics &amp; Commission Ledger</h2>
            <p className="text-xs font-semibold text-slate-500">
              Real-time status of clinics introduced under Partner Code <span className="font-mono text-teal-700">{session.code}</span>
            </p>
          </div>
          <a
            href="#onboard"
            className="bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition inline-flex items-center gap-1.5 self-start sm:self-auto"
          >
            + Submit New Clinic Lead
          </a>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-extrabold uppercase tracking-wider text-slate-500">
                <th className="py-3 pr-4">Clinic / Practice</th>
                <th className="py-3 px-4">Pipeline Stage</th>
                <th className="py-3 px-4">Retainer Plan</th>
                <th className="py-3 px-4">Commission Structure</th>
                <th className="py-3 pl-4 text-right">Earned Payout</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {partnerClients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-sm font-medium text-slate-500">
                    No referred clinics logged yet under <span className="font-mono font-bold text-teal-700">{session.code}</span>. Share your referral link above or click <strong className="text-slate-800">+ Submit New Clinic Lead</strong> to register a practice.
                  </td>
                </tr>
              ) : (
                partnerClients.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70">
                    <td className="py-4 pr-4">
                      <div className="font-extrabold text-slate-900">{row.clinic_name || row.clinic}</div>
                      <div className="text-xs text-slate-500">{row.contact_name || row.contact}</div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full border ${row.pipeline_stage === "Active Paying" ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-amber-700 bg-amber-50 border-amber-200"}`}>
                        {row.pipeline_stage || row.stage || "14-Day Pilot Active"}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-mono text-xs font-bold">{`${row.monthly_rate || 500}/mo`}</td>
                    <td className="py-4 px-4 text-xs font-semibold text-slate-700">{row.commission_option || row.commissionModel || "Option A: $500 Day-1 Bounty"}</td>
                    <td className="py-4 pl-4 text-right font-mono text-xs font-extrabold text-slate-900">{`${Number(row.commission_earned || 0).toFixed(2)}`}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-gradient-to-br from-teal-50/90 via-white to-emerald-50/70 border border-teal-200 rounded-3xl p-6 sm:p-8 space-y-3">
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-teal-700 flex items-center gap-1.5">
            <FileText className="w-4 h-4" /> Partner Commission Structure
          </div>
          <h3 className="text-lg font-extrabold text-slate-900">Choose Per-Clinic Payout Option</h3>
          <ul className="space-y-2.5 text-sm font-medium text-slate-700">
            <li>
              <strong className="text-slate-900">Option A — $500 Day-1 Cash Bounty:</strong> Paid immediately once your referred clinic completes their 14-day pilot and pays their first $500 monthly retainer.
            </li>
            <li>
              <strong className="text-slate-900">Option B — $50/Month Recurring per active client:</strong> Earn $50/month every billing month for each active referred clinic.
            </li>
          </ul>
        </div>

        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-3 shadow-sm">
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
            Partner Payout &amp; Disbursement History
          </div>
          <h3 className="text-lg font-extrabold text-slate-900">Recent Commission Transfers</h3>
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-sm font-medium text-slate-600">
            No completed payouts yet. Commissions automatically unlock as soon as your first referred clinic clears their 14-day zero-risk pilot.
          </div>
        </div>
      </div>
    </div>
  );
}
