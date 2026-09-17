"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ChevronDown, ChevronUp, Feather, Mail, MapPin, Phone, ShieldCheck } from "lucide-react";

interface TocItem {
  id: string;
  label: string;
}

const tocItems: TocItem[] = [
  { id: "core-commitment", label: "Core Commitment to Journalism" },
  { id: "accuracy-verification", label: "1. Accuracy and Verification" },
  { id: "editorial-independence", label: "2. Editorial Independence" },
  { id: "fairness-balance", label: "3. Fairness and Balance" },
  { id: "sourcing-standards", label: "4. Sourcing Standards" },
  { id: "original-journalism", label: "5. Original Journalism" },
  { id: "attribution-copyright", label: "6. Attribution and Copyright" },
  { id: "opinion-editorial", label: "7. Opinion and Editorial Content" },
  { id: "corrections-updates", label: "8. Corrections and Updates" },
  { id: "artificial-intelligence", label: "9. Artificial Intelligence (AI)" },
  { id: "multimedia-standards", label: "10. Images, Video and Multimedia" },
  { id: "user-generated-content", label: "11. User-Generated Content" },
  { id: "sponsored-advertising", label: "12. Sponsored Content and Advertising" },
  { id: "conflicts-of-interest", label: "13. Conflicts of Interest" },
  { id: "diversity-inclusion", label: "14. Diversity and Inclusion" },
  { id: "confidential-sources", label: "15. Security and Confidential Sources" },
  { id: "community-standards", label: "16. Community Standards" },
  { id: "transparency", label: "17. Transparency" },
  { id: "continuous-improvement", label: "18. Continuous Improvement" },
  { id: "contact-editorial", label: "Contact the Editorial Team" },
];

