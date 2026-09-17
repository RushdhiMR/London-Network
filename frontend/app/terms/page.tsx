"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ChevronDown, ChevronUp, FileText, Mail, MapPin, Phone } from "lucide-react";

interface TocItem {
  id: string;
  label: string;
}

const tocItems: TocItem[] = [
  { id: "introduction", label: "Introduction" },
  { id: "eligibility", label: "1. Eligibility" },
  { id: "services", label: "2. Our Services" },
  { id: "accounts", label: "3. User Accounts" },
  { id: "user-content", label: "4. User Content" },
  { id: "editorial-independence", label: "5. Editorial Independence" },
  { id: "intellectual-property", label: "6. Intellectual Property" },
  { id: "advertising", label: "7. Sponsored Content & Advertising" },
  { id: "third-party-links", label: "8. Third-Party Links" },
  { id: "copyright", label: "9. Copyright Policy" },
  { id: "acceptable-use", label: "10. Acceptable Use" },
  { id: "disclaimer", label: "11. Disclaimer" },
  { id: "liability", label: "12. Limitation of Liability" },
  { id: "indemnification", label: "13. Indemnification" },
  { id: "privacy", label: "14. Privacy" },
  { id: "changes-to-services", label: "15. Changes to Services" },
  { id: "governing-law", label: "16. Governing Law" },
  { id: "contact-information", label: "17. Contact Information" },
];

