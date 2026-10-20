"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";

interface NewsletterBannerProps {
  email?: string;
  setEmail?: (val: string) => void;
  onSubmit?: (e: React.FormEvent) => void;
  subscribed?: boolean;
}

export default function NewsletterBanner({
  email: propEmail,
  setEmail: propSetEmail,
  onSubmit: propOnSubmit,
  subscribed: propSubscribed,
}: NewsletterBannerProps = {}) {
  const [internalEmail, setInternalEmail] = useState("");
  const [internalSubscribed, setInternalSubscribed] = useState(false);

  const email = propEmail !== undefined ? propEmail : internalEmail;
  const setEmail = propSetEmail || setInternalEmail;
  const subscribed = propSubscribed !== undefined ? propSubscribed : internalSubscribed;

  const handleSubmit = async (e: React.FormEvent) => {
    if (propOnSubmit) {
      propOnSubmit(e);
      return;
    }

    e.preventDefault();
    if (!email) return;

    try {
      await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch (e) {
      console.warn("Newsletter API request error:", e);
    }

    setInternalSubscribed(true);
    setTimeout(() => {
      setInternalSubscribed(false);
      setInternalEmail("");
    }, 4000);
  };

  return (
    <div className="w-full font-standard-sans max-w-[760px] mx-auto my-8 px-4">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-stretch gap-3">
        {/* Email input field with mail icon */}
        <div className="flex-1 flex items-center gap-3 px-4 py-3.5 bg-white border border-zinc-300 focus-within:border-zinc-500 transition-colors">
          <Mail className="w-5 h-5 text-zinc-400 flex-shrink-0" />
          <input
            type="email"
            required
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-transparent text-[14.5px] text-zinc-800 placeholder-zinc-400 focus:outline-none font-sans"
          />
        </div>

        {/* Submit button */}
        <button
          type="submit"
          className="bg-[#BF1E2D] hover:bg-red-800 text-white font-bold text-[14px] px-8 py-3.5 tracking-wider uppercase transition-colors rounded-none flex-shrink-0 cursor-pointer font-standard-sans"
        >
          SIGN UP NOW
        </button>
      </form>

      {/* Success alert message */}
      {subscribed && (
        <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-center text-[13px] font-bold">
          ✓ Subscribed successfully! Thank you for subscribing to London BigBen.
        </div>
      )}

      {/* Unsubscribe and terms text */}
      <p className="text-[12.5px] text-zinc-600 text-center leading-relaxed mt-4 font-normal font-sans">
        You can unsubscribe at any time. By signing up you are agreeing to our{" "}
        <Link href="#" className="underline text-[#BF1E2D] hover:text-red-800 font-medium">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="#" className="underline text-[#BF1E2D] hover:text-red-800 font-medium">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
