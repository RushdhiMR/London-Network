"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { resolveUserAvatar, getAuthorAvatarByNameOrEmail } from "@/lib/userProfiles";

const INITIAL_TEAM_MEMBERS = [
  {
    name: "James Carter",
    role: "Editor-in-Chief",
    fallbackImage: "/author_bluesuit.jpg",
    slug: "james-carter",
    email: "james.carter@londonbigben.com",
    searchQuery: "James",
  },
  {
    name: "Sophia Williams",
    role: "Managing Editor",
    fallbackImage: "/author_woman.jpg",
    slug: "sophia-williams",
    email: "sophia.williams@londonbigben.com",
    searchQuery: "Sophia",
  },
  {
    name: "Daniel Brooks",
    role: "Senior Political Correspondent",
    fallbackImage: "/author_glasses.jpg",
    slug: "daniel-brooks",
    email: "daniel.brooks@londonbigben.com",
    searchQuery: "Daniel",
  },
  {
    name: "Emily Chen",
    role: "Technology Editor",
    fallbackImage: "/author_emily_chen.jpg",
    slug: "emily-chen",
    email: "emily.chen@londonbigben.com",
    searchQuery: "Emily",
  },
];

export default function AboutUsPage() {
  const [teamMembers, setTeamMembers] = useState(
    INITIAL_TEAM_MEMBERS.map((m) => ({
      ...m,
      image: m.fallbackImage,
    }))
  );

  useEffect(() => {
    let isMounted = true;

    async function syncDatabaseAvatars() {
      // 1. Initial resolution from local profile store if available
      setTeamMembers((prev) =>
        prev.map((member) => {
          const clientAvatar =
            resolveUserAvatar({ name: member.name, email: member.email }) ||
            getAuthorAvatarByNameOrEmail(member.name, member.email);
          return {
            ...member,
            image: clientAvatar && clientAvatar.length > 5 ? clientAvatar : member.fallbackImage,
          };
        })
      );

      // 2. Fetch live profile image through Database API (/api/auth/profile)
      try {
        const updated = await Promise.all(
          INITIAL_TEAM_MEMBERS.map(async (member) => {
            try {
              const res = await fetch(`/api/auth/profile?email=${encodeURIComponent(member.email)}`);
              if (res.ok) {
                const data = await res.json();
                if (data?.success && data?.user?.avatar && data.user.avatar.length > 5) {
                  return {
                    ...member,
                    image: data.user.avatar,
                    name: data.user.name || member.name,
                  };
                }
              }
              const resName = await fetch(`/api/auth/profile?name=${encodeURIComponent(member.searchQuery)}`);
              if (resName.ok) {
                const data = await resName.json();
                if (data?.success && data?.user?.avatar && data.user.avatar.length > 5) {
                  return {
                    ...member,
                    image: data.user.avatar,
                    name: data.user.name || member.name,
                  };
                }
              }
            } catch (err) {
              console.warn(`Failed to fetch database avatar for ${member.name}:`, err);
            }

            const clientAvatar =
              resolveUserAvatar({ name: member.name, email: member.email }) ||
              getAuthorAvatarByNameOrEmail(member.name, member.email);

            return {
              ...member,
              image: clientAvatar && clientAvatar.length > 5 ? clientAvatar : member.fallbackImage,
            };
          })
        );

        if (isMounted) {
          setTeamMembers(updated);
        }
      } catch (e) {
        console.warn("Error syncing author avatars from database:", e);
      }
    }

    syncDatabaseAvatars();

    const handleProfileUpdate = () => {
      syncDatabaseAvatars();
    };

    window.addEventListener("dj_profile_updated", handleProfileUpdate);
    window.addEventListener("dj_user_profile_change", handleProfileUpdate);
    window.addEventListener("dj_auth_change", handleProfileUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener("dj_profile_updated", handleProfileUpdate);
      window.removeEventListener("dj_user_profile_change", handleProfileUpdate);
      window.removeEventListener("dj_auth_change", handleProfileUpdate);
    };
  }, []);

  const topicsRow1 = [
    { name: "World", href: "/category/world" },
    { name: "Politics", href: "/category/politics" },
    { name: "Business", href: "/category/business" },
    { name: "Technology", href: "/category/technology" },
    { name: "Economy", href: "/category/economy" },
    { name: "Markets", href: "/category/markets" },
    { name: "Lifestyle", href: "/category/lifestyle" },
    { name: "Sports", href: "/category/sports" },
  ];

  const topicsRow2 = [
    { name: "Entertainment", href: "/category/entertainment" },
    { name: "Health", href: "/category/health" },
    { name: "Research", href: "/category/research" },
    { name: "Interview", href: "/category/interview" },
    { name: "Opinion", href: "/category/opinion" },
    { name: "Special Reports", href: "/category/special-reports" },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col justify-between selection:bg-red-100 selection:text-red-900">
      <Header />

      <main className="flex-1 w-full">
        {/* SECTION 1: HERO & WHO WE ARE */}
        <section className="w-full bg-gradient-to-b from-[#FAF7F2] via-[#FDFBF9] to-white border-b border-slate-100/80">
          <div className="max-w-[1360px] xl:max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-16 sm:pb-24 lg:pb-28">
            
            {/* Top Unified Hero Banner & Overlapping Camera Card */}
            <div className="relative w-full">
              {/* Top Hero Banner */}
              <div
                className="relative w-full overflow-hidden shadow-xs bg-[#FAF7F3] bg-no-repeat bg-[position:right_top] bg-cover min-h-[360px] sm:min-h-[400px] lg:min-h-[420px] flex items-center"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, #FAF7F3 0%, #FAF7F3 32%, rgba(250, 247, 243, 0.45) 55%, rgba(250, 247, 243, 0) 75%), url('/about_hero_bg_fade.jpg')",
                }}
              >
                <div className="relative z-10 w-full max-w-[540px] py-8 sm:py-10 lg:py-12 pl-6 sm:pl-10 lg:pl-12 pr-4 flex flex-col justify-center">
                  {/* Logo */}
                  <Link
                    href="/"
                    title="London BigBen Network Home"
                    className="inline-block mb-3.5 sm:mb-4 lg:mb-5 group w-fit"
                  >
                    <img
                      src="/header_logo.png"
                      alt="London BigBen Network"
                      className="h-7 sm:h-8 lg:h-9 w-auto object-contain"
                    />
                  </Link>

                  {/* Main Heading */}
                  <h1 className="font-serif font-black text-2xl sm:text-3xl md:text-4xl lg:text-[40px] text-slate-900 leading-[1.12] tracking-tight mb-2.5 sm:mb-3">
                    Independent<br />
                    News for a<br />
                    <span className="text-[#BF1E2D]">Brighter Tomorrow.</span>
                  </h1>

                  {/* Description */}
                  <p className="text-slate-600 text-xs sm:text-[13px] md:text-[13.5px] leading-relaxed max-w-[210px] sm:max-w-md mb-5 sm:mb-6 font-sans">
                    We deliver accurate, timely, and impactful journalism that informs, educates, and empowers people around the world.
                  </p>

                  {/* Button */}
                  <div>
                    <a
                      href="#who-we-are"
                      className="inline-flex items-center gap-2 bg-[#BF1E2D] hover:bg-[#a51926] text-white text-xs sm:text-sm font-semibold px-5 sm:px-6 py-2.5 sm:py-3 rounded transition-all shadow-md group whitespace-nowrap"
                    >
                      <span>Explore Our Story</span>
                      <span className="transition-transform group-hover:translate-x-1">→</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* DSLR Camera Card: Anchored to the banner so it ALWAYS sticks with the banner image */}
              <div className="absolute right-0 sm:right-2 lg:right-4 top-[68%] sm:top-[70%] lg:top-[72%] z-20 w-[45%] max-w-[280px] sm:max-w-[380px] lg:max-w-[475px]">
                <div className="border-4 sm:border-[6px] border-white shadow-2xl bg-slate-900 overflow-hidden">
                  <img
                    src="/about_hero_camera_exact.jpg"
                    alt="London BigBen Network Photojournalism Camera"
                    className="w-full h-auto object-cover block select-none"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Row: Who We Are */}
            <div className="pt-8 sm:pt-10 lg:pt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
              
              {/* Left Column: Who We Are */}
              <div id="who-we-are" className="lg:col-span-6 max-w-lg">
                <h2 className="font-serif font-black text-2xl sm:text-[28px] text-slate-900 tracking-tight mb-2">
                  Who We Are
                </h2>
                <div className="w-7 h-[2.5px] bg-[#BF1E2D] mb-4" />
                <p className="text-slate-600 text-xs sm:text-[13.5px] leading-relaxed mb-4">
                  London BigBen Network is an independent digital news platform committed to delivering credible, balanced, and insightful journalism from around the globe. We bring together a team of experienced journalists, editors, and creators who are passionate about telling stories that matter — locally, nationally, and internationally.
                </p>
                <p className="text-slate-600 text-xs sm:text-[13.5px] leading-relaxed">
                  Our newsroom is built on trust, integrity, and a deep respect for the public&apos;s right to know.
                </p>
              </div>

              {/* Right Spacer (Desktop) where the camera card extends down */}
              <div className="hidden lg:block lg:col-span-6 pointer-events-none" />

            </div>
          </div>
        </section>

        {/* SECTION 2: STATS COUNTER BAR (MATCHING IMAGE 1 ENCLOSED CARD DESIGN) */}
        <section className="w-full bg-white py-6 sm:py-8 lg:py-10">
          <div className="max-w-[1360px] xl:max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-[#F0F4F6] py-8 sm:py-9 lg:py-10 px-4 sm:px-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0 items-center text-center">
                
                {/* Stat 1 */}
                <div className="relative px-3 flex flex-col items-center justify-center">
                  <span className="block font-serif font-black text-2xl sm:text-3xl lg:text-[34px] text-black tracking-tight mb-2.5">
                    50M+
                  </span>
                  <span className="block text-[9.5px] sm:text-[10px] md:text-[10.5px] font-bold text-slate-900 uppercase tracking-[0.16em]">
                    MONTHLY READERS
                  </span>
                  <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 w-[1px] h-11 bg-[#BEC5D2]" />
                </div>

                {/* Stat 2 */}
                <div className="relative px-3 flex flex-col items-center justify-center">
                  <span className="block font-serif font-black text-2xl sm:text-3xl lg:text-[34px] text-black tracking-tight mb-2.5">
                    180+
                  </span>
                  <span className="block text-[9.5px] sm:text-[10px] md:text-[10.5px] font-bold text-slate-900 uppercase tracking-[0.16em]">
                    COUNTRIES REACHED
                  </span>
                  <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 w-[1px] h-11 bg-[#BEC5D2]" />
                </div>

                {/* Stat 3 */}
                <div className="relative px-3 flex flex-col items-center justify-center">
                  <span className="block font-serif font-black text-2xl sm:text-3xl lg:text-[34px] text-black tracking-tight mb-2.5">
                    24/7
                  </span>
                  <span className="block text-[9.5px] sm:text-[10px] md:text-[10.5px] font-bold text-slate-900 uppercase tracking-[0.16em]">
                    GLOBAL NEWS COVERAGE
                  </span>
                  <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 w-[1px] h-11 bg-[#BEC5D2]" />
                </div>

                {/* Stat 4 */}
                <div className="relative px-3 flex flex-col items-center justify-center">
                  <span className="block font-serif font-black text-2xl sm:text-3xl lg:text-[34px] text-black tracking-tight mb-2.5">
                    100+
                  </span>
                  <span className="block text-[9.5px] sm:text-[10px] md:text-[10.5px] font-bold text-slate-900 uppercase tracking-[0.16em]">
                    JOURNALISTS &amp; CONTRIBUTORS
                  </span>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: MISSION AND VISION */}
        <section className="max-w-[1240px] xl:max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Image: Corporate Flags */}
            <div className="lg:col-span-5">
              <div className="rounded-none overflow-hidden aspect-[4/3] w-full bg-slate-100">
                <img
                  src="/about_mission_flags.jpg"
                  alt="London BigBen Network Flags"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Right Text: Purpose & Mission/Vision */}
            <div className="lg:col-span-7">
              <span className="text-[#BF1E2D] text-[10px] sm:text-[11px] font-bold uppercase tracking-widest block mb-1.5">
                OUR PURPOSE
              </span>
              <h2 className="font-serif font-black text-2xl sm:text-3xl lg:text-[34px] text-slate-900 tracking-tight mb-5 sm:mb-6">
                Mission and Vision
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                <div>
                  <h3 className="font-serif font-bold text-base sm:text-lg text-slate-900 mb-1.5">
                    Our Mission
                  </h3>
                  <div className="w-5 h-[2px] bg-[#BF1E2D] mb-3" />
                  <p className="text-slate-600 text-xs sm:text-[13px] leading-relaxed">
                    To empower individuals through credible journalism by providing fair, accurate, and accessible news.
                  </p>
                </div>

                <div className="border-t sm:border-t-0 sm:border-l border-slate-200 pt-5 sm:pt-0 sm:pl-8">
                  <h3 className="font-serif font-bold text-base sm:text-lg text-slate-900 mb-1.5">
                    Our Vision
                  </h3>
                  <div className="w-5 h-[2px] bg-[#BF1E2D] mb-3" />
                  <p className="text-slate-600 text-xs sm:text-[13px] leading-relaxed">
                    To become a global platform known for trust, integrity, innovation, and meaningful public dialogue.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* SECTION 4: A WIDE RANGE OF TOPICS */}
        <section className="max-w-[1240px] xl:max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-5 sm:mb-6">
            <div>
              <span className="text-[#BF1E2D] text-[10px] sm:text-[11px] font-bold uppercase tracking-widest block mb-1.5">
                WHAT WE COVER
              </span>
              <h2 className="font-serif font-black text-2xl sm:text-3xl lg:text-[34px] text-slate-900 tracking-tight">
                A Wide Range of Topics
              </h2>
            </div>
            <p className="text-slate-600 text-xs sm:text-[13px] leading-relaxed max-w-md">
              We publish professional content across key areas, providing in-depth analysis, expert insights, and diverse perspectives to keep you informed.
            </p>
          </div>

          {/* Topics List with Dividers */}
          <div className="space-y-2.5 text-center sm:text-left">
            {/* Row 1 */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-y-2 gap-x-3 sm:gap-x-4 text-xs sm:text-sm font-medium text-slate-700">
              {topicsRow1.map((topic, idx) => (
                <div key={topic.name} className="flex items-center gap-3 sm:gap-4">
                  <Link
                    href={topic.href}
                    className="hover:text-[#BF1E2D] transition-colors hover:underline"
                  >
                    {topic.name}
                  </Link>
                  {idx < topicsRow1.length - 1 && (
                    <span className="text-slate-300 font-light select-none">|</span>
                  )}
                </div>
              ))}
            </div>

            {/* Row 2 */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-y-2 gap-x-3 sm:gap-x-4 text-xs sm:text-sm font-medium text-slate-700">
              {topicsRow2.map((topic, idx) => (
                <div key={topic.name} className="flex items-center gap-3 sm:gap-4">
                  <Link
                    href={topic.href}
                    className="hover:text-[#BF1E2D] transition-colors hover:underline"
                  >
                    {topic.name}
                  </Link>
                  {idx < topicsRow2.length - 1 && (
                    <span className="text-slate-300 font-light select-none">|</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 5: OUR VALUES / WHAT DRIVES US */}
        <section className="w-full bg-[#F0F4F6] py-8 sm:py-10 my-3 sm:my-4">
          <div className="max-w-[1240px] xl:max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
              
              {/* Left Title */}
              <div className="lg:col-span-4">
                <span className="text-[#BF1E2D] text-[10px] sm:text-[11px] font-bold uppercase tracking-widest block mb-1.5">
                  OUR VALUES
                </span>
                <h2 className="font-serif font-black text-3xl sm:text-4xl text-slate-900 tracking-tight leading-tight">
                  What<br />Drives Us
                </h2>
              </div>

              {/* 3 Pillars */}
              <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-0 divide-y sm:divide-y-0 sm:divide-x divide-slate-300/80">
                <div className="sm:pr-6 lg:pr-8">
                  <h3 className="font-serif font-bold text-base sm:text-lg text-slate-900 mb-1.5">
                    Accuracy
                  </h3>
                  <div className="w-5 h-[2px] bg-[#BF1E2D] mb-3" />
                  <p className="text-slate-600 text-xs sm:text-[13px] leading-relaxed">
                    We verify, fact-check, and report with integrity.
                  </p>
                </div>

                <div className="pt-5 sm:pt-0 sm:px-6 lg:px-8">
                  <h3 className="font-serif font-bold text-base sm:text-lg text-slate-900 mb-1.5">
                    Independence
                  </h3>
                  <div className="w-5 h-[2px] bg-[#BF1E2D] mb-3" />
                  <p className="text-slate-600 text-xs sm:text-[13px] leading-relaxed">
                    No agendas. No affiliations. Just the truth.
                  </p>
                </div>

                <div className="pt-5 sm:pt-0 sm:pl-6 lg:pl-8">
                  <h3 className="font-serif font-bold text-base sm:text-lg text-slate-900 mb-1.5">
                    Public Interest
                  </h3>
                  <div className="w-5 h-[2px] bg-[#BF1E2D] mb-3" />
                  <p className="text-slate-600 text-xs sm:text-[13px] leading-relaxed">
                    We inform, empower, and give a voice to what matters.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* SECTION 6: MEET OUR TEAM */}
        <section className="max-w-[1240px] xl:max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          {/* Header Row */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6 sm:mb-8">
            <div>
              <span className="text-[#BF1E2D] text-[10px] sm:text-[11px] font-bold uppercase tracking-widest block mb-1.5">
                MEET OUR TEAM
              </span>
              <h2 className="font-serif font-black text-2xl sm:text-3xl lg:text-[34px] text-slate-900 tracking-tight">
                The People Behind the News
              </h2>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
              <p className="text-slate-600 text-xs sm:text-[13px] max-w-md">
                Our team brings together experienced journalists, editors, creators, and industry experts from around the world.
              </p>
              <Link
                href="/team"
                className="text-[#BF1E2D] hover:underline text-xs sm:text-sm font-semibold flex items-center gap-1 shrink-0 whitespace-nowrap"
              >
                <span>View All Team Members</span>
                <span>→</span>
              </Link>
            </div>
          </div>

          {/* 4 Team Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {teamMembers.map((member) => (
              <div
                key={member.name}
                className="group block"
              >
                <div className="aspect-[4/3] rounded-none overflow-hidden bg-slate-100 mb-3">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <h3 className="font-serif font-bold text-sm sm:text-base text-slate-900 tracking-tight leading-snug">
                  {member.name}
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5">
                  {member.role}
                </p>
                <div className="w-5 h-[2px] bg-[#BF1E2D] mt-2.5" />
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 7: GLOBAL PERSPECTIVE CTA BANNER */}
        <section className="relative w-full overflow-hidden bg-slate-950 py-16 sm:py-20">
          {/* Background image & gradient overlay */}
          <img
            src="/about_cta_skyline.png"
            alt="London Big Ben and Parliament at Sunset"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/25" />

          {/* Banner Content */}
          <div className="relative z-10 max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="text-[#BF1E2D] text-[10px] sm:text-[11px] font-bold uppercase tracking-widest block mb-2">
                GLOBAL PERSPECTIVE
              </span>
              <h2 className="font-serif font-black text-2xl sm:text-3xl lg:text-4xl text-white tracking-tight leading-tight max-w-xl">
                A More Informed World<br className="hidden sm:inline" /> Starts with Trusted News.
              </h2>
            </div>
            <div>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 bg-[#BF1E2D] hover:bg-[#a51926] text-white text-xs sm:text-sm font-semibold px-5 sm:px-6 py-2.5 sm:py-3 rounded transition-all shadow-lg group whitespace-nowrap"
              >
                <span>Join Our Community</span>
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer className="mt-0" hideTopBar={true} />
    </div>
  );
}
