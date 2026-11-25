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
      <div id="onboard" className="bg-slate-900 border border-teal-500/40 rounded-2xl p-8 text-center space-y-4 shadow-2xl">
        <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h3 className="text-2xl font-bold text-white">14-Day Pilot Onboarding Initiated</h3>
        <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
          Thank you, <strong className="text-white">{formData.contactName}</strong>. Our engineering team has received the configuration profile for <strong className="text-teal-300">{formData.clinicName}</strong> and will deliver your dedicated forwarding number and live calendar sync within 48 hours.
        </p>
        <div className="text-xs font-mono text-slate-400 pt-2">
          Questions? Direct Desk: somesh@glowaiautomation.com • Live Demo: +1 (804) 259-1091
        </div>
        <button
          onClick={() => setSubmitted(false)}
          className="mt-2 text-xs text-teal-400 hover:text-teal-300 underline"
        >
          Submit another practice location
        </button>
      </div>
    );
  }

  return (
    <div id="onboard" className="bg-slate-900/95 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl text-left">
      <div className="border-b border-slate-800 pb-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-widest text-teal-400">
            Turnkey 48-Hour Deployment
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-white mt-1">
            Activate Your 14-Day Free Clinical Pilot
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Zero software installation required. Complete the profile below so we can configure your dedicated AI line and calendar sync.
          </p>
        </div>
        <div className="bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-right shrink-0">
          <div className="text-[10px] text-slate-500 uppercase font-mono">Live Demo Line</div>
          <a href="tel:+18042591091" className="text-xs font-bold text-teal-400 font-mono hover:underline">
            +1 (804) 259-1091
          </a>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-teal-300 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" /> 1. Practice & Decision-Maker Details
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Clinic / Practice Name *</label>
              <input
                required
                name="clinicName"
                value={formData.clinicName}
                onChange={handleChange}
                placeholder="e.g., Richmond Aesthetic & Laser Center"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Primary Contact Name *</label>
              <input
                required
                name="contactName"
                value={formData.contactName}
                onChange={handleChange}
                placeholder="e.g., Dr. Sarah Jenkins / Emily Carter"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Work Email (For Booking Alerts) *</label>
              <input
                required
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="frontdesk@yourclinic.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Direct Phone / SMS *</label>
              <input
                required
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="(804) 555-0199"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-teal-300 flex items-center gap-1.5">
            <PhoneCall className="w-3.5 h-3.5" /> 2. Telephony & Call Forwarding Setup
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Existing Office Phone Number *</label>
              <input
                required
                name="mainClinicNumber"
                value={formData.mainClinicNumber}
                onChange={handleChange}
                placeholder="(804) 555-0100"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Current Phone / VoIP Carrier</label>
              <select
                name="phoneProvider"
                value={formData.phoneProvider}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
              >
                <option>AT&T / Verizon / Landline</option>
                <option>RingCentral</option>
                <option>Comcast Business</option>
                <option>Weave / Dental VoIP</option>
                <option>Nextiva / 8x8 / Other</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Call Routing Mode</label>
              <select
                name="forwardingMode"
                value={formData.forwardingMode}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
              >
                <option>After-Hours, Lunch & Weekends Only</option>
                <option>24/7 Overflow (Unanswered after 3 rings)</option>
                <option>Full 24/7 Front-Desk Coverage</option>
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-teal-300 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> 3. Calendar Sync & Partner Attribution
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Clinic Timezone</label>
              <select
                name="timezone"
                value={formData.timezone}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
              >
                <option>Eastern Time (ET)</option>
                <option>Central Time (CT)</option>
                <option>Mountain Time (MT)</option>
                <option>Pacific Time (PT)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Calendar System</label>
              <select
                name="calendarPlatform"
                value={formData.calendarPlatform}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
              >
                <option>Google Calendar</option>
                <option>Microsoft Outlook / 365</option>
                <option>Calendly / Acuity</option>
                <option>EHR Placeholder Email Feed</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Clinical Partner / Referral Name</label>
              <input
                name="partnerCode"
                value={formData.partnerCode}
                onChange={handleChange}
                placeholder="e.g., Dr. Vijay / Vikas / Direct"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Top Consultation Types & Operating Hours</label>
            <input
              name="servicesList"
              value={formData.servicesList}
              onChange={handleChange}
              placeholder="e.g., Mon–Fri 9 AM–5 PM • Botox, Laser Consults, New Patient Exams"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
            />
          </div>
        </div>

        <label className="flex items-start gap-2.5 text-xs text-slate-300 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 cursor-pointer">
          <input
            type="checkbox"
            required
            name="agreedToPilot"
            checked={formData.agreedToPilot}
            onChange={handleChange}
            className="mt-0.5 accent-teal-500"
          />
          <span>
            I confirm enrollment in the <strong className="text-white">14-Day Zero-Risk Clinical Pilot</strong> ($0 setup fee; if Glow AI does not capture qualified bookings during the 14-day pilot, we pay nothing; post-pilot flat $500/month with no lock-in contract).
          </span>
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold py-3.5 px-6 rounded-xl text-sm transition shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2"
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
