"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Mail, ArrowRight, ShieldCheck, Award, Newspaper } from "lucide-react";
import { resolveUserAvatar, getAuthorAvatarByNameOrEmail } from "@/lib/userProfiles";
import { dispatchPageDataReady } from "@/components/GlobalPageLoader";

interface TeamMember {
  name: string;
  role: string;
  department: string;
  bio: string;
  fallbackImage: string;
  slug: string;
  email: string;
}

const TEAM_MEMBERS: TeamMember[] = [
  {
    name: "James Carter",
    role: "Editor-in-Chief",
    department: "Editorial Leadership",
    bio: "Directs global newsroom operations, investigative standards, and editorial independence across all international editions.",
    fallbackImage: "/author_bluesuit.jpg",
    slug: "james-carter",
    email: "james.carter@londonbigben.com",
  },
  {
    name: "Sophia Williams",
    role: "Managing Editor",
    department: "Editorial Leadership",
    bio: "Oversees daily news desk coordination, international correspondents, and multi-format investigative series.",
    fallbackImage: "/author_woman.jpg",
    slug: "sophia-williams",
    email: "sophia.williams@londonbigben.com",
  },
  {
    name: "Ruzni",
    role: "Editorial Director",
    department: "Editorial Leadership",
    bio: "Steers editorial policy, journalistic ethics, cross-border investigations, and high-impact investigative assignments.",
    fallbackImage: "/author_beard.jpg",
    slug: "ruzni",
    email: "ruzni@londonbigben.com",
  },
  {
    name: "Rushdhi MR",
    role: "Founder & Technology Lead",
    department: "Editorial Leadership",
    bio: "Guides technological infrastructure, real-time news delivery systems, and long-term digital newsroom innovation.",
    fallbackImage: "/author_bluesuit.jpg",
    slug: "rushdhi-mr",
    email: "rushdhi@londonbigben.com",
  },
  {
    name: "Daniel Brooks",
    role: "Senior Political Correspondent",
    department: "Reporting & Editorial Desks",
    bio: "Covers parliamentary governance, cross-Atlantic political diplomacy, elections, and institutional accountability.",
    fallbackImage: "/author_glasses.jpg",
    slug: "daniel-brooks",
    email: "daniel.brooks@londonbigben.com",
  },
  {
    name: "Emily Chen",
    role: "Technology Editor",
    department: "Reporting & Editorial Desks",
    bio: "Specializes in enterprise software, artificial intelligence regulation, semiconductor supply chains, and cybersecurity.",
    fallbackImage: "/author_emily_chen.jpg",
    slug: "emily-chen",
    email: "emily.chen@londonbigben.com",
  },
  {
    name: "Roomi",
    role: "Staff Writer & Market Reporter",
    department: "Reporting & Editorial Desks",
    bio: "Reports on global stock markets, central bank policy, macroeconomic indicators, and corporate governance.",
    fallbackImage: "/author_glasses.jpg",
    slug: "roomi",
    email: "roomi@londonbigben.com",
  },
  {
    name: "Muba_kity",
    role: "Senior Tech Writer",
    department: "Reporting & Editorial Desks",
    bio: "Investigates enterprise cloud innovations, generative AI models, data privacy laws, and modern digital ecosystems.",
    fallbackImage: "/author_woman.jpg",
    slug: "muba-kity",
    email: "muba@londonbigben.com",
  },
];