export default function TermsAndConditionsPage() {
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
            LEGAL DOCUMENT &bull; TERMS OF USE
          </p>
          <h1 className="font-serif font-black text-3xl sm:text-5xl md:text-[52px] text-slate-900 tracking-tight leading-[1.1] mb-3">
            Terms and Conditions
          </h1>
          <p className="text-[11px] sm:text-xs font-semibold tracking-wider text-slate-500 uppercase">
            LAST UPDATED: JULY 15, 2024
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
              <FileText className="w-4 h-4 text-[#BF1E2D]" />
              Table of Contents
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
                <span className="w-2 h-2 bg-[#BF1E2D] rounded-xs" />
                <h2 className="text-[11.5px] font-extrabold uppercase tracking-wider text-slate-900">
                  TABLE OF CONTENTS
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
                  Welcome to <strong className="text-slate-900 font-semibold">London BigBen Network</strong> (&ldquo;London BigBen Network&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;). These Terms and Conditions (&ldquo;Terms&rdquo;) govern your access to and use of the London BigBen Network website, mobile portals, digital editions, newsletters, and associated services (collectively, the &ldquo;Platform&rdquo;).
                </p>
                <p>
                  By accessing, browsing, subscribing to, or using any part of the Platform, you acknowledge that you have read, understood, and agree to be legally bound by these Terms, as well as our <Link href="/about" className="text-[#BF1E2D] hover:underline font-medium">Editorial Policy</Link> and Privacy Policy. If you do not agree to all of these Terms, please do not access or use our Platform.
                </p>
                <p>
                  We reserve the right to revise, modify, or update these Terms at any time without prior individual notice. Continued use of the Platform following any updates implies full acceptance of the revised Terms. We recommend checking this page periodically to remain informed of any revisions.
                </p>
              </div>
            </section>

            {/* 1. ELIGIBILITY */}
            <section id="eligibility" className="scroll-mt-28 border-t border-slate-100 pt-8">
              <h2 className="font-serif font-bold text-xl sm:text-[22px] text-slate-900 mb-3.5 tracking-tight flex items-baseline gap-2">
                <span className="text-[#BF1E2D] font-serif font-black">1.</span>
                <span>Eligibility</span>
              </h2>
              <p>
                You must be at least 16 years of age (or the minimum legal age of digital consent in your jurisdiction) to access or use our Platform. By using London BigBen Network, you represent and warrant that you meet this age requirement and hold the full legal capacity to enter into these binding Terms and comply with all applicable local, national, and international laws.
              </p>
            </section>

            {/* 2. OUR SERVICES */}
            <section id="services" className="scroll-mt-28 border-t border-slate-100 pt-8">
              <h2 className="font-serif font-bold text-xl sm:text-[22px] text-slate-900 mb-3.5 tracking-tight flex items-baseline gap-2">
                <span className="text-[#BF1E2D] font-serif font-black">2.</span>
                <span>Our Services</span>
              </h2>
              <div className="space-y-3">
                <p>
                  London BigBen Network is an independent digital news and publishing outlet providing global news reporting, economic analysis, political coverage, technology insights, newsletters, and multimedia editorial content.
                </p>
                <p>
                  All content is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis for general educational and informational purposes only. While our journalists make every reasonable effort to verify sources and facts, we do not warrant the uninterrupted availability, reliability, or completeness of the Platform.
                </p>
                <p>
                  We reserve the right to modify, suspend, restrict, or discontinue any feature, content section, or digital tool on the Platform at any time without notice or liability.
                </p>
              </div>
            </section>

            {/* 3. USER ACCOUNTS */}
            <section id="accounts" className="scroll-mt-28 border-t border-slate-100 pt-8">
              <h2 className="font-serif font-bold text-xl sm:text-[22px] text-slate-900 mb-3.5 tracking-tight flex items-baseline gap-2">
                <span className="text-[#BF1E2D] font-serif font-black">3.</span>
                <span>User Accounts</span>
              </h2>
              <div className="space-y-3">
                <p>
                  Certain interactive features on London BigBen Network—such as bookmarking, newsletter subscriptions, commentary, and subscriber privileges—may require the creation of an account.
                </p>
                <p>
                  You agree to provide true, accurate, current, and complete information during registration and keep your credentials up to date. You are solely responsible for maintaining the confidentiality of your credentials and password, and for all activities conducted under your account. You agree to immediately notify us of any unauthorized use or security compromise.
                </p>
              </div>
            </section>

            {/* 4. USER CONTENT */}
            <section id="user-content" className="scroll-mt-28 border-t border-slate-100 pt-8">
              <h2 className="font-serif font-bold text-xl sm:text-[22px] text-slate-900 mb-3.5 tracking-tight flex items-baseline gap-2">
                <span className="text-[#BF1E2D] font-serif font-black">4.</span>
                <span>User Content</span>
              </h2>
              <div className="space-y-3">
                <p>
                  Users may have the opportunity to submit comments, opinion pieces, letters to the editor, images, video content, or feedback (&ldquo;User Content&rdquo;). In submitting content, you represent and warrant that you own or possess the required licenses, rights, and permissions to submit such material and that it does not contain defamatory, libelous, or unlawful content.
                </p>
                <p>
                  By submitting content, you grant London BigBen Network a worldwide, perpetual, royalty-free, irrevocable, non-exclusive license to publish, adapt, format, display, syndicate, and distribute your content across any current or future medium.
                </p>
                <p>
                  We reserve the right, at our absolute discretion, to monitor, review, reject, or remove any User Content that violates our community standards, editorial guidelines, or applicable legislation.
                </p>
              </div>
            </section>

            {/* 5. EDITORIAL INDEPENDENCE */}
            <section id="editorial-independence" className="scroll-mt-28 border-t border-slate-100 pt-8">
              <h2 className="font-serif font-bold text-xl sm:text-[22px] text-slate-900 mb-3.5 tracking-tight flex items-baseline gap-2">
                <span className="text-[#BF1E2D] font-serif font-black">5.</span>
                <span>Editorial Independence</span>
              </h2>
              <p>
                London BigBen Network operates with complete editorial autonomy. Our reporting, story curation, headlines, and analysis are governed exclusively by our editorial board and journalism ethics. Advertisers, corporate partners, sponsors, and governments exert no influence, review privilege, or veto power over news coverage. All editorial decisions are final.
              </p>
            </section>

            {/* 6. INTELLECTUAL PROPERTY */}
            <section id="intellectual-property" className="scroll-mt-28 border-t border-slate-100 pt-8">
              <h2 className="font-serif font-bold text-xl sm:text-[22px] text-slate-900 mb-3.5 tracking-tight flex items-baseline gap-2">
                <span className="text-[#BF1E2D] font-serif font-black">6.</span>
                <span>Intellectual Property</span>
              </h2>
              <div className="space-y-3">
                <p>
                  All articles, text, investigative reports, photographs, graphics, charts, video clips, logos, mastheads, layouts, software code, and trademarks displayed on London BigBen Network are the proprietary property of London BigBen Network or its authorized licensors and are protected under international copyright, trademark, and intellectual property laws.
                </p>
                <p>
                  You are granted a limited, revocable license to access and read materials for personal, non-commercial use. Any unauthorized reproduction, bulk copying, commercial republishing, automated scraping, framing, or redistribution without express written consent from London BigBen Network is strictly prohibited.
                </p>
              </div>
            </section>

            {/* 7. SPONSORED CONTENT & ADVERTISING */}
            <section id="advertising" className="scroll-mt-28 border-t border-slate-100 pt-8">
              <h2 className="font-serif font-bold text-xl sm:text-[22px] text-slate-900 mb-3.5 tracking-tight flex items-baseline gap-2">
                <span className="text-[#BF1E2D] font-serif font-black">7.</span>
                <span>Sponsored Content &amp; Advertising</span>
              </h2>
              <p>
                Our Platform may feature third-party advertisements, commercial collaborations, and partner articles. All commercial materials are clearly distinguished with labels such as &ldquo;Sponsored&rdquo;, &ldquo;Advertisement&rdquo;, or &ldquo;Partner Content&rdquo;. Publication of sponsored material does not imply endorsement, verification, or warranty by London BigBen Network of any advertised claim, product, or organization.
              </p>
            </section>

            {/* 8. THIRD-PARTY LINKS */}
            <section id="third-party-links" className="scroll-mt-28 border-t border-slate-100 pt-8">
              <h2 className="font-serif font-bold text-xl sm:text-[22px] text-slate-900 mb-3.5 tracking-tight flex items-baseline gap-2">
                <span className="text-[#BF1E2D] font-serif font-black">8.</span>
                <span>Third-Party Links</span>
              </h2>
              <p>
                Our articles and pages may link to external websites, institutional archives, or third-party platforms for reference. These links are provided solely as a convenience for readers. London BigBen Network holds no responsibility for the editorial standards, accuracy, or privacy practices of external third-party sites.
              </p>
            </section>

            {/* 9. COPYRIGHT POLICY */}
            <section id="copyright" className="scroll-mt-28 border-t border-slate-100 pt-8">
              <h2 className="font-serif font-bold text-xl sm:text-[22px] text-slate-900 mb-3.5 tracking-tight flex items-baseline gap-2">
                <span className="text-[#BF1E2D] font-serif font-black">9.</span>
                <span>Copyright Policy</span>
              </h2>
              <p>
                London BigBen Network respects intellectual property rights and adheres to the Digital Millennium Copyright Act (DMCA) and UK copyright statutes. If you believe your copyrighted work has been reproduced without appropriate licensing or attribution, please submit a written notice to our legal desk at <a href="mailto:editorial@londonbigben.com" className="text-[#BF1E2D] font-semibold hover:underline">editorial@londonbigben.com</a> with specific identification of the material and proof of ownership.
              </p>
            </section>

            {/* 10. ACCEPTABLE USE */}
            <section id="acceptable-use" className="scroll-mt-28 border-t border-slate-100 pt-8">
              <h2 className="font-serif font-bold text-xl sm:text-[22px] text-slate-900 mb-3.5 tracking-tight flex items-baseline gap-2">
                <span className="text-[#BF1E2D] font-serif font-black">10.</span>
                <span>Acceptable Use</span>
              </h2>
              <div className="space-y-3">
                <p>
                  You agree to use London BigBen Network only for lawful purposes in accordance with these Terms. You agree not to engage in any of the following prohibited behaviors:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-600 text-[13.5px]">
                  <li>Deploying automated crawlers, bots, scrapers, or extraction tools without written authorization.</li>
                  <li>Attempting to probe, scan, or breach authentication or network security measures.</li>
                  <li>Introducing viruses, trojans, worms, or other technologically malicious materials.</li>
                  <li>Impersonating London BigBen Network journalists, editorial staff, or other users.</li>
                  <li>Harassing, threatening, or infringing upon the privacy rights of other individuals.</li>
                </ul>
              </div>
            </section>

            {/* 11. DISCLAIMER */}
            <section id="disclaimer" className="scroll-mt-28 border-t border-slate-100 pt-8">
              <h2 className="font-serif font-bold text-xl sm:text-[22px] text-slate-900 mb-3.5 tracking-tight flex items-baseline gap-2">
                <span className="text-[#BF1E2D] font-serif font-black">11.</span>
                <span>Disclaimer</span>
              </h2>
              <div className="space-y-3">
                <p>
                  The articles, analyses, opinions, market briefs, and data published on London BigBen Network are provided for general educational, editorial, and journalistic purposes only. While our newsroom takes rigorous precautions to ensure factual integrity, unintentional errors or delayed updates may occur.
                </p>
                <div className="p-4 bg-slate-50 border-l-3 border-[#BF1E2D] rounded-r-md">
                  <p className="font-bold text-slate-900 text-[14px]">
                    Nothing published on this website constitutes legal, financial, investment, tax, medical, or professional advice. Readers should consult qualified licensed professionals before taking action based on any information published on our Platform.
                  </p>
                </div>
              </div>
            </section>

            {/* 12. LIMITATION OF LIABILITY */}
            <section id="liability" className="scroll-mt-28 border-t border-slate-100 pt-8">
              <h2 className="font-serif font-bold text-xl sm:text-[22px] text-slate-900 mb-3.5 tracking-tight flex items-baseline gap-2">
                <span className="text-[#BF1E2D] font-serif font-black">12.</span>
                <span>Limitation of Liability</span>
              </h2>
              <p>
                To the fullest extent permitted under applicable law, London BigBen Network, its owners, editors, journalists, affiliates, and licensors shall not be liable for any indirect, incidental, punitive, special, or consequential damages arising out of or in connection with your access to, use of, or inability to use the Platform, even if advised of the possibility of such damages.
              </p>
            </section>

            {/* 13. INDEMNIFICATION */}
            <section id="indemnification" className="scroll-mt-28 border-t border-slate-100 pt-8">
              <h2 className="font-serif font-bold text-xl sm:text-[22px] text-slate-900 mb-3.5 tracking-tight flex items-baseline gap-2">
                <span className="text-[#BF1E2D] font-serif font-black">13.</span>
                <span>Indemnification</span>
              </h2>
              <p>
                You agree to defend, indemnify, and hold harmless London BigBen Network, its officers, directors, editors, contributors, and agents against any claims, liabilities, damages, losses, and expenses (including reasonable legal fees) resulting from or arising out of your breach of these Terms, your misuse of the Platform, or your infringement of third-party rights.
              </p>
            </section>

            {/* 14. PRIVACY */}
            <section id="privacy" className="scroll-mt-28 border-t border-slate-100 pt-8">
              <h2 className="font-serif font-bold text-xl sm:text-[22px] text-slate-900 mb-3.5 tracking-tight flex items-baseline gap-2">
                <span className="text-[#BF1E2D] font-serif font-black">14.</span>
                <span>Privacy</span>
              </h2>
              <p>
                Your privacy and data protection are fundamental to our organization. Please review our Privacy Policy, which governs how we collect, handle, protect, and process your personal information across all London BigBen Network platforms.
              </p>
            </section>

            {/* 15. CHANGES TO SERVICES */}
            <section id="changes-to-services" className="scroll-mt-28 border-t border-slate-100 pt-8">
              <h2 className="font-serif font-bold text-xl sm:text-[22px] text-slate-900 mb-3.5 tracking-tight flex items-baseline gap-2">
                <span className="text-[#BF1E2D] font-serif font-black">15.</span>
                <span>Changes to Services</span>
              </h2>
              <p>
                We reserve the right to revise, modify, suspend, temporarily restrict, or permanently terminate any feature, section, digital newsletter, or service at our discretion without prior notice. London BigBen Network bears no liability for any discontinuation of digital features.
              </p>
            </section>

            {/* 16. GOVERNING LAW */}
            <section id="governing-law" className="scroll-mt-28 border-t border-slate-100 pt-8">
              <h2 className="font-serif font-bold text-xl sm:text-[22px] text-slate-900 mb-3.5 tracking-tight flex items-baseline gap-2">
                <span className="text-[#BF1E2D] font-serif font-black">16.</span>
                <span>Governing Law</span>
              </h2>
              <p>
                These Terms and any dispute or claim arising out of or in connection with them or their subject matter shall be governed by and construed in accordance with the laws of England and Wales. Any legal dispute or proceeding shall be submitted to the exclusive jurisdiction of the competent courts in London, England.
              </p>
            </section>

            {/* 17. CONTACT INFORMATION */}
            <section id="contact-information" className="scroll-mt-28 border-t border-slate-100 pt-8">
              <h2 className="font-serif font-bold text-xl sm:text-[22px] text-slate-900 mb-3.5 tracking-tight flex items-baseline gap-2">
                <span className="text-[#BF1E2D] font-serif font-black">17.</span>
                <span>Contact Information</span>
              </h2>
              <p className="mb-5">
                For legal inquiries, copyright questions, or formal notices regarding these Terms and Conditions, please contact us:
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
                      href="mailto:editorial@londonbigben.com"
                      className="text-slate-900 font-medium hover:text-[#BF1E2D] transition-colors"
                    >
                      editorial@londonbigben.com
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