export default function EditorialPolicyPage() {
  const [activeId, setActiveId] = useState<string>("core-commitment");
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
            PROFESSIONAL ETHICS &bull; EDITORIAL STANDARDS
          </p>
          <h1 className="font-serif font-black text-3xl sm:text-5xl md:text-[52px] text-slate-900 tracking-tight leading-[1.1] mb-3">
            Editorial Guidelines &amp; Ethics Policy
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
              <Feather className="w-4 h-4 text-[#BF1E2D]" />
              Editorial Policy Sections
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
                <Feather className="w-3.5 h-3.5 text-[#BF1E2D]" />
                <h2 className="text-[11.5px] font-extrabold uppercase tracking-wider text-slate-900">
                  EDITORIAL POLICY
                </h2>
              </div>
              <nav className="space-y-1 max-h-[calc(100vh-180px)] overflow-y-auto pr-1">
                {tocItems.map((item) => {
                  const isActive = activeId === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => scrollToSection(item.id)}
                      className={`w-full text-left text-[12.5px] py-1.5 px-3 rounded transition-all duration-150 block truncate ${
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

          {/* RIGHT COLUMN: MAIN EDITORIAL POLICY TEXT */}
          <article className="lg:col-span-8 space-y-10 text-slate-700 text-[14px] sm:text-[14.5px] leading-relaxed">
            
            {/* CORE COMMITMENT TO JOURNALISM */}
            <section id="core-commitment" className="scroll-mt-28">
              <h2 className="font-serif font-bold text-2xl text-slate-900 mb-4 tracking-tight">
                Core Commitment to Journalism
              </h2>
              <div className="space-y-4">
                <p>
                  At <strong className="text-slate-900 font-semibold">London BigBen Network</strong>, journalism is a public responsibility. Our mission is to provide accurate, fair, independent, and responsible reporting that informs, educates, and empowers our readers across local, national, and global communities.
                </p>
                <p>
                  We believe a vibrant and democratic society relies on accessible and reliable truth. These Editorial Guidelines and Ethics Policy govern every piece of content published on our platform—from breaking news and investigative reports to features, newsletters, and multimedia production.
                </p>
              </div>
            </section>

            {/* 1. ACCURACY AND VERIFICATION */}
            <section id="accuracy-verification" className="scroll-mt-28 border-t border-slate-100 pt-8">
              <h2 className="font-serif font-bold text-xl sm:text-[22px] text-slate-900 mb-3.5 tracking-tight flex items-baseline gap-2">
                <span className="text-[#BF1E2D] font-serif font-black">1.</span>
                <span>Accuracy and Verification</span>
              </h2>
              <div className="space-y-3">
                <p>
                  Accuracy is the bedrock of our journalism. Before publication, our newsroom adheres to rigorous verification protocols:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-slate-700 text-[13.5px] sm:text-[14px]">
                  <li>Verify information through multiple and credible sources.</li>
                  <li>Confirm facts using official records whenever possible.</li>
                  <li>Perform cross-checks on statistics, quotations, and referenced chronology.</li>
                  <li>Require editorial review and sign-off before publishing sensitive stories.</li>
                  <li>Clearly distinguish verified facts from opinions or analysis.</li>
                </ul>
                <p>
                  When verified information is amended after publication, updates are disclosed clearly.
                </p>
              </div>
            </section>

            {/* 2. EDITORIAL INDEPENDENCE */}
            <section id="editorial-independence" className="scroll-mt-28 border-t border-slate-100 pt-8">
              <h2 className="font-serif font-bold text-xl sm:text-[22px] text-slate-900 mb-3.5 tracking-tight flex items-baseline gap-2">
                <span className="text-[#BF1E2D] font-serif font-black">2.</span>
                <span>Editorial Independence</span>
              </h2>
              <p>
                We maintain absolute editorial independence. Our editorial staff, contributors, and journalists make newsroom decisions guided solely by public interest and news value, completely free from commercial, political, or governmental influence. No advertiser, sponsor, or external organization has preview or veto authority over news coverage before or after publication.
              </p>
            </section>

            {/* 3. FAIRNESS AND BALANCE */}
            <section id="fairness-balance" className="scroll-mt-28 border-t border-slate-100 pt-8">
              <h2 className="font-serif font-bold text-xl sm:text-[22px] text-slate-900 mb-3.5 tracking-tight flex items-baseline gap-2">
                <span className="text-[#BF1E2D] font-serif font-black">3.</span>
                <span>Fairness and Balance</span>
              </h2>
              <p>
                Fairness requires presenting stories in clear context and giving reasonable opportunity for all sides of a controversial issue to be represented. Whenever individuals, companies, or public entities are accused of wrongdoing or criticized in an article, our journalists make good-faith efforts to seek their comment or response prior to publication.
              </p>
            </section>

            {/* 4. SOURCING STANDARDS */}
            <section id="sourcing-standards" className="scroll-mt-28 border-t border-slate-100 pt-8">
              <h2 className="font-serif font-bold text-xl sm:text-[22px] text-slate-900 mb-3.5 tracking-tight flex items-baseline gap-2">
                <span className="text-[#BF1E2D] font-serif font-black">4.</span>
                <span>Sourcing Standards</span>
              </h2>
              <div className="space-y-3">
                <p>
                  London BigBen Network prioritizes primary, on-the-record sources. Anonymous sources are used sparingly and only when the information is vital to public interest, cannot be obtained otherwise, and the source faces credible risk.
                </p>
                <p>
                  Anonymous sources must always be verified by an editor, and their motivation and reliability must be evaluated before inclusion. London BigBen Network does not pay sources or subjects for interviews or story tips.
                </p>
              </div>
            </section>

            {/* 5. ORIGINAL JOURNALISM */}
            <section id="original-journalism" className="scroll-mt-28 border-t border-slate-100 pt-8">
              <h2 className="font-serif font-bold text-xl sm:text-[22px] text-slate-900 mb-3.5 tracking-tight flex items-baseline gap-2">
                <span className="text-[#BF1E2D] font-serif font-black">5.</span>
                <span>Original Journalism</span>
              </h2>
              <p>
                We prioritize original reporting, investigative inquiry, and firsthand interviews. While we report on breaking news curated by wire services and other respected outlets, we actively aim to advance the story with unique insights, local perspective, and rigorous context.
              </p>
            </section>

            {/* 6. ATTRIBUTION AND COPYRIGHT */}
            <section id="attribution-copyright" className="scroll-mt-28 border-t border-slate-100 pt-8">
              <h2 className="font-serif font-bold text-xl sm:text-[22px] text-slate-900 mb-3.5 tracking-tight flex items-baseline gap-2">
                <span className="text-[#BF1E2D] font-serif font-black">6.</span>
                <span>Attribution and Copyright</span>
              </h2>
              <p>
                We respect intellectual property. Information, quotes, statistics, or reporting derived from other news organizations, research institutes, or government agencies are prominently attributed with direct links to the original source material whenever possible. Plagiarism in any form is strictly forbidden.
              </p>
            </section>

            {/* 7. OPINION AND EDITORIAL CONTENT */}
            <section id="opinion-editorial" className="scroll-mt-28 border-t border-slate-100 pt-8">
              <h2 className="font-serif font-bold text-xl sm:text-[22px] text-slate-900 mb-3.5 tracking-tight flex items-baseline gap-2">
                <span className="text-[#BF1E2D] font-serif font-black">7.</span>
                <span>Opinion and Editorial Content</span>
              </h2>
              <p>
                Our reporting maintains a strict demarcation between objective news reporting and commentary, opinion, or analysis. Opinion pieces, op-eds, columnists, and letters to the editor are clearly labelled as &ldquo;Opinion&rdquo; or &ldquo;Analysis&rdquo; to ensure readers understand they represent personal perspectives rather than newsroom reporting.
              </p>
            </section>

            {/* 8. CORRECTIONS AND UPDATES */}
            <section id="corrections-updates" className="scroll-mt-28 border-t border-slate-100 pt-8">
              <h2 className="font-serif font-bold text-xl sm:text-[22px] text-slate-900 mb-3.5 tracking-tight flex items-baseline gap-2">
                <span className="text-[#BF1E2D] font-serif font-black">8.</span>
                <span>Corrections and Updates</span>
              </h2>
              <p>
                Transparency builds reader trust. When errors are identified, our editorial team moves expeditiously to correct them. Corrections are transparently footnoted or prominently noted within the article, stating what was changed and why. Significant factual errors are addressed promptly.
              </p>
            </section>

            {/* 9. ARTIFICIAL INTELLIGENCE (AI) */}
            <section id="artificial-intelligence" className="scroll-mt-28 border-t border-slate-100 pt-8">
              <h2 className="font-serif font-bold text-xl sm:text-[22px] text-slate-900 mb-3.5 tracking-tight flex items-baseline gap-2">
                <span className="text-[#BF1E2D] font-serif font-black">9.</span>
                <span>Artificial Intelligence (AI)</span>
              </h2>
              <div className="space-y-3">
                <p>
                  We use artificial intelligence tools responsibly to assist editorial workflows—such as research, transcription, and administrative coordination—under strict human oversight and editorial review.
                </p>
                <div className="p-4 bg-slate-50 border-l-3 border-[#BF1E2D] rounded-r-md">
                  <p className="font-bold text-slate-900 text-[13.5px] sm:text-[14px]">
                    Articles or images created with or substantially assisted by generative AI are disclosed clearly. We do not publish automated or unverified AI-generated content as original human journalism.
                  </p>
                </div>
              </div>
            </section>

            {/* 10. IMAGES, VIDEO AND MULTIMEDIA */}
            <section id="multimedia-standards" className="scroll-mt-28 border-t border-slate-100 pt-8">
              <h2 className="font-serif font-bold text-xl sm:text-[22px] text-slate-900 mb-3.5 tracking-tight flex items-baseline gap-2">
                <span className="text-[#BF1E2D] font-serif font-black">10.</span>
                <span>Images, Video and Multimedia</span>
              </h2>
              <p>
                Visual media is subject to the same rigorous ethical standards as text journalism. Photographs and videos are never manipulated in ways that alter facts, mislead viewers, or falsify events. Standard digital adjustments (e.g., cropping, color balance) are acceptable; illustrative or composite images are clearly identified as illustrations.
              </p>
            </section>

            {/* 11. USER-GENERATED CONTENT */}
            <section id="user-generated-content" className="scroll-mt-28 border-t border-slate-100 pt-8">
              <h2 className="font-serif font-bold text-xl sm:text-[22px] text-slate-900 mb-3.5 tracking-tight flex items-baseline gap-2">
                <span className="text-[#BF1E2D] font-serif font-black">11.</span>
                <span>User-Generated Content</span>
              </h2>
              <p>
                Comments, opinion submissions, and reader contributions are subject to editorial moderation. We reserve the right to review, edit for length, or reject content that is defamatory, abusive, hateful, infringing, or misleading. Submissions must adhere to our community guidelines and standards of public discourse.
              </p>
            </section>

            {/* 12. SPONSORED CONTENT AND ADVERTISING */}
            <section id="sponsored-advertising" className="scroll-mt-28 border-t border-slate-100 pt-8">
              <h2 className="font-serif font-bold text-xl sm:text-[22px] text-slate-900 mb-3.5 tracking-tight flex items-baseline gap-2">
                <span className="text-[#BF1E2D] font-serif font-black">12.</span>
                <span>Sponsored Content and Advertising</span>
              </h2>
              <p>
                Commercial partnerships, sponsored content, and advertisements are explicitly separated from newsroom journalism. Sponsored material is labelled with prominent indicators such as &ldquo;Sponsored&rdquo;, &ldquo;Partner Feature&rdquo;, or &ldquo;Advertisement&rdquo;. Advertisers have no influence over newsroom coverage.
              </p>
            </section>

            {/* 13. CONFLICTS OF INTEREST */}
            <section id="conflicts-of-interest" className="scroll-mt-28 border-t border-slate-100 pt-8">
              <h2 className="font-serif font-bold text-xl sm:text-[22px] text-slate-900 mb-3.5 tracking-tight flex items-baseline gap-2">
                <span className="text-[#BF1E2D] font-serif font-black">13.</span>
                <span>Conflicts of Interest</span>
              </h2>
              <p>
                Staff writers, reporters, and editorial leaders must disclose potential conflicts of interest. Journalists are prohibited from covering companies, political campaigns, or organizations in which they have a direct personal, financial, or political stake. Outside gifts and hospitality that could compromise journalistic integrity are declined.
              </p>
            </section>

            {/* 14. DIVERSITY AND INCLUSION */}
            <section id="diversity-inclusion" className="scroll-mt-28 border-t border-slate-100 pt-8">
              <h2 className="font-serif font-bold text-xl sm:text-[22px] text-slate-900 mb-3.5 tracking-tight flex items-baseline gap-2">
                <span className="text-[#BF1E2D] font-serif font-black">14.</span>
                <span>Diversity and Inclusion</span>
              </h2>
              <p>
                We are committed to reflecting the diversity of the communities we cover in our newsroom, sourcing, and reporting. We strive to present diverse perspectives, amplify underrepresented voices, and report with empathy and cultural sensitivity across all beats.
              </p>
            </section>

            {/* 15. SECURITY AND CONFIDENTIAL SOURCES */}
            <section id="confidential-sources" className="scroll-mt-28 border-t border-slate-100 pt-8">
              <h2 className="font-serif font-bold text-xl sm:text-[22px] text-slate-900 mb-3.5 tracking-tight flex items-baseline gap-2">
                <span className="text-[#BF1E2D] font-serif font-black">15.</span>
                <span>Security and Confidential Sources</span>
              </h2>
              <p>
                We recognize the responsibility of protecting confidential sources. London BigBen Network employs secure communication channels and will defend the confidentiality of sources to the maximum extent permitted by law.
              </p>
            </section>

            {/* 16. COMMUNITY STANDARDS */}
            <section id="community-standards" className="scroll-mt-28 border-t border-slate-100 pt-8">
              <h2 className="font-serif font-bold text-xl sm:text-[22px] text-slate-900 mb-3.5 tracking-tight flex items-baseline gap-2">
                <span className="text-[#BF1E2D] font-serif font-black">16.</span>
                <span>Community Standards</span>
              </h2>
              <p>
                We encourage constructive community participation, civilized debate, and engagement with our journalism. Abusive, defamatory, hateful, or discriminatory comments will not be tolerated. We actively moderate our forums to maintain respectful civic discourse.
              </p>
            </section>

            {/* 17. TRANSPARENCY */}
            <section id="transparency" className="scroll-mt-28 border-t border-slate-100 pt-8">
              <h2 className="font-serif font-bold text-xl sm:text-[22px] text-slate-900 mb-3.5 tracking-tight flex items-baseline gap-2">
                <span className="text-[#BF1E2D] font-serif font-black">17.</span>
                <span>Transparency</span>
              </h2>
              <p>
                We are transparent about who we are, our ownership structure, and our editorial policies. We clearly disclose our funding sources and leadership team on our website. Readers have direct avenues to reach out with questions, concerns, or feedback regarding our reporting.
              </p>
            </section>

            {/* 18. CONTINUOUS IMPROVEMENT */}
            <section id="continuous-improvement" className="scroll-mt-28 border-t border-slate-100 pt-8">
              <h2 className="font-serif font-bold text-xl sm:text-[22px] text-slate-900 mb-3.5 tracking-tight flex items-baseline gap-2">
                <span className="text-[#BF1E2D] font-serif font-black">18.</span>
                <span>Continuous Improvement</span>
              </h2>
              <p>
                Journalism evolves, and so do ethical challenges. We review our editorial guidelines periodically and engage with media ethics standards organizations to ensure continuous training and professional improvement for all editorial staff.
              </p>
            </section>

            {/* BOTTOM CARDS SECTION */}
            <div id="contact-editorial" className="scroll-mt-28 border-t border-slate-100 pt-8 space-y-6">
              
              {/* CARD 1: CONTACT THE EDITORIAL TEAM */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-lg p-6 sm:p-7 max-w-lg shadow-xs">
                <h3 className="font-serif font-bold text-lg text-slate-900 mb-3">
                  London BigBen Editorial Desk
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

              {/* CARD 2: OUR EDITORIAL PROMISE (BLUE/SLATE CALLOUT CARD MATCHING SCREENSHOT) */}
              <div className="bg-[#f4f7fb] border border-[#d2dfef] rounded-lg p-6 sm:p-7 shadow-xs">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="w-5 h-5 text-[#1e3a8a]" />
                  <h3 className="font-serif font-bold text-lg text-[#1e3a8a]">
                    Our Editorial Promise
                  </h3>
                </div>
                <div className="space-y-3 text-xs sm:text-[13px] text-[#2c4b72] leading-relaxed">
                  <p>
                    London BigBen Network is committed to delivering journalism that citizens can trust. We report with accuracy, impartiality, and accountability. We strive to provide clarity in an era of misinformation, illuminating stories that matter and holding power accountable regardless of political party or corporate standing.
                  </p>
                  <p>
                    Every story we publish reflects our dedication to serving the public interest with integrity, rigor, and the highest standards of professional ethics.
                  </p>
                </div>
              </div>

            </div>

          </article>

        </div>
      </main>

      <Footer />
    </div>
  );
}
