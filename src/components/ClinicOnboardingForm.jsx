import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { CheckCircle2, PhoneCall, Calendar, Building2, Clock, Stethoscope, ArrowRight, Loader2 } from 'lucide-react';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const TIME_SLOTS = [
  '7:00 AM', '7:30 AM', '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM',
  '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '4:30 PM', '5:00 PM',
  '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '8:00 PM'
];

const COMMON_SERVICES = [
  'New Patient Consultations',
  'Follow-Up Visits',
  'Botox & Neurotoxins',
  'Dermal Fillers',
  'Laser / Morpheus8',
  'Dental Exams & Cleanings',
  'Emergency / Same-Day Triage'
];

export default function ClinicOnboardingForm() {
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    try {
      const hashQuery = window.location.hash.split('?')[1] || '';
      const searchQuery = window.location.search.replace(/^\?/, '');
      const params = new URLSearchParams(hashQuery || searchQuery);
      const ref = params.get('ref');
      const countryParam = params.get('country');
      setFormData((prev) => ({
        ...prev,
        ...(ref ? { partnerCode: ref.toUpperCase() } : {}),
        ...(countryParam && ['US', 'USA', 'CA', 'CANADA'].includes(countryParam.toUpperCase())
          ? { country: countryParam.toUpperCase().startsWith('CA') ? 'Canada' : 'USA' }
          : {})
      }));
    } catch {}
  }, []);
  const [submitting, setSubmitting] = useState(false);

  const [selectedDays, setSelectedDays] = useState(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [selectedServices, setSelectedServices] = useState(['New Patient Consultations', 'Follow-Up Visits']);

  const [formData, setFormData] = useState({
    country: 'USA',
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
    openTime: '9:00 AM',
    closeTime: '5:00 PM',
    lunchBreak: '12:00 PM – 1:00 PM (Forward calls during lunch)',
    calendarPlatform: 'Google Calendar',
    calendarEmail: '',
    receptionistName: 'Savannah',
    customServices: '',
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

  const toggleDay = (day) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const toggleService = (service) => {
    setSelectedServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const web3Key = import.meta.env.VITE_WEB3FORMS_KEY;
    const formattedDays = selectedDays.length > 0 ? selectedDays.join(', ') : 'Mon–Fri';
    const formattedHours = `${formData.openTime} – ${formData.closeTime} (${formData.timezone})`;
    const allServices = [
      ...selectedServices,
      ...(formData.customServices.trim() ? [formData.customServices.trim()] : [])
    ].join(', ');

    const payload = {
      Country_Region: formData.country === 'Canada' ? 'Canada ($650 CAD/mo)' : 'USA ($500 USD/mo)',
            Clinic_Name: formData.clinicName,
      Contact_Name: `${formData.contactName} (${formData.contactTitle})`,
      Work_Email: formData.email,
      Direct_Phone: formData.phone,
      Main_Office_Number: formData.mainClinicNumber,
      Phone_Carrier: formData.phoneProvider,
      Call_Routing_Mode: formData.forwardingMode,
      Operating_Days: formattedDays,
      Operating_Hours: formattedHours,
      Lunch_Overflow_Window: formData.lunchBreak,
      Calendar_System: formData.calendarPlatform,
      Calendar_Sync_Email: formData.calendarEmail || formData.email,
      Services_Offered: allServices || 'General Consultations',
      Partner_Attribution: formData.partnerCode || 'Direct',
    };

    try {

    if (supabase) {
      await supabase.from('clinics').insert([
        {
          clinic_name: formData.clinicName,
          contact_name: `${formData.contactName} (${formData.contactTitle})`,
          work_email: formData.email.trim().toLowerCase(),
          direct_phone: formData.phone,
          main_office_number: formData.mainClinicNumber,
          phone_carrier: formData.phoneProvider,
          call_routing_mode: formData.forwardingMode,
          operating_days: formattedDays,
          operating_hours: formattedHours,
          lunch_overflow: formData.lunchBreak,
          calendar_system: formData.calendarPlatform,
          services_offered: allServices || 'General Consultations',
          country: formData.country || 'USA',
          currency: formData.country === 'Canada' ? 'CAD' : 'USD',
          monthly_rate: formData.country === 'Canada' ? 650 : 500,
          partner_code: (formData.partnerCode || 'DIRECT').trim().toUpperCase(),
          pipeline_stage: '14-Day Pilot Active'
        }
      ]);
    }

    
      if (web3Key) {
        await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            access_key: web3Key,
            subject: `New 14-Day Pilot Onboarding: ${formData.clinicName}`,
            from_name: 'Glow AI Onboarding Portal',
            ...payload,
          }),
        });
      } else {
        fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'pilot_onboarding', ...payload }),
        }).catch(() => {});

        const body = encodeURIComponent(
          Object.entries(payload)
            .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
            .join('\n')
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
        <h3 className="text-2xl font-extrabold text-slate-900">14-Day Clinical Pilot Initiated</h3>
        <p className="text-sm sm:text-base text-slate-700 max-w-lg mx-auto leading-relaxed">
          Thank you, <strong className="text-slate-900">{formData.contactName}</strong>. Our engineering team has received the exact schedule and service configuration for <strong className="text-teal-700">{formData.clinicName}</strong> and will deliver your dedicated forwarding line and calendar sync within 48 hours.
        </p>
        <div className="text-xs font-mono font-semibold text-slate-600 pt-2">
          Direct Desk: somesh@glowaiautomation.com • Live Demo: +1 (804) 259-1091
        </div>
        <button
          onClick={() => setSubmitted(false)}
          className="mt-2 text-xs font-bold text-teal-700 hover:text-teal-800 underline"
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
          <span className="inline-block text-[11px] font-mono font-bold uppercase tracking-widest text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full">
            Turnkey 48-Hour Deployment
          </span>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
            Activate Your 14-Day Free Clinical Pilot
          </h3>
          <p className="text-sm font-medium text-slate-700 mt-1">
            Zero software installed on clinic PCs. Select your schedule and services below so we can configure your dedicated AI receptionist.
          </p>
        </div>
        <div className="bg-teal-50/80 border border-teal-200 px-4 py-2.5 rounded-2xl text-left sm:text-right shrink-0">
          <div className="text-[10px] text-teal-700 uppercase font-mono font-bold">Live US Demo Line</div>
          <a href="tel:+18042591091" className="text-sm font-extrabold text-slate-900 font-mono hover:text-teal-700 transition">
            +1 (804) 259-1091
          </a>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* SECTION 1: PRACTICE & DECISION-MAKER DETAILS */}
        <div className="space-y-4">
          <div className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
            <Building2 className="w-4 h-4 text-teal-600" /> 1. Practice & Decision-Maker Details
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">Clinic / Practice Name *</label>
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
              <label className="block text-sm font-bold text-slate-800 mb-1.5">Primary Contact Name *</label>
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
              <label className="block text-sm font-bold text-slate-800 mb-1.5">Work Email (For Booking Alerts) *</label>
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
              <label className="block text-sm font-bold text-slate-800 mb-1.5">Direct Phone / SMS *</label>
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

        {/* SECTION 2: TELEPHONY & CALL FORWARDING */}
        <div className="space-y-4">
          <div className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
            <PhoneCall className="w-4 h-4 text-teal-600" /> 2. Telephony & Call Forwarding Setup
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">Existing Office Phone Number *</label>
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
              <label className="block text-sm font-bold text-slate-800 mb-1.5">Current Phone / VoIP Carrier</label>
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
              <label className="block text-sm font-bold text-slate-800 mb-1.5">Call Routing Mode</label>
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

        {/* SECTION 3: OPERATING DAYS & OPERATING HOURS */}
        <div className="space-y-4">
          <div className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
            <Clock className="w-4 h-4 text-teal-600" /> 3. Clinic Operating Days & Hours
          </div>

          {/* Interactive Day Pills */}
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-2">
              Select Operating Days (Click to toggle) *
            </label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((day) => {
                const isSelected = selectedDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-4 py-2 rounded-xl text-xs font-extrabold transition border ${
                      isSelected
                        ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Separate Opening Time, Closing Time, Timezone & Lunch Window */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">Opening Time</label>
              <select
                name="openTime"
                value={formData.openTime}
                onChange={handleChange}
                className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
              >
                {TIME_SLOTS.slice(0, 8).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">Closing Time</label>
              <select
                name="closeTime"
                value={formData.closeTime}
                onChange={handleChange}
                className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
              >
                {TIME_SLOTS.slice(8).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">Clinic Timezone</label>
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
              <label className="block text-sm font-bold text-slate-800 mb-1.5">Lunch Break Coverage</label>
              <select
                name="lunchBreak"
                value={formData.lunchBreak}
                onChange={handleChange}
                className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
              >
                <option>12:00 PM – 1:00 PM (Forward calls during lunch)</option>
                <option>1:00 PM – 2:00 PM (Forward calls during lunch)</option>
                <option>No Lunch Closure (Open continuously)</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 4: SERVICES OFFERED (MULTI-SELECT CHIPS + CUSTOM FIELD) */}
        <div className="space-y-4">
          <div className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
            <Stethoscope className="w-4 h-4 text-teal-600" /> 4. Services & Consultation Types Offered
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-800 mb-2">
              Select Services Your AI Receptionist Should Book (Click all that apply)
            </label>
            <div className="flex flex-wrap gap-2">
              {COMMON_SERVICES.map((service) => {
                const active = selectedServices.includes(service);
                return (
                  <button
                    key={service}
                    type="button"
                    onClick={() => toggleService(service)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition border ${
                      active
                        ? 'bg-teal-50 text-teal-800 border-teal-500 shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {active ? '✓ ' : '+ '}{service}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1.5">
              Additional / Custom Procedures (Optional)
            </label>
            <input
              name="customServices"
              value={formData.customServices}
              onChange={handleChange}
              placeholder="e.g., Invisalign Consults, Microneedling, Hormone Therapy, PRP..."
              className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
            />
          </div>
        </div>

        {/* SECTION 5: CALENDAR SYNC & PARTNER ATTRIBUTION */}
        <div className="space-y-4">
          <div className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
            <Calendar className="w-4 h-4 text-teal-600" /> 5. Calendar Sync & Partner Attribution
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">Calendar Platform</label>
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
              <label className="block text-sm font-bold text-slate-800 mb-1.5">Calendar Sync Email (Optional)</label>
              <input
                type="email"
                name="calendarEmail"
                value={formData.calendarEmail}
                onChange={handleChange}
                placeholder="Same as work email if blank"
                className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">Clinical Partner / Referral Name</label>
              <input
                name="partnerCode"
                value={formData.partnerCode}
                onChange={handleChange}
                placeholder="e.g., Dr. Vijay / Vikas / Direct"
                className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
              />
            </div>
          </div>
        </div>

        <label className="flex items-start gap-3 text-sm font-medium text-slate-800 bg-gradient-to-r from-teal-50/80 to-emerald-50/60 p-4 rounded-2xl border border-teal-200/80 cursor-pointer">
          <input
            type="checkbox"
            required
            name="agreedToPilot"
            checked={formData.agreedToPilot}
            onChange={handleChange}
            className="mt-1 accent-teal-600"
          />
          <span>
            I confirm enrollment in the <strong className="font-extrabold text-slate-900">14-Day Zero-Risk Clinical Pilot</strong> ($0 setup fee; if Glow AI does not capture qualified patient bookings during the 14-day pilot, we pay nothing; post-pilot flat $500/month with no lock-in contract).
          </span>
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 disabled:opacity-50 text-white font-extrabold py-4 px-6 rounded-xl text-base transition shadow-lg shadow-teal-600/20 flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Submitting Configuration...
            </>
          ) : (
            <>
              Submit &amp; Start 14-Day Free Pilot <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
