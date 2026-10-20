"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Footer from "@/components/Footer";
import { Check, ChevronDown, CheckCircle2, X, ShieldCheck, Mail, Sparkles, Clock, AlertCircle, Calendar, RotateCcw } from "lucide-react";
import { dispatchPageDataReady } from "@/components/GlobalPageLoader";
import { useAuth, getTabSessionUser } from "@/lib/auth-context";

interface SelectedPlan {
  id: "digital" | "bundle";
  name: string;
  price: string;
  originalPrice: string;
  features: string[];
}

const ALL_COUNTRY_CODES = [
  { code: "GB", dial: "+44", name: "United Kingdom" },
  { code: "US", dial: "+1", name: "United States" },
  { code: "CA", dial: "+1", name: "Canada" },
  { code: "AU", dial: "+61", name: "Australia" },
  { code: "NZ", dial: "+64", name: "New Zealand" },
  { code: "IE", dial: "+353", name: "Ireland" },
  { code: "LK", dial: "+94", name: "Sri Lanka" },
  { code: "IN", dial: "+91", name: "India" },
  { code: "PK", dial: "+92", name: "Pakistan" },
  { code: "BD", dial: "+880", name: "Bangladesh" },
  { code: "AE", dial: "+971", name: "United Arab Emirates" },
  { code: "SA", dial: "+966", name: "Saudi Arabia" },
  { code: "QA", dial: "+974", name: "Qatar" },
  { code: "KW", dial: "+965", name: "Kuwait" },
  { code: "OM", dial: "+968", name: "Oman" },
  { code: "BH", dial: "+973", name: "Bahrain" },
  { code: "SG", dial: "+65", name: "Singapore" },
  { code: "MY", dial: "+60", name: "Malaysia" },
  { code: "ID", dial: "+62", name: "Indonesia" },
  { code: "PH", dial: "+63", name: "Philippines" },
  { code: "TH", dial: "+66", name: "Thailand" },
  { code: "VN", dial: "+84", name: "Vietnam" },
  { code: "JP", dial: "+81", name: "Japan" },
  { code: "KR", dial: "+82", name: "South Korea" },
  { code: "CN", dial: "+86", name: "China" },
  { code: "HK", dial: "+852", name: "Hong Kong" },
  { code: "TW", dial: "+886", name: "Taiwan" },
  { code: "DE", dial: "+49", name: "Germany" },
  { code: "FR", dial: "+33", name: "France" },
  { code: "IT", dial: "+39", name: "Italy" },
  { code: "ES", dial: "+34", name: "Spain" },
  { code: "NL", dial: "+31", name: "Netherlands" },
  { code: "CH", dial: "+41", name: "Switzerland" },
  { code: "SE", dial: "+46", name: "Sweden" },
  { code: "NO", dial: "+47", name: "Norway" },
  { code: "DK", dial: "+45", name: "Denmark" },
  { code: "FI", dial: "+358", name: "Finland" },
  { code: "BE", dial: "+32", name: "Belgium" },
  { code: "AT", dial: "+43", name: "Austria" },
  { code: "PT", dial: "+351", name: "Portugal" },
  { code: "GR", dial: "+30", name: "Greece" },
  { code: "PL", dial: "+48", name: "Poland" },
  { code: "CZ", dial: "+420", name: "Czech Republic" },
  { code: "HU", dial: "+36", name: "Hungary" },
  { code: "RO", dial: "+40", name: "Romania" },
  { code: "TR", dial: "+90", name: "Turkey" },
  { code: "RU", dial: "+7", name: "Russia" },
  { code: "UA", dial: "+380", name: "Ukraine" },
  { code: "ZA", dial: "+27", name: "South Africa" },
  { code: "NG", dial: "+234", name: "Nigeria" },
  { code: "KE", dial: "+254", name: "Kenya" },
  { code: "GH", dial: "+233", name: "Ghana" },
  { code: "EG", dial: "+20", name: "Egypt" },
  { code: "MA", dial: "+212", name: "Morocco" },
  { code: "BR", dial: "+55", name: "Brazil" },
  { code: "MX", dial: "+52", name: "Mexico" },
  { code: "AR", dial: "+54", name: "Argentina" },
  { code: "CO", dial: "+57", name: "Colombia" },
  { code: "CL", dial: "+56", name: "Chile" },
  { code: "IL", dial: "+972", name: "Israel" },
  { code: "NP", dial: "+977", name: "Nepal" }
];