export default function TeamPage() {
  const [members, setMembers] = useState(
    TEAM_MEMBERS.map((m) => ({
      ...m,
      image: m.fallbackImage,
    }))
  );

  useEffect(() => {
    dispatchPageDataReady();

    let isMounted = true;

    async function syncAvatars() {
      // 1. Initial resolution from local profile store
      setMembers((prev) =>
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

      // 2. Fetch live profile image from Database API if available
      try {
        const updated = await Promise.all(
          TEAM_MEMBERS.map(async (member) => {
            try {
              const res = await fetch(`/api/auth/profile?email=${encodeURIComponent(member.email)}`);
              if (res.ok) {
                const data = await res.json();
                if (data?.user?.avatar && data.user.avatar.length > 5) {
                  return { ...member, image: data.user.avatar };
                }
              }
            } catch (_) {}
            const clientAvatar =
              resolveUserAvatar({ name: member.name, email: member.email }) ||
              getAuthorAvatarByNameOrEmail(member.name, member.email);
            return {
              ...member,
              image: clientAvatar && clientAvatar.length > 5 ? clientAvatar : member.fallbackImage,
            };
          })
        );
        if (isMounted) setMembers(updated);
      } catch (_) {}
    }

    syncAvatars();

    return () => {
      isMounted = false;
    };
  }, []);

  const leadership = members.filter((m) => m.department === "Editorial Leadership");
  const correspondents = members.filter((m) => m.department === "Reporting & Editorial Desks");

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans flex flex-col justify-between selection:bg-red-100 selection:text-[#BF1E2D]">
      <Header />

      <main className="flex-1 max-w-[1360px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        {/* MASTHEAD HERO */}
        <div className="max-w-3xl mb-12 sm:mb-16">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-5 bg-[#BF1E2D]" />
            <span className="text-[11px] sm:text-xs font-mono font-bold uppercase tracking-widest text-[#BF1E2D]">
              OUR EDITORIAL TEAM
            </span>
          </div>
          <h1 className="font-serif font-black text-3xl sm:text-5xl md:text-[52px] text-slate-900 tracking-tight leading-[1.1] mb-4">
            The People Behind London BigBen
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-sans">
            Our newsroom unites award-winning journalists, editors, foreign correspondents, and market analysts committed to independent, verified reporting from London, Washington, and global financial capitals.
          </p>
        </div>

        {/* SECTION 1: EDITORIAL LEADERSHIP */}
        <section className="mb-14 sm:mb-20">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-8">
            <h2 className="font-serif font-bold text-xl sm:text-2xl text-slate-900 tracking-tight flex items-center gap-2">
              <Award className="w-5 h-5 text-[#BF1E2D]" />
              <span>Editorial Leadership</span>
            </h2>
            <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">
              Executive Board
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {leadership.map((member) => (
              <article
                key={member.slug}
                className="bg-white border border-slate-200 rounded-none overflow-hidden flex flex-col hover:border-[#BF1E2D]/40 transition-colors group shadow-2xs"
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100 relative">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#BF1E2D] block mb-1">
                    {member.role}
                  </span>
                  <h3 className="font-serif font-bold text-lg text-slate-900 group-hover:text-[#BF1E2D] transition-colors leading-snug">
                    <Link href={`/author/${member.slug}`}>
                      {member.name}
                    </Link>
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed mt-2.5 mb-4 flex-1">
                    {member.bio}
                  </p>
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs mt-auto">
                    <a
                      href={`mailto:${member.email}`}
                      className="text-slate-500 hover:text-[#BF1E2D] transition-colors flex items-center gap-1.5 font-medium"
                      title={`Email ${member.name}`}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Contact</span>
                    </a>
                    <Link
                      href={`/author/${member.slug}`}
                      className="text-[#BF1E2D] hover:underline font-semibold flex items-center gap-1"
                    >
                      <span>Articles</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* SECTION 2: REPORTING & EDITORIAL DESKS */}
        <section className="mb-14 sm:mb-20">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-8">
            <h2 className="font-serif font-bold text-xl sm:text-2xl text-slate-900 tracking-tight flex items-center gap-2">
              <Newspaper className="w-5 h-5 text-[#BF1E2D]" />
              <span>Reporting &amp; Editorial Desks</span>
            </h2>
            <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">
              Correspondents &amp; Writers
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {correspondents.map((member) => (
              <article
                key={member.slug}
                className="bg-white border border-slate-200 rounded-none overflow-hidden flex flex-col hover:border-[#BF1E2D]/40 transition-colors group shadow-2xs"
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100 relative">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#BF1E2D] block mb-1">
                    {member.role}
                  </span>
                  <h3 className="font-serif font-bold text-lg text-slate-900 group-hover:text-[#BF1E2D] transition-colors leading-snug">
                    <Link href={`/author/${member.slug}`}>
                      {member.name}
                    </Link>
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed mt-2.5 mb-4 flex-1">
                    {member.bio}
                  </p>
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs mt-auto">
                    <a
                      href={`mailto:${member.email}`}
                      className="text-slate-500 hover:text-[#BF1E2D] transition-colors flex items-center gap-1.5 font-medium"
                      title={`Email ${member.name}`}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Contact</span>
                    </a>
                    <Link
                      href={`/author/${member.slug}`}
                      className="text-[#BF1E2D] hover:underline font-semibold flex items-center gap-1"
                    >
                      <span>Articles</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* JOURNALISTIC INTEGRITY & ETHICS BANNER */}
        <section className="bg-slate-900 text-white p-8 sm:p-12 border-l-4 border-[#BF1E2D]">
          <div className="max-w-4xl">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span className="text-xs font-mono uppercase tracking-widest text-slate-300">
                Editorial Independence &amp; Ethics
              </span>
            </div>
            <h2 className="font-serif font-bold text-2xl sm:text-3xl tracking-tight text-white mb-3">
              Committed to Truth, Accuracy, and Neutrality
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6 font-sans">
              Every journalist, editor, and contributor at London BigBen Network operates under our strict Editorial Guidelines and Ethics Policy. We maintain complete editorial independence from commercial advertisers, political interest groups, and corporate influence.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/editorial-policy"
                className="inline-flex items-center gap-2 bg-[#BF1E2D] hover:bg-[#a51926] text-white text-xs sm:text-sm font-semibold px-5 py-2.5 transition-colors shadow-md"
              >
                <span>Read Our Editorial Policy</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 bg-transparent hover:bg-white/10 text-white text-xs sm:text-sm font-semibold px-5 py-2.5 border border-white/20 transition-colors"
              >
                <span>Contact the Newsroom Desk</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
