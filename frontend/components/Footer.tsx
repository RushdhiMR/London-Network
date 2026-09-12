"use client";

import Link from 'next/link';
import { FaFacebook, FaInstagram, FaLinkedin } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';

export default function Footer() {
  return (
    <footer className="bg-black text-white py-16 mt-16 border-t border-zinc-900">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6">
        
        {/* LOGO SECTION */}
        <div className="mb-12">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <img
              src="/logo.png"
              alt="London BigBen Network Logo"
              className="h-9 w-9 object-contain rounded-md shadow-md group-hover:scale-105 transition-transform"
            />
            <span className="font-serif font-black tracking-tight text-2xl text-white uppercase group-hover:text-[#BF1E2D] transition-colors">
              LONDON BIGBEN
            </span>
          </Link>
        </div>

        {/* THREE COLUMNS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pb-12">
          {/* COLUMN 1: COMPANY */}
          <div>
            <h3 className="text-white text-[14px] font-bold tracking-wider mb-5 uppercase">
              COMPANY
            </h3>
            <ul className="space-y-3 text-[14px] text-white font-bold">
              <li><Link href="#" className="hover:opacity-80 transition-opacity">About Us</Link></li>
              <li><Link href="#" className="hover:opacity-80 transition-opacity">Our history</Link></li>
              <li><Link href="#" className="hover:opacity-80 transition-opacity">Meet the team</Link></li>
              <li><Link href="#" className="hover:opacity-80 transition-opacity">Editorial advisory committee</Link></li>
              <li><Link href="#" className="hover:opacity-80 transition-opacity">Privacy policy</Link></li>
              <li><Link href="#" className="hover:opacity-80 transition-opacity">Terms of use</Link></li>
              <li><Link href="/contact" className="hover:opacity-80 transition-opacity">Contact us</Link></li>
              <li><Link href="/advertise" className="hover:opacity-80 transition-opacity">Advertise with us</Link></li>
            </ul>
          </div>

          {/* COLUMN 2: WHAT WE COVER */}
          <div>
            <h3 className="text-white text-[14px] font-bold tracking-wider mb-5 uppercase">
              WHAT WE COVER
            </h3>
            <ul className="space-y-3 text-[14px] text-white font-bold">
              <li><Link href="/news" className="hover:opacity-80 transition-opacity">News</Link></li>
              <li><Link href="/business" className="hover:opacity-80 transition-opacity">Business</Link></li>
              <li><Link href="/industry-insights" className="hover:opacity-80 transition-opacity">Industry insights</Link></li>
              <li><Link href="/technology" className="hover:opacity-80 transition-opacity">Technology</Link></li>
              <li><Link href="/innovation" className="hover:opacity-80 transition-opacity">Innovation</Link></li>
              <li><Link href="/events" className="hover:opacity-80 transition-opacity">Events</Link></li>
              <li><Link href="#" className="hover:opacity-80 transition-opacity">Press releases</Link></li>
              <li><Link href="/newsletters" className="hover:opacity-80 transition-opacity">Get our newsletter</Link></li>
            </ul>
          </div>

          {/* COLUMN 3: WORK WITH US */}
          <div>
            <h3 className="text-white text-[14px] font-bold tracking-wider mb-5 uppercase">
              WORK WITH US
            </h3>
            <p className="text-[14px] text-white font-bold leading-relaxed max-w-sm">
              Reach out to talk to us about editorial partnerships, event coverage, hosted programs or other sponsorship and partnership opportunities.
            </p>
            {/* Social Icons */}
            <div className="flex items-center gap-[24px] text-[22px] mt-6 text-white">
              <Link href="#" aria-label="Facebook" className="hover:text-gray-400 transition-colors">
                <FaFacebook />
              </Link>
              <Link href="#" aria-label="Instagram" className="hover:text-gray-400 transition-colors">
                <FaInstagram />
              </Link>
              <Link href="#" aria-label="X" className="hover:text-gray-400 transition-colors">
                <FaXTwitter />
              </Link>
              <Link href="#" aria-label="LinkedIn" className="hover:text-gray-400 transition-colors">
                <FaLinkedin />
              </Link>
            </div>
          </div>
        </div>

        {/* BOTTOM ROW: COPYRIGHT */}
        <div className="border-t border-zinc-800 pt-8 text-[12px] text-zinc-500 tracking-wider">
          <p>COPYRIGHT &copy; 1998 &ndash; 2026 LONDON BIGBEN NETWORK INC. ALL RIGHTS RESERVED.</p>
        </div>

      </div>
    </footer>
  );
}