export default function SubscribePage() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    dispatchPageDataReady();
  }, []);

  // Accordion state
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);

  const toggleAccordion = (id: string) => {
    setOpenAccordion((prev) => (prev === id ? null : id));
  };

  // Subscription & Countdown states
  const [activeSubscription, setActiveSubscription] = useState<any>(null);
  const [isTrialEligible, setIsTrialEligible] = useState<boolean>(true);
  const [eligibilityError, setEligibilityError] = useState<string | null>(null);
  const [isRenewalMode, setIsRenewalMode] = useState<boolean>(false);
  const [statusLoading, setStatusLoading] = useState<boolean>(false);

  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: false });

  // Checkout modal state
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SelectedPlan | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [countryDial, setCountryDial] = useState("+44");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subscribeSuccess, setSubscribeSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Pre-fill user details if logged in
  useEffect(() => {
    if (user?.email && !email) {
      setEmail(user.email);
    }
    if (user?.name && !name) {
      setName(user.name);
    }
  }, [user]);

  // Fetch subscription status from database based on user email
  const fetchSubscriptionStatus = async (userEmail?: string) => {
    const targetEmail = userEmail || user?.email;
    if (!targetEmail || !targetEmail.includes("@")) return;

    setStatusLoading(true);
    try {
      const res = await fetch(`/api/subscriptions/status?email=${encodeURIComponent(targetEmail.trim())}`);
      const data = await res.json();
      if (data.success && data.subscription) {
        setActiveSubscription(data.subscription);
        setIsTrialEligible(data.isEligibleForTrial ?? false);
      } else {
        setActiveSubscription(null);
        setIsTrialEligible(data.isEligibleForTrial ?? true);
      }
    } catch (err) {
      console.warn("Subscription status sync notice:", err);
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    const currentUser = user || getTabSessionUser();
    if (currentUser?.email) {
      fetchSubscriptionStatus(currentUser.email);
    }
  }, [user?.email]);

  // One-Year Countdown Timer: calculated from stored database trialExpiryDate
  useEffect(() => {
    if (!activeSubscription?.trialExpiryDate) return;

    const updateTimer = () => {
      const expTime = new Date(activeSubscription.trialExpiryDate).getTime();
      const now = Date.now();
      const diff = expTime - now;

      if (diff <= 0 || activeSubscription.status === "Expired") {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setTimeLeft({ days, hours, minutes, seconds, isExpired: false });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeSubscription]);

  const isPlanSubscribed = (planId: "digital" | "bundle") => {
    if (!activeSubscription) return false;
    const isExpired = timeLeft.isExpired || activeSubscription.status === "Expired";
    if (isExpired) return false;
    const isActive = activeSubscription.status === "Free Trial" || activeSubscription.status === "Active Paid";
    if (!isActive) return false;

    const currentPlan = (activeSubscription.plan || "").toLowerCase();
    const currentPlanName = (activeSubscription.planName || "").toLowerCase();
    const isBundle = currentPlan === "bundle" || currentPlanName.includes("bundle");

    if (planId === "bundle") {
      return isBundle;
    }
    if (planId === "digital") {
      return isBundle || currentPlan === "digital" || currentPlanName.includes("digital");
    }
    return false;
  };

  const handleOpenCheckout = (planId: "digital" | "bundle", renewal = false) => {
    if (!renewal && isPlanSubscribed(planId)) {
      setToastMessage(`✓ You are already subscribed to ${planId === "bundle" ? "London BigBen Digital Bundle" : "London BigBen Digital"}.`);
      return;
    }
    const currentUser = user || getTabSessionUser();
    if (!currentUser) {
      router.push(`/login?redirect=${encodeURIComponent(`/subscribe?plan=${planId}`)}`);
      return;
    }
    setIsRenewalMode(renewal);
    setEligibilityError(null);
    if (planId === "digital") {
      setSelectedPlan({
        id: "digital",
        name: "London BigBen Digital",
        price: "$3 USD/Month",
        originalPrice: "$9.99 USD/Month",
        features: [
          "Unlimited access on London BigBen website and mobile apps",
          "Daily puzzles and crosswords",
          "Audio versions of London BigBen articles"
        ]
      });
    } else {
      setSelectedPlan({
        id: "bundle",
        name: "London BigBen Digital Bundle",
        price: "$5 USD/Month",
        originalPrice: "$11.99 USD/Month",
        features: [
          "Includes London BigBen Digital Subscription",
          "Full premium access to all digital editions",
          "Breaking news alerts and mobile access",
          "Live events with journalists and guest columnists",
          "Personal finance advice, market trends, and reporting"
        ]
      });
    }
    setSubscribeSuccess(false);
    setCheckoutModalOpen(true);
  };

  // If authenticated user returned from login with a plan pre-selected, auto-open checkout
  useEffect(() => {
    if (typeof window !== "undefined") {
      const currentUser = user || getTabSessionUser();
      if (currentUser) {
        const params = new URLSearchParams(window.location.search);
        const planParam = params.get("plan");
        if (planParam === "digital" || planParam === "bundle") {
          if (!isPlanSubscribed(planParam)) {
            handleOpenCheckout(planParam);
          }
          window.history.replaceState({}, "", "/subscribe");
        }
      }
    }
  }, [user, activeSubscription]);

  const handleSubscribeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) return;

    setIsSubmitting(true);
    setEligibilityError(null);

    try {
      if (isRenewalMode) {
        // Renewal Flow: registers renewal request as Payment Pending
        const res = await fetch("/api/subscriptions/renew", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            phone: phone ? `${countryDial} ${phone.trim()}` : undefined,
            plan: selectedPlan?.id || "digital"
          })
        });
        const data = await res.json();
        if (data.success && data.subscription) {
          setActiveSubscription(data.subscription);
          setSubscribeSuccess(true);
          setSuccessMessage(data.message || `Renewal request for ${selectedPlan?.name} registered as Payment Pending.`);
          setToastMessage(`✓ ${data.message || "Renewal registered as Payment Pending."}`);
          // Navigate directly to admin dashboard subscription page
          router.push("/admin?tab=subscriptions");
        } else {
          setEligibilityError(data.error || "Failed to submit renewal request.");
        }
      } else {
        // 1-Year Free Access Activation
        const res = await fetch("/api/subscriptions/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            name: name || undefined,
            phone: phone ? `${countryDial} ${phone.trim()}` : undefined,
            plan: selectedPlan?.id || "digital"
          })
        });
        const data = await res.json();

        if (data.success && data.subscription) {
          setActiveSubscription(data.subscription);
          setIsTrialEligible(false);
          setSubscribeSuccess(true);
          const msg = `Enjoy your first year free! Your subscription to ${selectedPlan?.name || "London BigBen"} is active.`;
          setSuccessMessage(msg);
          setToastMessage(`✓ ${msg}`);
          // Navigate directly to admin dashboard subscription page
          router.push("/admin?tab=subscriptions");
        } else {
          setEligibilityError(data.error || "Trial already claimed or ineligible for free trial.");
        }
      }
    } catch (err: any) {
      setEligibilityError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }

    setTimeout(() => {
      setToastMessage(null);
    }, 6000);
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] font-sans text-gray-900 flex flex-col justify-between">
      {/* FLOATING SUCCESS TOAST */}
      {toastMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-xs sm:text-sm font-semibold py-3 px-6 rounded-full border border-zinc-700 shadow-2xl flex items-center gap-3 animate-fade-in z-50">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <main className="flex-1 w-full">
        {/* BRAND MASTHEAD HEADER */}
        <section className="bg-white border-b border-gray-200/80 py-6 sm:py-8 text-center">
          <div className="max-w-4xl mx-auto px-4">
            <Link href="/" className="inline-block transition-transform hover:opacity-95" aria-label="London BigBen">
              <Image
                src="/header_logo.png"
                alt="London BigBen Network"
                width={260}
                height={48}
                className="h-9 sm:h-11 md:h-12 w-auto object-contain mx-auto"
                priority
              />
            </Link>
          </div>
        </section>

        {/* HERO PROMOTIONAL TITLE */}
        <section className="pt-8 sm:pt-12 pb-6 sm:pb-8 px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <h1 className="font-serif text-2xl sm:text-3xl md:text-[38px] font-bold text-gray-900 tracking-tight leading-tight mb-2 sm:mb-3">
              Special Offer:{" "}
              <span className="line-through text-gray-400 font-normal decoration-gray-400 mr-1.5 sm:mr-2">
                $9.99 USD
              </span>{" "}
              <span className="text-gray-900">$3 USD Per Month</span>
            </h1>
            <p className="text-gray-600 text-sm sm:text-base md:text-[17px] font-normal mb-3">
              Choose your London BigBen Subscription
            </p>
            {/* Promo Banner: Enjoy your first year free */}
            <div className="inline-flex items-center gap-2 bg-emerald-50/90 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-semibold px-4 py-1.5 rounded-full shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
              <span>Enjoy your first year free — 12 months at $0</span>
            </div>
          </div>
        </section>

        {/* ACTIVE SUBSCRIPTION / COUNTDOWN BANNER */}
        {activeSubscription && (
          <section className="max-w-[960px] mx-auto px-4 sm:px-6 pt-2 pb-6">
            {!timeLeft.isExpired && activeSubscription.status === "Free Trial" ? (
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-xs">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div>
                    <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      <span>1-Year Free Access Active</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-serif font-bold text-slate-900 tracking-tight">
                      {activeSubscription.planName}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        Expires: {new Date(activeSubscription.trialExpiryDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </p>
                  </div>

                  {/* LIVE 1-YEAR COUNTDOWN TILES */}
                  <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                    <div className="bg-slate-50 border border-slate-200/90 rounded-xl px-3 sm:px-3.5 py-2 text-center min-w-[60px] sm:min-w-[68px]">
                      <div className="font-mono text-xl sm:text-2xl font-extrabold text-slate-900 leading-none">
                        {timeLeft.days}
                      </div>
                      <div className="text-[9.5px] uppercase tracking-wider font-semibold text-slate-500 mt-1">
                        Days
                      </div>
                    </div>
                    <span className="font-mono text-slate-300 font-bold text-lg">:</span>
                    <div className="bg-slate-50 border border-slate-200/90 rounded-xl px-3 sm:px-3.5 py-2 text-center min-w-[60px] sm:min-w-[68px]">
                      <div className="font-mono text-xl sm:text-2xl font-extrabold text-slate-900 leading-none">
                        {String(timeLeft.hours).padStart(2, "0")}
                      </div>
                      <div className="text-[9.5px] uppercase tracking-wider font-semibold text-slate-500 mt-1">
                        Hours
                      </div>
                    </div>
                    <span className="font-mono text-slate-300 font-bold text-lg">:</span>
                    <div className="bg-slate-50 border border-slate-200/90 rounded-xl px-3 sm:px-3.5 py-2 text-center min-w-[60px] sm:min-w-[68px]">
                      <div className="font-mono text-xl sm:text-2xl font-extrabold text-slate-900 leading-none">
                        {String(timeLeft.minutes).padStart(2, "0")}
                      </div>
                      <div className="text-[9.5px] uppercase tracking-wider font-semibold text-slate-500 mt-1">
                        Mins
                      </div>
                    </div>
                    <span className="font-mono text-slate-300 font-bold text-lg">:</span>
                    <div className="bg-slate-50 border border-slate-200/90 rounded-xl px-3 sm:px-3.5 py-2 text-center min-w-[60px] sm:min-w-[68px]">
                      <div className="font-mono text-xl sm:text-2xl font-extrabold text-slate-900 leading-none">
                        {String(timeLeft.seconds).padStart(2, "0")}
                      </div>
                      <div className="text-[9.5px] uppercase tracking-wider font-semibold text-slate-500 mt-1">
                        Secs
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Remaining time calculated continuously from your stored activation records.
                  </span>
                  <span className="font-medium text-slate-700">Price: $0.00 during free trial</span>
                </div>
              </div>
            ) : (timeLeft.isExpired || activeSubscription.status === "Expired") ? (
              <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-6 sm:p-7 shadow-sm">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-lg text-rose-950">
                        Your free year has ended. Subscribe to continue.
                      </h3>
                      <p className="text-xs sm:text-sm text-rose-800 mt-0.5 leading-relaxed">
                        Your 12-month complimentary period for <strong>{activeSubscription.planName}</strong> has concluded. Select a plan below to renew uninterrupted access.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenCheckout(activeSubscription.plan === "bundle" ? "bundle" : "digital", true)}
                    className="w-full md:w-auto px-5 py-2.5 bg-[#BF1E2D] hover:bg-[#a51825] text-white text-xs sm:text-sm font-bold rounded-lg shadow-sm transition-all whitespace-nowrap cursor-pointer shrink-0"
                  >
                    Renew Subscription
                  </button>
                </div>
              </div>
            ) : activeSubscription.status === "Payment Pending" ? (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 shadow-sm flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <h4 className="font-bold text-sm text-amber-950">
                      Renewal Status: Payment Pending
                    </h4>
                    <p className="text-xs text-amber-800">
                      Your renewal request for {activeSubscription.planName} has been recorded and will activate upon payment gateway confirmation.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm text-emerald-950">Active Paid Subscription</h4>
                  <p className="text-xs text-emerald-800">Your {activeSubscription.planName} is active and paid.</p>
                </div>
              </div>
            )}
          </section>
        )}

        {/* SUBSCRIPTION PRICING CARDS */}
        <section className="max-w-[960px] mx-auto px-4 sm:px-6 pb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-stretch">
            
            {/* CARD 1: London BigBen Digital Bundle */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all p-6 sm:p-8 flex flex-col justify-between">
              <div>
                {/* Card Title */}
                <h2 className="text-center font-serif font-bold text-2xl text-slate-900 mb-2 tracking-tight">
                  London BigBen Digital Bundle
                </h2>

                {/* 1st Year Free Promo Badge */}
                <div className="text-center mb-5">
                  <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-3 py-1 rounded-full">
                    Enjoy your first year free
                  </span>
                </div>

                {/* Price Display */}
                <div className="text-center my-4 pb-2">
                  <div className="text-xs font-semibold text-slate-400 line-through mb-1">
                    $11.99 USD / Month
                  </div>
                  <div className="flex items-baseline justify-center gap-1.5">
                    <span className="text-4xl sm:text-5xl font-extrabold font-serif text-slate-900 tracking-tight">
                      $5
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-slate-600">
                      USD / Month
                    </span>
                  </div>
                  <div className="text-xs font-bold text-emerald-700 mt-2">
                    $0 Today — Free for 12 Months
                  </div>
                </div>

                {/* CTA Button */}
                {isPlanSubscribed("bundle") ? (
                  <button
                    type="button"
                    disabled
                    className="w-full py-3.5 px-4 bg-emerald-600 text-white font-bold text-sm tracking-wide rounded-lg shadow-xs cursor-default flex items-center justify-center gap-2 text-center"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-white" />
                    <span>Subscribed</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleOpenCheckout("bundle", activeSubscription?.status === "Expired" || timeLeft.isExpired)}
                    className="w-full py-3.5 px-4 bg-[#BF1E2D] hover:bg-[#a51825] active:bg-[#8e1420] text-white font-bold text-sm tracking-wide rounded-lg transition-colors shadow-xs cursor-pointer text-center"
                  >
                    {(timeLeft.isExpired || activeSubscription?.status === "Expired")
                      ? "Renew for $5 USD/Month"
                      : "Subscribe Now"}
                  </button>
                )}

                {/* Cancel anytime note */}
                <p className="text-center text-xs text-slate-500 mt-2.5 mb-6">
                  You can cancel anytime.
                </p>

                {/* Horizontal Divider */}
                <div className="border-t border-slate-100 my-6" />

                {/* Section Header */}
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-3.5">
                  Includes a London BigBen Digital Subscription:
                </h3>

                {/* Base Feature Bullet Points */}
                <ul className="space-y-3 text-[13px] text-slate-700 leading-normal mb-4">
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#BF1E2D] shrink-0 mt-0.5" strokeWidth={2.5} />
                    <span>Unlimited access on London BigBen site & apps</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#BF1E2D] shrink-0 mt-0.5" strokeWidth={2.5} />
                    <span>Daily puzzles and crosswords</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#BF1E2D] shrink-0 mt-0.5" strokeWidth={2.5} />
                    <span>Audio versions of London BigBen articles</span>
                  </li>
                </ul>

                {/* Plus Subhead */}
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center my-3">
                  — Plus —
                </div>

                {/* Plus Feature Bullet Points */}
                <ul className="space-y-3 text-[13px] text-slate-700 leading-normal">
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#BF1E2D] shrink-0 mt-0.5" strokeWidth={2.5} />
                    <span>Full premium access to all London BigBen digital editions</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#BF1E2D] shrink-0 mt-0.5" strokeWidth={2.5} />
                    <span>London BigBen mobile apps and breaking alerts</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#BF1E2D] shrink-0 mt-0.5" strokeWidth={2.5} />
                    <span>Access all features with a single unified account</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#BF1E2D] shrink-0 mt-0.5" strokeWidth={2.5} />
                    <span>Live events with journalists and guest columnists</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#BF1E2D] shrink-0 mt-0.5" strokeWidth={2.5} />
                    <span>Personal finance advice, market trends, and reporting</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* CARD 2: London BigBen Digital */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all p-6 sm:p-8 flex flex-col justify-between">
              <div>
                {/* Card Title */}
                <h2 className="text-center font-serif font-bold text-2xl text-slate-900 mb-2 tracking-tight">
                  London BigBen Digital
                </h2>

                {/* 1st Year Free Promo Badge */}
                <div className="text-center mb-5">
                  <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-3 py-1 rounded-full">
                    Enjoy your first year free
                  </span>
                </div>

                {/* Price Display */}
                <div className="text-center my-4 pb-2">
                  <div className="text-xs font-semibold text-slate-400 line-through mb-1">
                    $9.99 USD / Month
                  </div>
                  <div className="flex items-baseline justify-center gap-1.5">
                    <span className="text-4xl sm:text-5xl font-extrabold font-serif text-slate-900 tracking-tight">
                      $3
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-slate-600">
                      USD / Month
                    </span>
                  </div>
                  <div className="text-xs font-bold text-emerald-700 mt-2">
                    $0 Today — Free for 12 Months
                  </div>
                </div>

                {/* CTA Button */}
                {isPlanSubscribed("digital") ? (
                  <button
                    type="button"
                    disabled
                    className="w-full py-3.5 px-4 bg-emerald-600 text-white font-bold text-sm tracking-wide rounded-lg shadow-xs cursor-default flex items-center justify-center gap-2 text-center"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-white" />
                    <span>Subscribed</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleOpenCheckout("digital", activeSubscription?.status === "Expired" || timeLeft.isExpired)}
                    className="w-full py-3.5 px-4 bg-[#BF1E2D] hover:bg-[#a51825] active:bg-[#8e1420] text-white font-bold text-sm tracking-wide rounded-lg transition-colors shadow-xs cursor-pointer text-center"
                  >
                    {(timeLeft.isExpired || activeSubscription?.status === "Expired")
                      ? "Renew for $3 USD/Month"
                      : "Subscribe Now"}
                  </button>
                )}

                {/* Cancel anytime note */}
                <p className="text-center text-xs text-slate-500 mt-2.5 mb-6">
                  You can cancel anytime.
                </p>

                {/* Horizontal Divider */}
                <div className="border-t border-slate-100 my-6" />

                {/* Section Header */}
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-3.5">
                  What you&apos;ll enjoy:
                </h3>

                {/* Feature Bullet Points */}
                <ul className="space-y-3 text-[13px] text-slate-700 leading-normal">
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#BF1E2D] shrink-0 mt-0.5" strokeWidth={2.5} />
                    <span>Unlimited access on London BigBen website and mobile apps</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#BF1E2D] shrink-0 mt-0.5" strokeWidth={2.5} />
                    <span>Daily puzzles and crosswords</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#BF1E2D] shrink-0 mt-0.5" strokeWidth={2.5} />
                    <span>Audio versions of London BigBen articles</span>
                  </li>
                </ul>
              </div>
            </div>

          </div>
        </section>

        {/* ACCORDION SECTION */}
        <section className="max-w-[960px] mx-auto px-4 sm:px-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200/90 shadow-2xs divide-y divide-gray-200/90 overflow-hidden">
            
            {/* Accordion 1: More Subscription Options */}
            <div>
              <button
                type="button"
                onClick={() => toggleAccordion("options")}
                className="w-full px-5 sm:px-6 py-4 flex items-center justify-between text-left font-bold text-sm sm:text-[15px] text-gray-900 hover:bg-gray-50/70 transition-colors"
                aria-expanded={openAccordion === "options"}
              >
                <span>More Subscription Options</span>
                <ChevronDown
                  className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
                    openAccordion === "options" ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openAccordion === "options" && (
                <div className="px-5 sm:px-6 py-4 bg-gray-50/40 text-xs sm:text-sm text-gray-600 space-y-3 leading-relaxed border-t border-gray-100">
                  <p>
                    <strong className="text-gray-900">Student & Academic Access:</strong> We offer 50% reduced pricing for verified students and university faculty. Contact our education desk with an accredited email.
                  </p>
                  <p>
                    <strong className="text-gray-900">Corporate & Group Subscriptions:</strong> Provide your entire newsroom, financial desk, or legal firm with unified access and dedicated administrative invoicing.
                  </p>
                  <p>
                    <strong className="text-gray-900">Gift Subscriptions:</strong> Share unrestricted 1-year London BigBen digital access with colleagues, friends, or family members.
                  </p>
                </div>
              )}
            </div>

            {/* Accordion 2: Frequently Asked Questions */}
            <div>
              <button
                type="button"
                onClick={() => toggleAccordion("faq")}
                className="w-full px-5 sm:px-6 py-4 flex items-center justify-between text-left font-bold text-sm sm:text-[15px] text-gray-900 hover:bg-gray-50/70 transition-colors"
                aria-expanded={openAccordion === "faq"}
              >
                <span>Frequently Asked Questions</span>
                <ChevronDown
                  className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
                    openAccordion === "faq" ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openAccordion === "faq" && (
                <div className="px-5 sm:px-6 py-4 bg-gray-50/40 text-xs sm:text-sm text-gray-600 space-y-3 leading-relaxed border-t border-gray-100">
                  <p>
                    <strong className="text-gray-900">How does the 1-year free trial work?</strong><br />
                    Eligible readers enjoy 12 full months of access with $0 charged. You can cancel anytime before your renewal date without any cancellation fees.
                  </p>
                  <p>
                    <strong className="text-gray-900">When does my billing cycle begin?</strong><br />
                    Your promotional free subscription begins immediately upon activation. Standard monthly billing will only commence after the conclusion of your 12-month free period.
                  </p>
                  <p>
                    <strong className="text-gray-900">Can I cancel anytime?</strong><br />
                    Yes. You can cancel your subscription at any time without fees.
                  </p>
                  <p>
                    <strong className="text-gray-900">What devices and platforms are supported?</strong><br />
                    Your London BigBen account gives you seamless access on modern web browsers, tablets, iOS, and Android mobile devices with synchronized reading lists.
                  </p>
                </div>
              )}
            </div>

            {/* Accordion 3: Terms & Conditions */}
            <div>
              <button
                type="button"
                onClick={() => toggleAccordion("terms")}
                className="w-full px-5 sm:px-6 py-4 flex items-center justify-between text-left font-bold text-sm sm:text-[15px] text-gray-900 hover:bg-gray-50/70 transition-colors"
                aria-expanded={openAccordion === "terms"}
              >
                <span>Terms & Conditions</span>
                <ChevronDown
                  className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
                    openAccordion === "terms" ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openAccordion === "terms" && (
                <div className="px-5 sm:px-6 py-4 bg-gray-50/40 text-xs sm:text-sm text-gray-600 space-y-3 leading-relaxed border-t border-gray-100">
                  <p>
                    Introductory promotional rates include 12 consecutive months of complimentary access ($0/month), followed by standard rates of $3 USD/Month for London BigBen Digital and $5 USD/Month for London BigBen Digital Bundle.
                  </p>
                  <p>
                    Unless cancelled prior to the conclusion of the 12-month period, subscriptions renew at standard non-promotional monthly rates. Subscribers are notified via email prior to rate adjustments.
                  </p>
                  <p>
                    Review our complete{" "}
                    <Link href="/terms" className="text-[#BF1E2D] underline font-medium">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="text-[#BF1E2D] underline font-medium">
                      Privacy Policy
                    </Link>{" "}
                    for full contractual details.
                  </p>
                </div>
              )}
            </div>

          </div>
        </section>

        {/* DISCLAIMER / POLICY NOTE */}
        <section className="max-w-[960px] mx-auto px-4 sm:px-6 pb-12 sm:pb-16 text-center">
          <p className="text-xs sm:text-[13px] text-gray-500 leading-relaxed">
            We&apos;ll let you know in advance of any price changes. Learn more about our{" "}
            <Link href="/terms" className="text-[#0077B6] hover:underline font-medium">
              cancellation and renewal policies
            </Link>
            .
          </p>
        </section>
      </main>

      {/* CHECKOUT & RENEWAL MODAL */}
      {checkoutModalOpen && selectedPlan && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setCheckoutModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
        >
          <div className="bg-[#FCFAF7] rounded-lg shadow-2xl max-w-[420px] w-full border border-gray-200/80 p-6 sm:p-7 relative overflow-hidden font-sans">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setCheckoutModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1 rounded-full hover:bg-gray-200/50 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            {subscribeSuccess ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Check size={26} strokeWidth={2.5} />
                </div>
                <h4 className="font-serif font-bold text-xl text-gray-900 mb-1.5">
                  {isRenewalMode ? "Renewal Request Recorded" : "Subscription Confirmed!"}
                </h4>
                <p className="text-xs text-gray-600 mb-5 leading-relaxed">
                  {successMessage || (
                    <>Your 1-year free subscription to <strong>{selectedPlan.name}</strong> is active for <strong>{email}</strong>.</>
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setCheckoutModalOpen(false);
                    if (email) fetchSubscriptionStatus(email);
                  }}
                  className="w-full py-3 bg-[#2C3345] hover:bg-[#1E2433] text-white font-bold text-xs uppercase tracking-wider rounded transition-colors shadow-xs cursor-pointer"
                >
                  View Active Subscription
                </button>
              </div>
            ) : (
              <div>
                {/* Top Category / Plan Pill */}
                <div className="mb-2">
                  <span className="text-[10px] font-bold text-[#E05638] bg-[#FDF0EC] border border-[#FADCD5] px-2.5 py-0.5 rounded uppercase tracking-wider inline-block">
                    {isRenewalMode ? "RENEWAL" : "1-YEAR FREE"} • {selectedPlan.name.toUpperCase()}
                  </span>
                </div>

                {/* Serif Title */}
                <h3 className="font-serif text-2xl sm:text-[26px] font-bold text-gray-900 leading-tight mb-1.5 tracking-tight">
                  Request Subscription
                </h3>

                {/* Subtitle */}
                <p className="text-xs text-gray-500 leading-relaxed mb-5">
                  {isRenewalMode
                    ? `Renew your subscription to ${selectedPlan.name} for ${selectedPlan.price}. Payment pending confirmation.`
                    : `Enjoy 12 months free access to ${selectedPlan.name}. Then ${selectedPlan.price} after 12 months. No charge today.`}
                </p>

                {/* Error Banner */}
                {eligibilityError && (
                  <div className="p-2.5 mb-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                    <span>{eligibilityError}</span>
                  </div>
                )}

                {/* Form Fields */}
                <form onSubmit={handleSubscribeSubmit} className="space-y-3.5">
                  {/* Full Name */}
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Full Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded focus:border-gray-900 focus:outline-none transition-all placeholder:text-gray-300"
                    />
                  </div>

                  {/* Email Address */}
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setEligibilityError(null);
                      }}
                      placeholder="you@domain.com"
                      required
                      className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded focus:border-gray-900 focus:outline-none transition-all placeholder:text-gray-300"
                    />
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                      PHONE NUMBER (OPTIONAL)
                    </label>
                    <div className="flex rounded border border-gray-200 bg-white overflow-hidden focus-within:border-gray-900 transition-all">
                      <div className="relative bg-gray-50/90 border-r border-gray-200 shrink-0 flex items-center">
                        <select
                          value={countryDial}
                          onChange={(e) => setCountryDial(e.target.value)}
                          className="appearance-none bg-transparent pl-2.5 pr-6 py-2 text-xs font-semibold text-gray-800 cursor-pointer focus:outline-none"
                          title="Select Country Dial Code"
                        >
                          {ALL_COUNTRY_CODES.map((c, idx) => (
                            <option key={`${c.code}-${c.dial}-${idx}`} value={c.dial}>
                              {c.code} {c.dial} ({c.name})
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-1.5 pointer-events-none" />
                      </div>
                      <input
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={phone}
                        onChange={(e) => {
                          const digitsOnly = e.target.value.replace(/\D/g, "");
                          setPhone(digitsOnly);
                        }}
                        onKeyDown={(e) => {
                          const allowedControls = [
                            "Backspace",
                            "Delete",
                            "ArrowLeft",
                            "ArrowRight",
                            "ArrowUp",
                            "ArrowDown",
                            "Tab",
                            "Enter",
                            "Home",
                            "End"
                          ];
                          if (allowedControls.includes(e.key) || e.ctrlKey || e.metaKey) {
                            return;
                          }
                          // Block any non-digit character
                          if (!/^\d$/.test(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        onPaste={(e) => {
                          e.preventDefault();
                          const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
                          setPhone((prev) => (prev + pasted).slice(0, 15));
                        }}
                        placeholder="7123 456789"
                        className="w-full px-3 py-2 text-sm bg-transparent outline-none placeholder:text-gray-300 font-mono"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3.5 px-4 bg-[#2C3345] hover:bg-[#1E2433] active:bg-[#141824] disabled:bg-gray-400 text-white font-bold text-xs uppercase tracking-widest rounded transition-colors shadow-xs cursor-pointer text-center"
                    >
                      {isSubmitting
                        ? "SUBMITTING..."
                        : isRenewalMode
                        ? "SUBMIT RENEWAL REQUEST"
                        : "REQUEST SUBSCRIPTION"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
