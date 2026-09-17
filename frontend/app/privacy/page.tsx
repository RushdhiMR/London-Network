"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ChevronDown, ChevronUp, Lock, Mail, MapPin, Phone } from "lucide-react";

interface TocItem {
  id: string;
  label: string;
}

const tocItems: TocItem[] = [
  { id: "introduction", label: "Introduction" },
  { id: "information-we-collect", label: "1. Information We Collect" },
  { id: "how-we-use-information", label: "2. How We Use Your Information" },
  { id: "cookies-and-tracking", label: "3. Cookies & Tracking Technologies" },
  { id: "newsletter-communications", label: "4. Newsletter Communications" },
  { id: "sharing-of-information", label: "5. Sharing of Information" },
  { id: "data-security", label: "6. Data Security" },
  { id: "data-retention", label: "7. Data Retention" },
  { id: "your-privacy-rights", label: "8. Your Privacy Rights" },
  { id: "childrens-privacy", label: "9. Children's Privacy" },
  { id: "third-party-websites", label: "10. Third-Party Websites" },
  { id: "international-data-transfers", label: "11. International Data Transfers" },
  { id: "changes-to-policy", label: "12. Changes to This Privacy Policy" },
  { id: "contact-us", label: "13. Contact Us" },
];

export default function PrivacyPolicyPage() {
  const [activeId, setActiveId] = useState<string>("introduction");
  const [mobileTocOpen, setMobileTocOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 160;

      for (let i = tocItems.length - 1; i >= 0; i--) {
        const section = document.getElementById(tocItems[i].id);
        if (section) {
          const top = section.offsetTop;
          if (scrollPosition >= top) {
            setActiveId(tocItems[i].id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -110;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
      setActiveId(id);
      setMobileTocOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans flex flex-col justify-between selection:bg-red-100 selection:text-[#BF1E2D]">
      <Header />

      <main className="flex-1 max-w-[1240px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        {/* TOP HEADER SECTION */}
        <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-8">
          <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.22em] text-[#BF1E2D] mb-3 inline-flex items-center gap-1.5">
            LEGAL DOCUMENT &bull; DATA PROTECTION
          </p>
          <h1 className="font-serif font-black text-3xl sm:text-5xl md:text-[52px] text-slate-900 tracking-tight leading-[1.1] mb-3">
            Privacy Policy
          </h1>
          <p className="text-[11px] sm:text-xs font-semibold tracking-wider text-slate-500 uppercase">
            LAST UPDATED: JUNE 30, 2024
          </p>
        </div>

        {/* TOP DIVIDER LINE */}
        <div className="w-full border-t-2 border-slate-900 mb-10 sm:mb-12" />

        {/* MOBILE TABLE OF CONTENTS COLLAPSIBLE ACCORDION */}
        <div className="lg:hidden mb-8 border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
          <button
            onClick={() => setMobileTocOpen(!mobileTocOpen)}
            className="w-full flex items-center justify-between px-4 py-3 bg-white text-left font-bold text-xs uppercase tracking-wider text-slate-900 border-b border-slate-200"
          >
            <span className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#BF1E2D]" />
              Privacy Policy Sections
            </span>
            {mobileTocOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </button>
          {mobileTocOpen && (
            <div className="p-3 bg-white space-y-1 max-h-72 overflow-y-auto">
              {tocItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`w-full text-left text-xs py-2 px-3 rounded transition-colors ${
                    activeId === item.id
                      ? "bg-red-50 text-[#BF1E2D] font-bold border-l-2 border-[#BF1E2D]"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* MAIN TWO-COLUMN CONTENT LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* LEFT COLUMN: STICKY TABLE OF CONTENTS */}
          <aside className="hidden lg:block lg:col-span-4 sticky top-28">
            <div className="bg-white border border-slate-200/90 rounded-lg p-5 shadow-xs">
              <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100">
                <Lock className="w-3.5 h-3.5 text-[#1e3a8a]" />
                <h2 className="text-[11.5px] font-extrabold uppercase tracking-wider text-slate-900">
                  PRIVACY POLICY SECTIONS
                </h2>
              </div>
              <nav className="space-y-1">
                {tocItems.map((item) => {
                  const isActive = activeId === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => scrollToSection(item.id)}
                      className={`w-full text-left text-[13px] py-1.5 px-3 rounded transition-all duration-150 block truncate ${
                        isActive
                          ? "bg-red-50/90 text-[#BF1E2D] font-bold border-l-2 border-[#BF1E2D] pl-2.5 shadow-2xs"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* RIGHT COLUMN: MAIN LEGAL DOCUMENT TEXT */}
          <article className="lg:col-span-8 space-y-10 text-slate-700 text-[14px] sm:text-[14.5px] leading-relaxed">
            
            {/* INTRODUCTION */}
            <section id="introduction" className="scroll-mt-28">
              <h2 className="font-serif font-bold text-2xl text-slate-900 mb-4 tracking-tight">
                Introduction
              </h2>
              <div className="space-y-4">
                <p>
                  <strong className="text-slate-900 font-semibold">London BigBen Network</strong> (&ldquo;London BigBen Network&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) respects your privacy and is committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website, use our services, subscribe to our newsletters, submit content, or otherwise interact with our Platform.
                </p>
                <p>
                  By using the London BigBen Network Platform, you agree to the practices described in this Privacy Policy and our <Link href="/terms" className="text-[#BF1E2D] hover:underline font-medium">Terms and Conditions</Link>.
                </p>
              </div>
            </section>

            {/* 1. INFORMATION WE COLLECT */}
            <section id="information-we-collect" className="scroll-mt-28 border-t border-slate-100 pt-8">
              <h2 className="font-serif font-bold text-xl sm:text-[22px] text-slate-900 mb-3.5 tracking-tight flex items-baseline gap-2">
                <span className="text-[#BF1E2D] font-serif font-black">1.</span>
                <span>Information We Collect</span>
              </h2>
              <div className="space-y-3">
                <p>
                  We may collect the following categories of information:
                </p>
                <ul className="space-y-2.5 text-slate-700 text-[13.5px] sm:text-[14px]">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-900 mt-2 shrink-0" />
                    <span>
                      <strong className="text-slate-900 font-semibold">Personal Information:</strong> Full name, email address, phone number (if provided), postal address (if provided), account information, and billing information (when applicable).
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-900 mt-2 shrink-0" />
                    <span>
                      <strong className="text-slate-900 font-semibold">Technical Information:</strong> IP address, browser type, device information, operating system, referring website, pages visited, date and time of access, and cookies.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-900 mt-2 shrink-0" />
                    <span>
                      <strong className="text-slate-900 font-semibold">Content You Submit:</strong> When you submit articles, comments, press releases, photographs, videos, or other materials, we collect the information necessary to process and publish your submission.
                    </span>
                  </li>
                </ul>
              </div>
            </section>

            {/* 2. HOW WE USE YOUR INFORMATION */}
            <section id="how-we-use-information" className="scroll-mt-28 border-t border-slate-100 pt-8">
              <h2 className="font-serif font-bold text-xl sm:text-[22px] text-slate-900 mb-3.5 tracking-tight flex items-baseline gap-2">
                <span className="text-[#BF1E2D] font-serif font-black">2.</span>
                <span>How We Use Your Information</span>
              </h2>
              <p>
                We use your information to operate and improve our Platform, publish submitted content, respond to inquiries, process subscriptions or purchases, send newsletters, personalize your experience, detect fraudulent activity, comply with legal obligations, and analyze user engagement.
              </p>
            </section>

            {/* 3. COOKIES & TRACKING TECHNOLOGIES */}
            <section id="cookies-and-tracking" className="scroll-mt-28 border-t border-slate-100 pt-8">
              <h2 className="font-serif font-bold text-xl sm:text-[22px] text-slate-900 mb-3.5 tracking-tight flex items-baseline gap-2">
                <span className="text-[#BF1E2D] font-serif font-black">3.</span>
                <span>Cookies and Tracking Technologies</span>
              </h2>
              <p>
                London BigBen Network uses cookies to remember your preferences, improve website functionality, measure traffic and user visitor behavior, and deliver relevant advertising. You may disable cookies through your browser settings; however, some features of the Platform may not function properly.
              </p>
            </section>

            {/* 4. NEWSLETTER COMMUNICATIONS */}
            <section id="newsletter-communications" className="scroll-mt-28 border-t border-slate-100 pt-8">
              <h2 className="font-serif font-bold text-xl sm:text-[22px] text-slate-900 mb-3.5 tracking-tight flex items-baseline gap-2">
                <span className="text-[#BF1E2D] font-serif font-black">4.</span>
                <span>Newsletter Communications</span>
              </h2>
              <p>
                If you subscribe to our newsletters, we may send you news updates, editorial highlights, press releases, and promotional announcements. You may unsubscribe at any time using the &ldquo;Unsubscribe&rdquo; link included in our emails.
              </p>
            </section>

            {/* 5. SHARING OF INFORMATION */}
            <section id="sharing-of-information" className="scroll-mt-28 border-t border-slate-100 pt-8">
              <h2 className="font-serif font-bold text-xl sm:text-[22px] text-slate-900 mb-3.5 tracking-tight flex items-baseline gap-2">
                <span className="text-[#BF1E2D] font-serif font-black">5.</span>
                <span>Sharing of Information</span>
              </h2>
              <p>
                We do not sell your personal information. We may share information with trusted service providers, payment processors, cloud hosting providers, analytics providers, email delivery platforms, and government authorities when required by law.
              </p>
            </section>

            {/* 6. DATA SECURITY */}
            <section id="data-security" className="scroll-mt-28 border-t border-slate-100 pt-8">
              <h2 className="font-serif font-bold text-xl sm:text-[22px] text-slate-900 mb-3.5 tracking-tight flex items-baseline gap-2">
                <span className="text-[#BF1E2D] font-serif font-black">6.</span>
                <span>Data Security</span>
              </h2>
              <p>
                We implement reasonable administrative, technical, and organizational safeguards designed to protect your personal information from unauthorized access, alteration, disclosure, or destruction. No method of internet transmission can be guaranteed to be completely secure.
              </p>
            </section>

            {/* 7. DATA RETENTION */}
            <section id="data-retention" className="scroll-mt-28 border-t border-slate-100 pt-8">
              <h2 className="font-serif font-bold text-xl sm:text-[22px] text-slate-900 mb-3.5 tracking-tight flex items-baseline gap-2">
                <span className="text-[#BF1E2D] font-serif font-black">7.</span>
                <span>Data Retention</span>
              </h2>
              <p>
                We retain personal information only for as long as necessary to provide our services, meet legal obligations, resolve disputes, and maintain business records. When no longer required, data is securely deleted or anonymized.
              </p>
            </section>

            {/* 8. YOUR PRIVACY RIGHTS */}
            <section id="your-privacy-rights" className="scroll-mt-28 border-t border-slate-100 pt-8">
              <h2 className="font-serif font-bold text-xl sm:text-[22px] text-slate-900 mb-3.5 tracking-tight flex items-baseline gap-2">
                <span className="text-[#BF1E2D] font-serif font-black">8.</span>
                <span>Your Privacy Rights</span>
              </h2>
              <p>
                Depending on your location, you may have the right to access your personal information, correct inaccurate information, request deletion of your data, restrict certain processing activities, withdraw consent, or request a copy of your data. Please contact us to exercise these rights.
              </p>
            </section>

            {/* 9. CHILDREN'S PRIVACY */}
            <section id="childrens-privacy" className="scroll-mt-28 border-t border-slate-100 pt-8">
              <h2 className="font-serif font-bold text-xl sm:text-[22px] text-slate-900 mb-3.5 tracking-tight flex items-baseline gap-2">
                <span className="text-[#BF1E2D] font-serif font-black">9.</span>
                <span>Children&apos;s Privacy</span>
              </h2>
              <p>
                London BigBen Network is not intended for children under the age of 16 (or 13 where applicable). We do not knowingly collect personal information from children. If we become aware that such information has been collected, we will take reasonable steps to delete it promptly.
              </p>
            </section>

            {/* 10. THIRD-PARTY WEBSITES */}
            <section id="third-party-websites" className="scroll-mt-28 border-t border-slate-100 pt-8">
              <h2 className="font-serif font-bold text-xl sm:text-[22px] text-slate-900 mb-3.5 tracking-tight flex items-baseline gap-2">
                <span className="text-[#BF1E2D] font-serif font-black">10.</span>
                <span>Third-Party Websites</span>
              </h2>
              <p>
                Our Platform may contain links to third-party websites. We are not responsible for the privacy practices, content, or security of external websites. We encourage users to review the privacy policies of those websites before providing personal information.
              </p>
            </section>

            {/* 11. INTERNATIONAL DATA TRANSFERS */}
            <section id="international-data-transfers" className="scroll-mt-28 border-t border-slate-100 pt-8">
              <h2 className="font-serif font-bold text-xl sm:text-[22px] text-slate-900 mb-3.5 tracking-tight flex items-baseline gap-2">
                <span className="text-[#BF1E2D] font-serif font-black">11.</span>
                <span>International Data Transfers</span>
              </h2>
              <p>
                If you access London BigBen Network from outside the United Kingdom, your information may be transferred to and processed in the United Kingdom or other countries. By using our Platform, you consent to such transfers in accordance with applicable law.
              </p>
            </section>

            {/* 12. CHANGES TO THIS PRIVACY POLICY */}
            <section id="changes-to-policy" className="scroll-mt-28 border-t border-slate-100 pt-8">
              <h2 className="font-serif font-bold text-xl sm:text-[22px] text-slate-900 mb-3.5 tracking-tight flex items-baseline gap-2">
                <span className="text-[#BF1E2D] font-serif font-black">12.</span>
                <span>Changes to This Privacy Policy</span>
              </h2>
              <p>
                We may update this Privacy Policy from time to time. The updated version will be posted on this page with a revised &ldquo;Last Updated&rdquo; date. Continued use of the Platform after changes constitutes acceptance of the revised policy.
              </p>
            </section>

            {/* 13. CONTACT US */}
            <section id="contact-us" className="scroll-mt-28 border-t border-slate-100 pt-8">
              <h2 className="font-serif font-bold text-xl sm:text-[22px] text-slate-900 mb-3.5 tracking-tight flex items-baseline gap-2">
                <span className="text-[#BF1E2D] font-serif font-black">13.</span>
                <span>Contact Us</span>
              </h2>
              <p className="mb-5">
                For privacy-related questions, data access requests, or inquiries regarding this Privacy Policy, please contact us:
              </p>

              {/* CONTACT CARD BOX MATCHING SCREENSHOT */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-lg p-6 sm:p-7 max-w-lg shadow-xs">
                <h3 className="font-serif font-bold text-lg text-slate-900 mb-3">
                  London BigBen Network
                </h3>

                <div className="space-y-2.5 text-xs sm:text-[13px] text-slate-600">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <span>
                      Canary Wharf, 25 Bank Street<br />
                      London, E14 5JP, United Kingdom
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <a
                      href="mailto:privacy@londonbigben.com"
                      className="text-slate-900 font-medium hover:text-[#BF1E2D] transition-colors"
                    >
                      privacy@londonbigben.com
                    </a>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>+44 20 7946 0192</span>
                  </div>
                </div>

                {/* LOGO IN CONTACT BOX */}
                <div className="mt-6 pt-5 border-t border-slate-200/80 flex items-center justify-center">
                  <Image
                    src="/header_logo.png"
                    alt="London BigBen Network"
                    width={180}
                    height={36}
                    className="h-7 w-auto object-contain"
                  />
                </div>
              </div>
            </section>

          </article>

        </div>
      </main>

      <Footer />
    </div>
  );
}
