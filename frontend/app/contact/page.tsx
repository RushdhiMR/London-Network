"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Mail, Phone, MapPin, Send, CheckCircle2, AlertCircle, Clock, ShieldCheck, MessageSquare } from "lucide-react";

export default function ContactUsPage() {
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    whatsapp: "",
    type: "Editorial" as "Editorial" | "Advertising" | "General Inquiry" | "Feedback" | "Press Release",
    message: ""
  });

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!formData.name.trim()) {
      setErrorMessage("Please enter your full name.");
      return;
    }

    if (!formData.email.trim() || !formData.email.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    if (!formData.message.trim()) {
      setErrorMessage("Please enter your inquiry or message.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to send contact message. Please try again.");
      }

      // Also persist to localStorage for instant local reactivity across tabs
      try {
        const now = new Date();
        const formattedDate = now.toLocaleDateString("en-US", { month: "short", day: "2-digit" }) + 
          ", " + now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

        const localSubmission = data.submission || {
          id: `cs-${Date.now()}`,
          date: formattedDate,
          name: formData.name.trim(),
          company: formData.company.trim() || "N/A",
          email: formData.email.trim(),
          phone: formData.phone.trim() ? `P: ${formData.phone.trim()}` : "P: 000 000 0000",
          whatsapp: formData.whatsapp.trim() ? `W: ${formData.whatsapp.trim()}` : "W: N/A",
          type: formData.type,
          message: formData.message.trim(),
          status: "New"
        };

        const existingRaw = localStorage.getItem("dj_contact_submissions");
        let existingList: any[] = [];
        if (existingRaw) {
          try { existingList = JSON.parse(existingRaw); } catch (e) {}
        }
        if (!Array.isArray(existingList)) existingList = [];
        existingList.unshift(localSubmission);
        localStorage.setItem("dj_contact_submissions", JSON.stringify(existingList));

        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("dj_contact_change"));
        }
      } catch (storageErr) {
        console.warn("Local storage sync notice:", storageErr);
      }

      setSuccessMessage("Your message has been sent successfully! Our editorial and support desk will review your submission shortly.");
      setFormData({
        name: "",
        company: "",
        email: "",
        phone: "",
        whatsapp: "",
        type: "Editorial",
        message: ""
      });
    } catch (err: any) {
      setErrorMessage(err.message || "Something went wrong. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FDFDFD] text-slate-900 font-sans flex flex-col justify-between">
      <div>
        <Header />

        {/* HERO SECTION */}
        <section className="relative text-white py-16 md:py-24 px-4 md:px-8 border-b border-zinc-900 overflow-hidden bg-slate-950">
          <img
            src="https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1920&q=80&fit=crop"
            alt="London BigBen Network"
            className="absolute inset-0 w-full h-full object-cover object-center filter brightness-90 contrast-105 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/75 to-black/50" />
          <div className="relative z-10 max-w-[1400px] mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-[#BF1E2D]/25 border border-[#BF1E2D]/50 text-[#ff4d5e] rounded-full text-xs font-mono font-bold tracking-wide uppercase mb-4 backdrop-blur-md shadow-xs">
              <MessageSquare className="w-3.5 h-3.5" />
              Direct Communication Desk
            </div>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-serif font-black tracking-tight text-white uppercase max-w-4xl leading-tight drop-shadow-md">
              Contact London BigBen Network
            </h1>
            <p className="mt-4 text-zinc-200 text-base md:text-lg max-w-2xl font-light leading-relaxed drop-shadow-sm">
              Reach our global editorial newsroom, commercial partnerships division, executive team, or support desk.
            </p>
          </div>
        </section>

        {/* MAIN CONTENT GRID */}
        <section className="max-w-[1400px] mx-auto px-4 md:px-8 py-12 md:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
            
            {/* LEFT COLUMN: CONTACT DETAILS & DEPARTMENTS */}
            <div className="lg:col-span-5 space-y-8">
              <div>
                <h2 className="text-2xl font-serif font-bold text-slate-900 tracking-tight">
                  Get in touch with us
                </h2>
                <p className="text-slate-600 text-sm mt-2 leading-relaxed">
                  Whether you are pitching an investigative story, inquiring about media syndication, looking for leadership sponsorship, or requiring assistance with our digital platform, we are here to assist.
                </p>
              </div>

              {/* DIRECT CHANNELS */}
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:border-slate-300 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-red-50 text-[#BF1E2D] flex items-center justify-center shrink-0 border border-red-100 font-bold">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-slate-900 text-base">Editorial & Newsroom</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Press releases, research breakthroughs, story leads</p>
                      <a href="mailto:editorial@londonbigben.com" className="inline-block mt-2 font-mono text-xs font-bold text-[#BF1E2D] hover:underline">
                        editorial@londonbigben.com
                      </a>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:border-slate-300 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 font-bold">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-slate-900 text-base">Advertising & Partnerships</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Commercial campaigns, brand sponsorships & events</p>
                      <a href="mailto:partnerships@londonbigben.com" className="inline-block mt-2 font-mono text-xs font-bold text-blue-600 hover:underline">
                        partnerships@londonbigben.com
                      </a>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:border-slate-300 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0 border border-slate-200 font-bold">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-slate-900 text-base">Headquarters & Press Bureau</h3>
                      <p className="text-xs text-slate-500 mt-0.5">1 Canada Square, Canary Wharf, London E14 5AA, United Kingdom</p>
                      <p className="mt-2 font-mono text-xs text-slate-700 font-semibold">
                        Tel: +44 20 7946 0912
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* OPERATING HOURS */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/60">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-700 uppercase tracking-wider mb-2">
                  <Clock className="w-4 h-4 text-[#BF1E2D]" />
                  Editorial Desk Hours
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Our digital newsroom operates 24/7. Inquiry responses are typically dispatched within 2–6 hours during business cycles.
                </p>
              </div>
            </div>

            {/* RIGHT COLUMN: INTERACTIVE CONTACT FORM */}
            <div className="lg:col-span-7">
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-lg shadow-slate-100 p-6 sm:p-8 md:p-10">
                <div className="border-b border-slate-100 pb-6 mb-6">
                  <h3 className="text-xl font-serif font-black text-slate-900 tracking-tight uppercase">
                    Send a Message to the Editorial & Admin Desk
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Fill out the form below. Your message will be logged immediately into the administrative terminal for review.
                  </p>
                </div>

                {successMessage && (
                  <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Message Sent Successfully</p>
                      <p className="text-xs text-emerald-700 mt-0.5">{successMessage}</p>
                    </div>
                  </div>
                )}

                {errorMessage && (
                  <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Unable to Send</p>
                      <p className="text-xs text-rose-700 mt-0.5">{errorMessage}</p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* FULL NAME */}
                    <div>
                      <label className="block text-xs font-mono font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Full Name <span className="text-[#BF1E2D]">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Eleanor Vance"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-[#BF1E2D] focus:bg-white transition-all shadow-sm"
                      />
                    </div>

                    {/* EMAIL ADDRESS */}
                    <div>
                      <label className="block text-xs font-mono font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Email Address <span className="text-[#BF1E2D]">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. eleanor@company.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-[#BF1E2D] focus:bg-white transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* COMPANY / ORGANIZATION */}
                    <div>
                      <label className="block text-xs font-mono font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Company / Organization
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Apex Media Partners"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-[#BF1E2D] focus:bg-white transition-all shadow-sm"
                      />
                    </div>

                    {/* INQUIRY TYPE */}
                    <div>
                      <label className="block text-xs font-mono font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Inquiry Category <span className="text-[#BF1E2D]">*</span>
                      </label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-[#BF1E2D] focus:bg-white transition-all cursor-pointer shadow-sm"
                      >
                        <option value="Editorial">Editorial & News Pitch</option>
                        <option value="Advertising">Advertising & Sponsorship</option>
                        <option value="General Inquiry">General Inquiry</option>
                        <option value="Feedback">Feedback & Reader Corrections</option>
                        <option value="Press Release">Press Release Submission</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* PHONE NUMBER */}
                    <div>
                      <label className="block text-xs font-mono font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Phone Number (Optional)
                      </label>
                      <input
                        type="tel"
                        placeholder="+44 20 7946 0912"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-[#BF1E2D] focus:bg-white transition-all shadow-sm"
                      />
                    </div>

                    {/* WHATSAPP NUMBER */}
                    <div>
                      <label className="block text-xs font-mono font-bold text-slate-700 uppercase tracking-wider mb-2">
                        WhatsApp (Optional)
                      </label>
                      <input
                        type="tel"
                        placeholder="+44 20 7946 0912"
                        value={formData.whatsapp}
                        onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-[#BF1E2D] focus:bg-white transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  {/* MESSAGE CONTENT */}
                  <div>
                    <label className="block text-xs font-mono font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Message / Inquiries <span className="text-[#BF1E2D]">*</span>
                    </label>
                    <textarea
                      required
                      rows={5}
                      placeholder="Please describe your inquiry, story details, or proposal here..."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-[#BF1E2D] focus:bg-white transition-all resize-y shadow-sm"
                    />
                  </div>

                  {/* PRIVACY NOTE */}
                  <p className="text-[11px] text-slate-400 leading-normal">
                    By submitting this form, you agree that London BigBen Network editorial staff may contact you regarding your inquiry in accordance with our editorial privacy policy.
                  </p>

                  {/* SUBMIT BUTTON */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto px-8 py-3.5 bg-[#BF1E2D] hover:bg-[#a61a27] text-white font-serif font-black uppercase text-sm tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.99]"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Transmitting Message...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Message
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

          </div>
        </section>
      </div>

      <Footer />
    </main>
  );
}
