"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Send, CheckCircle2, AlertCircle, ChevronDown, Building2, User, Mail, Phone, MessageSquare, Newspaper, Sparkles } from "lucide-react";

export default function AdvertiseWithUsPage() {
  const [formData, setFormData] = useState({
    submitterName: "",
    company: "",
    email: "",
    serviceOption: "Publish Company Article",
    phone: "",
    whatsapp: "",
    requirements: ""
  });

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!formData.submitterName.trim()) {
      setErrorMessage("Please enter your name.");
      return;
    }

    if (!formData.company.trim()) {
      setErrorMessage("Please enter your company name.");
      return;
    }

    if (!formData.email.trim() || !formData.email.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    if (!formData.requirements.trim()) {
      setErrorMessage("Please provide details about your brand or inquiry.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/advertise", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to submit advertising inquiry. Please try again.");
      }

      // Also persist to localStorage for instant local reactivity in the Admin Panel
      try {
        const now = new Date();
        const formattedDate = now.toLocaleDateString("en-US", { month: "short", day: "2-digit" }) + 
          ", " + now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

        const localLead = data.lead || {
          id: `lead-${Date.now()}`,
          date: formattedDate,
          submitterName: formData.submitterName.trim(),
          company: formData.company.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() ? (formData.phone.startsWith("P:") ? formData.phone : `P: ${formData.phone.trim()}`) : "P: 000 000 0000",
          whatsapp: formData.whatsapp.trim() ? (formData.whatsapp.startsWith("W:") ? formData.whatsapp : `W: ${formData.whatsapp.trim()}`) : "W: N/A",
          serviceOption: formData.serviceOption,
          requirements: formData.requirements.trim(),
          budget: "Standard",
          status: "New"
        };

        const existingRaw = localStorage.getItem("dj_advertise_leads");
        let existingList: any[] = [];
        if (existingRaw) {
          try { existingList = JSON.parse(existingRaw); } catch (e) {}
        }
        if (!Array.isArray(existingList)) existingList = [];
        existingList.unshift(localLead);
        localStorage.setItem("dj_advertise_leads", JSON.stringify(existingList));

        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("dj_advertise_change"));
        }
      } catch (storageErr) {
        console.warn("Local storage sync notice:", storageErr);
      }

      setSuccessMessage("Thank you for your inquiry! Our commercial advertising team has received your details and will contact you promptly.");
      setFormData({
        submitterName: "",
        company: "",
        email: "",
        serviceOption: "Publish Company Article",
        phone: "",
        whatsapp: "",
        requirements: ""
      });
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-slate-800 selection:bg-[#D31220] selection:text-white">
      {/* GLOBAL HEADER */}
      <Header />

      {/* TOP HERO IMAGE BANNER - MATCHING SCREENSHOT */}
      <div className="relative w-full h-64 sm:h-80 md:h-[380px] lg:h-[440px] overflow-hidden bg-slate-950">
        <img
          src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1920&q=80&fit=crop"
          alt="London BigBen Headquarters"
          className="w-full h-full object-cover object-center opacity-90 filter contrast-[1.05]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        
        {/* BRAND EMBLEM TITLE OVERLAY */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 select-none">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-[11px] font-mono font-bold uppercase tracking-widest mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#D31220]" />
            Commercial Solutions &amp; Partnerships
          </div>
          <h1 className="font-serif font-black text-3xl sm:text-5xl lg:text-6xl text-white tracking-tight uppercase drop-shadow-md">
            LONDON BIGBEN
          </h1>
          <div className="w-16 h-1 bg-[#D31220] mt-3"></div>
        </div>
      </div>

      {/* MAIN TWO-COLUMN CONTENT AREA */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          
          {/* LEFT COLUMN: ABOUT ADVERTISING & OUR SERVICES */}
          <div className="lg:col-span-5 space-y-8">
            <div>
              <h2 className="text-3xl sm:text-4xl font-black font-serif text-slate-900 tracking-tight">
                Advertise with Us
              </h2>
              <div className="w-12 h-1 bg-[#D31220] mt-3.5 mb-6"></div>
              
              <p className="text-[13.5px] sm:text-sm text-slate-600 leading-relaxed font-normal">
                The London BigBen reaches an influential global audience of corporate executives, investors, policy makers, and thought leaders. Position your brand alongside premium financial journalism and global reporting.
              </p>
            </div>

            {/* SERVICES SECTION */}
            <div className="pt-2">
              <h3 className="text-[11px] font-extrabold font-mono uppercase tracking-widest text-slate-900 mb-6 border-b border-slate-200/80 pb-2">
                OUR SERVICES
              </h3>

              <div className="space-y-6">
                {/* Service 1 */}
                <div className="group">
                  <h4 className="text-sm font-black text-slate-900 group-hover:text-[#D31220] transition-colors">
                    Publish Company Article
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed mt-1">
                    Feature your brand&apos;s growth, announcement, or milestone with our premium editorial formatting.
                  </p>
                </div>

                {/* Service 2 */}
                <div className="group">
                  <h4 className="text-sm font-black text-slate-900 group-hover:text-[#D31220] transition-colors">
                    Publish CEO Profile
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed mt-1">
                    Get an exclusive written interview profiling your CEO&apos;s vision, leadership, and company direction.
                  </p>
                </div>

                {/* Service 3 */}
                <div className="group">
                  <h4 className="text-sm font-black text-slate-900 group-hover:text-[#D31220] transition-colors">
                    Report News
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed mt-1">
                    Collaborate with our reporting team to share key press developments or exclusive industry insights.
                  </p>
                </div>

                {/* Service 4 */}
                <div className="group">
                  <h4 className="text-sm font-black text-slate-900 group-hover:text-[#D31220] transition-colors">
                    London BigBen Magazine
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed mt-1">
                    Reserve a premium print or digital full-page ad placement inside our quarterly business magazine.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: CLIENT INQUIRY LEAD FORM */}
          <div className="lg:col-span-7 lg:border-l lg:border-slate-200/80 lg:pl-12">
            <div className="mb-8">
              <h2 className="text-2xl sm:text-3xl font-black font-serif text-slate-900 tracking-tight">
                Client Inquiry Lead
              </h2>
              <p className="text-xs text-slate-500 mt-1.5 font-mono">
                Fill out the form below to connect with our advertising &amp; partnership team.
              </p>
            </div>

            {/* ALERT NOTIFICATIONS */}
            {successMessage && (
              <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-800 text-xs font-semibold animate-fade-in shadow-xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-xs font-semibold animate-fade-in shadow-xs">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* ROW 1: NAME & COMPANY */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-700 font-mono mb-1.5">
                    YOUR NAME <span className="text-[#D31220]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    value={formData.submitterName}
                    onChange={(e) => setFormData({ ...formData, submitterName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-800 focus:bg-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-700 font-mono mb-1.5">
                    COMPANY NAME <span className="text-[#D31220]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Company LLC"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-800 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              {/* ROW 2: EMAIL & INTERESTED OPTION */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-700 font-mono mb-1.5">
                    YOUR EMAIL <span className="text-[#D31220]">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="john.doe@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-800 focus:bg-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-700 font-mono mb-1.5">
                    INTERESTED OPTION <span className="text-[#D31220]">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={formData.serviceOption}
                      onChange={(e) => setFormData({ ...formData, serviceOption: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-800 focus:bg-white transition-colors cursor-pointer appearance-none pr-8"
                    >
                      <option value="Publish Company Article">Publish Company Article</option>
                      <option value="Publish CEO Profile">Publish CEO Profile</option>
                      <option value="Report News">Report News</option>
                      <option value="London BigBen Magazine">London BigBen Magazine</option>
                      <option value="Banner Ads">Banner Ads</option>
                      <option value="Sponsored Articles">Sponsored Articles</option>
                      <option value="Newsletter Takeover">Newsletter Takeover</option>
                      <option value="Brand Partnership">Brand Partnership</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* ROW 3: PHONE NUMBER & WHATSAPP NUMBER */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-700 font-mono mb-1.5">
                    PHONE NUMBER <span className="text-slate-400 font-normal font-sans">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="+1 (555) 000-0000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-800 focus:bg-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-700 font-mono mb-1.5">
                    WHATSAPP NUMBER <span className="text-slate-400 font-normal font-sans">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="+1 (555) 000-0000"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-800 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              {/* ROW 4: INQUIRY DETAILS / MESSAGE */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-700 font-mono mb-1.5">
                  TELL US ABOUT YOUR BRAND / INQUIRY DETAILS <span className="text-[#D31220]">*</span>
                </label>
                <textarea
                  required
                  rows={5}
                  placeholder="Please enter details of your advertising requirements, budget, or preferred dates..."
                  value={formData.requirements}
                  onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                  className="w-full px-3.5 py-3 bg-slate-50/50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-800 focus:bg-white transition-colors resize-y leading-relaxed"
                />
              </div>

              {/* SUBMIT BUTTON */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-8 py-3.5 bg-[#0F172A] hover:bg-[#D31220] text-white text-xs font-bold font-mono uppercase tracking-wider rounded-lg transition-all duration-200 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Submitting Inquiry...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Inquiry</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

        </div>
      </main>

      {/* GLOBAL FOOTER */}
      <Footer />
    </div>
  );
}
