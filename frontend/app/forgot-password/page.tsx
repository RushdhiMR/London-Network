"use client";

import Link from "next/link";
import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { KeyRound, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!email || !email.trim()) {
      setErrorMessage("Please enter your registered email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to process request. Please try again.");
      } else {
        setSuccessMessage(data.message || "If an account with that email exists, password reset instructions have been dispatched.");
      }
    } catch (err: any) {
      setErrorMessage("Failed to process request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-slate-900 selection:bg-red-100 selection:text-red-900">
      <Header />

      <main className="flex-1 bg-white py-12 lg:py-16 flex items-center justify-center">
        <div className="w-full max-w-[440px] mx-auto px-4 font-sans text-slate-900">
          
          {/* Logo & Corporate Title */}
          <div className="flex flex-col items-center mb-8 text-center">
            <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity mb-2 group">
              <img
                src="/logo.svg"
                alt="London BigBen Logo"
                className="w-9 h-9 object-contain"
              />
              <span className="text-2xl font-serif font-black tracking-tight text-slate-900 group-hover:text-[#BF1E2D] transition-colors">
                LONDON BIGBEN
              </span>
            </Link>

            <h1 className="text-xl font-bold text-slate-900">Reset your password</h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Enter your email address and we'll send you instructions to reset your passcode.
            </p>
          </div>

          {/* Success Banner */}
          {successMessage && (
            <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold p-4 rounded-xl text-center shadow-xs flex items-center justify-center gap-2">
              <span className="text-base">✓</span>
              <span>{successMessage}</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold p-4 rounded-xl text-center shadow-xs flex items-center justify-center gap-2">
              <span className="text-base">⚠</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form Fields */}
          <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
            {/* Fake hidden inputs to trap browser autofill heuristics */}
            <input type="text" name="fake_autofill_email" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" autoComplete="off" />
            <input type="password" name="fake_autofill_password" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" autoComplete="new-password" />

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                REGISTERED EMAIL ADDRESS
              </label>
              <input
                type="email"
                name="dj_forgot_email_no_autofill"
                autoComplete="off"
                placeholder="e.g. yourname@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#BF1E2D] focus:ring-1 focus:ring-red-100 transition-all bg-slate-50/50 focus:bg-white font-medium"
                required
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#0F172A] hover:bg-[#1E293B] active:scale-[0.99] text-white font-bold text-sm py-3.5 rounded-xl transition-all uppercase tracking-wider cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    SENDING INSTRUCTIONS...
                  </>
                ) : (
                  <>
                    <KeyRound size={15} />
                    <span>SEND RESET INSTRUCTIONS</span>
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <Link href="/login" className="text-xs text-slate-600 hover:text-slate-900 transition-colors font-medium inline-flex items-center gap-1">
              <ArrowLeft size={14} />
              <span>Back to <span className="text-[#BF1E2D] font-bold hover:underline">Sign in</span></span>
            </Link>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
