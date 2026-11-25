import React, { useState } from 'react';
import { CheckCircle2, PhoneCall, Calendar, Building2, ArrowRight, Loader2 } from 'lucide-react';

export default function ClinicOnboardingForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    clinicName: '',
    contactName: '',
    contactTitle: 'Practice Manager / Owner',
    email: '',
    phone: '',
    website: '',
    mainClinicNumber: '',
    phoneProvider: 'AT&T / Verizon / Landline',
    forwardingMode: 'After-Hours, Lunch & Weekends Only',
    timezone: 'Eastern Time (ET)',
    operatingHours: 'Mon–Fri, 9:00 AM – 5:00 PM',
    calendarPlatform: 'Google Calendar',
    calendarEmail: '',
    receptionistName: 'Savannah',
    servicesList: 'New Patient Consultations, Follow-Up Visits, Procedure Inquiries',
    partnerCode: '',
    agreedToPilot: true,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const web3Key = import.meta.env.VITE_WEB3FORMS_KEY;

    try {
      if (web3Key) {
        await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            access_key: web3Key,
            subject: `New 14-Day Pilot Onboarding: ${formData.clinicName}`,
            from_name: 'Glow AI Onboarding Portal',
            ...formData,
          }),
        });
      } else {
        fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'pilot_onboarding', ...formData }),
        }).catch(() => {});

        const body = encodeURIComponent(
          `NEW 14-DAY CLINIC PILOT ONBOARDING\n\n` +
          `Clinic Name: ${formData.clinicName}\n` +
          `Contact: ${formData.contactName} (${formData.contactTitle})\n` +
          `Email: ${formData.email}\n` +
          `Direct Cell: ${formData.phone}\n` +
          `Website: ${formData.website}\n\n` +
          `--- PHONE & ROUTING ---\n` +
          `Main Office Number: ${formData.mainClinicNumber}\n` +
          `Carrier / VoIP: ${formData.phoneProvider}\n` +
          `Forwarding Mode: ${formData.forwardingMode}\n\n` +
          `--- SCHEDULE & CALENDAR ---\n` +
          `Timezone: ${formData.timezone}\n` +
          `Hours: ${formData.operatingHours}\n` +
          `Calendar Platform: ${formData.calendarPlatform} (${formData.calendarEmail})\n\n` +
          `--- RECEPTIONIST & PARTNER ---\n` +
          `AI Persona: ${formData.receptionistName}\n` +
          `Core Services: ${formData.servicesList}\n` +
          `Partner / Referral Code: ${formData.partnerCode || 'Direct'}\n`
        );
        window.open(
          `mailto:somesh@glowaiautomation.com?subject=${encodeURIComponent(
            `14-Day Pilot Onboarding — ${formData.clinicName}`
          )}&body=${body}`,
          '_blank'
        );
      }
    } finally {
      setSubmitting(false);
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div id="onboard" className="bg-white border border-teal-200 rounded-3xl p-8 sm:p-10 text-center space-y-4 shadow-xl shadow-teal-900/5">
        <div className="w-14 h-14 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center mx-auto text-teal-600">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <h3 className="text-2xl font-bold text-slate-900">14-Day Clinical Pilot Initiated</h3>
        <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
          Thank you, <strong className="text-slate-900">{formData.contactName}</strong>. Our engineering team has received the configuration profile for <strong className="text-teal-700">{formData.clinicName}</strong> and will deliver your dedicated forwarding line and calendar sync within 48 hours.
        </p>
        <div className="text-xs font-mono text-slate-500 pt-2">
          Direct Desk: somesh@glowaiautomation.com • Live Demo: +1 (804) 259-1091
        </div>
        <button
          onClick={() => setSubmitted(false)}
          className="mt-2 text-xs font-semibold text-teal-700 hover:text-teal-800 underline"
        >
          Submit another practice location
        </button>
      </div>
    );
  }

  return (
    <div id="onboard" className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-10 shadow-xl shadow-teal-900/5 text-left">
      <div className="border-b border-slate-100 pb-6 mb-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="inline-block text-[11px] font-mono font-semibold uppercase tracking-widest text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full">
            Turnkey 48-Hour Deployment
          </span>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
            Activate Your 14-Day Free Clinical Pilot
          </h3>
          <p className="text-sm font-medium text-slate-700 mt-1">
            Zero software installed on clinic PCs. Complete your practice profile below to receive your dedicated AI forwarding line.
          </p>
        </div>
        <div className="bg-teal-50/70 border border-teal-200/80 px-4 py-2.5 rounded-2xl text-left sm:text-right shrink-0">
          <div className="text-[10px] text-teal-700 uppercase font-mono font-semibold">Live US Demo Line</div>
          <a href="tel:+18042591091" className="text-sm font-bold text-slate-900 font-mono hover:text-teal-700 transition">
            +1 (804) 259-1091
          </a>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-teal-600" /> 1. Practice & Decision-Maker Details
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1">Clinic / Practice Name *</label>
              <input
                required
                name="clinicName"
                value={formData.clinicName}
                onChange={handleChange}
                placeholder="e.g., Richmond Aesthetic & Laser Center"
                className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1">Primary Contact Name *</label>
              <input
                required
                name="contactName"
                value={formData.contactName}
                onChange={handleChange}
                placeholder="e.g., Dr. Sarah Jenkins / Emily Carter"
                className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1">Work Email (For Booking Alerts) *</label>
              <input
                required
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="frontdesk@yourclinic.com"
                className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1">Direct Phone / SMS *</label>
              <input
                required
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="(804) 555-0199"
                className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <PhoneCall className="w-4 h-4 text-teal-600" /> 2. Telephony & Call Forwarding Setup
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1">Existing Office Phone Number *</label>
              <input
                required
                name="mainClinicNumber"
                value={formData.mainClinicNumber}
                onChange={handleChange}
                placeholder="(804) 555-0100"
                className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1">Current Phone / VoIP Carrier</label>
              <select
                name="phoneProvider"
                value={formData.phoneProvider}
                onChange={handleChange}
                className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
              >
                <option>AT&T / Verizon / Landline</option>
                <option>RingCentral</option>
                <option>Comcast Business</option>
                <option>Weave / Dental VoIP</option>
                <option>Nextiva / 8x8 / Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1">Call Routing Mode</label>
              <select
                name="forwardingMode"
                value={formData.forwardingMode}
                onChange={handleChange}
                className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
              >
                <option>After-Hours, Lunch & Weekends Only</option>
                <option>24/7 Overflow (Unanswered after 3 rings)</option>
                <option>Full 24/7 Front-Desk Coverage</option>
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-teal-600" /> 3. Calendar Sync & Partner Attribution
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1">Clinic Timezone</label>
              <select
                name="timezone"
                value={formData.timezone}
                onChange={handleChange}
                className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
              >
                <option>Eastern Time (ET)</option>
                <option>Central Time (CT)</option>
                <option>Mountain Time (MT)</option>
                <option>Pacific Time (PT)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1">Calendar System</label>
              <select
                name="calendarPlatform"
                value={formData.calendarPlatform}
                onChange={handleChange}
                className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
              >
                <option>Google Calendar</option>
                <option>Microsoft Outlook / 365</option>
                <option>Calendly / Acuity</option>
                <option>EHR Placeholder Email Feed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1">Clinical Partner / Referral Name</label>
              <input
                name="partnerCode"
                value={formData.partnerCode}
                onChange={handleChange}
                placeholder="e.g., Dr. Vijay / Vikas / Direct"
                className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">Top Consultation Types & Operating Hours</label>
            <input
              name="servicesList"
              value={formData.servicesList}
              onChange={handleChange}
              placeholder="e.g., Mon–Fri 9 AM–5 PM • Botox, Laser Consults, New Patient Exams"
              className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
            />
          </div>
        </div>

        <label className="flex items-start gap-3 text-xs text-slate-700 bg-gradient-to-r from-teal-50/80 to-emerald-50/60 p-4 rounded-2xl border border-teal-200/80 cursor-pointer">
          <input
            type="checkbox"
            required
            name="agreedToPilot"
            checked={formData.agreedToPilot}
            onChange={handleChange}
            className="mt-0.5 accent-teal-600"
          />
          <span>
            I confirm enrollment in the <strong className="text-slate-900">14-Day Zero-Risk Clinical Pilot</strong> ($0 setup fee; if Glow AI does not capture qualified patient bookings during the 14-day pilot, we pay nothing; post-pilot flat $500/month with no lock-in contract).
          </span>
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 disabled:opacity-50 text-white font-bold py-3.5 px-6 rounded-xl text-sm transition shadow-lg shadow-teal-600/20 flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Submitting Configuration...
            </>
          ) : (
            <>
              Submit & Start 14-Day Free Pilot <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
