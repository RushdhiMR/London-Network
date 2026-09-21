import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import GlobalPageLoader from "@/components/GlobalPageLoader";

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.FRONTEND_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "") ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
  "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "London BigBen Network - Smart News. Real Impact.",
    template: "%s | London BigBen Network",
  },
  description:
    "London BigBen Network - Smart News. Real Impact. Global news, financial analysis, technology insights, and editorial reporting.",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
  openGraph: {
    title: "London BigBen Network - Smart News. Real Impact.",
    description:
      "London BigBen Network - Smart News. Real Impact. Global news, financial analysis, technology insights, and editorial reporting.",
    url: siteUrl,
    siteName: "London BigBen Network",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "London BigBen Network Logo",
        type: "image/png",
      },
      {
        url: "/logo.png",
        width: 600,
        height: 600,
        alt: "London BigBen Network",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "London BigBen Network - Smart News. Real Impact.",
    description:
      "London BigBen Network - Smart News. Real Impact. Global news, financial analysis, technology insights, and editorial reporting.",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="w-full max-w-full">
      <head>
        {/* Comprehensive Google Translate toolbar suppressor - CSS */}
        <style>{`
          body > .skiptranslate:not(#google_translate_element),
          [class*="VIpgJd"],
          [id*=".container"],
          iframe.skiptranslate,
          iframe.goog-te-banner-frame,
          .goog-te-banner-frame,
          .goog-te-banner-frame.skiptranslate,
          #goog-gt-tt {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            max-height: 0 !important;
            opacity: 0 !important;
            pointer-events: none !important;
            border: none !important;
          }
          body,
          body.translated-ltr,
          body.translated-rtl {
            top: 0px !important;
            position: static !important;
          }
          .goog-te-gadget { display: none !important; }
          .goog-tooltip, .goog-tooltip:hover { display: none !important; }
          .goog-text-highlight { background-color: transparent !important; box-shadow: none !important; }
        `}</style>
      </head>
      <body suppressHydrationWarning className="font-sans antialiased bg-white text-gray-900 w-full max-w-full overflow-x-clip">
        {/* Google Translate hidden container */}
        <div id="google_translate_element" style={{ display: "none" }} />

        {/* Early inline script: hide toolbar and keep body at top */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function _hideGT() {
                  var els = document.querySelectorAll('body > .skiptranslate:not(#google_translate_element), [class*="VIpgJd"], [id*=".container"], iframe.skiptranslate, iframe.goog-te-banner-frame, .goog-te-banner-frame, #goog-gt-tt');
                  for (var i = 0; i < els.length; i++) {
                    els[i].style.setProperty('display', 'none', 'important');
                    els[i].style.setProperty('visibility', 'hidden', 'important');
                    els[i].style.setProperty('height', '0', 'important');
                  }
                  if (document.body) {
                    if (document.body.style.top && document.body.style.top !== '0px') {
                      document.body.style.setProperty('top', '0px', 'important');
                    }
                  }
                }
                var _obs = new MutationObserver(_hideGT);
                _obs.observe(document.documentElement, { childList: true, subtree: true });
                document.addEventListener('DOMContentLoaded', function() {
                  _hideGT();
                  var _bObs = new MutationObserver(_hideGT);
                  _bObs.observe(document.body, { attributes: true, attributeFilter: ['style'] });
                });
                window.addEventListener('load', _hideGT);
                setInterval(_hideGT, 200);
              })();
            `,
          }}
        />

        {/* Google Translate init */}
        <Script
          id="google-translate-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              function googleTranslateElementInit() {
                new google.translate.TranslateElement(
                  { pageLanguage: 'en', autoDisplay: false },
                  'google_translate_element'
                );
              }
            `,
          }}
        />
        <Script
          src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
          strategy="afterInteractive"
        />
        <AuthProvider>
          <GlobalPageLoader>
            {children}
          </GlobalPageLoader>
        </AuthProvider>
      </body>
    </html>
  );
}