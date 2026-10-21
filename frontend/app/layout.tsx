import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import GlobalPageLoader from "@/components/GlobalPageLoader";

const CANONICAL_SITE_URL = "https://london-network.vercel.app";

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.FRONTEND_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "") ||
  (process.env.VERCEL_URL
    ? (process.env.VERCEL_URL.startsWith("http")
        ? process.env.VERCEL_URL
        : `https://${process.env.VERCEL_URL}`)
    : "") ||
  (process.env.NODE_ENV === "production" ? CANONICAL_SITE_URL : "http://localhost:3000");

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
        url: `${siteUrl}/og-image.png`,
        secureUrl: `${siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "London BigBen Network Logo",
        type: "image/png",
      },
      {
        url: `${siteUrl}/logo.png`,
        secureUrl: `${siteUrl}/logo.png`,
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
    images: [`${siteUrl}/og-image.png`],
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
    <html lang="en" prefix="og: http://ogp.me/ns#" className="w-full max-w-full">
      <head>
        <link rel="image_src" href={`${siteUrl}/og-image.png`} />
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,300;1,400;1,600;1,700&display=swap" rel="stylesheet" />
        {/* Development mode HMR isolation: prevents cross-tab compilation sync events from reloading other open tabs */}
        <script
          id="isolate-tab-hmr-reload"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window === 'undefined' || !window.WebSocket) return;
                var OrigWebSocket = window.WebSocket;
                var initialCompilationHash = null;
                var initialTurbopackSession = null;

                function transformEvent(e) {
                  if (typeof e.data !== 'string') return e;
                  try {
                    var msg = JSON.parse(e.data);
                    var modified = false;
                    if (msg && msg.type === 'sync' && msg.hash) {
                      if (!initialCompilationHash) {
                        initialCompilationHash = msg.hash;
                      } else if (msg.hash !== initialCompilationHash) {
                        msg.hash = initialCompilationHash;
                        modified = true;
                      }
                    }
                    if (msg && msg.type === 'turbopack-connected' && msg.data && msg.data.sessionId) {
                      if (!initialTurbopackSession) {
                        initialTurbopackSession = msg.data.sessionId;
                      } else if (msg.data.sessionId !== initialTurbopackSession) {
                        msg.data.sessionId = initialTurbopackSession;
                        modified = true;
                      }
                    }
                    if (modified) {
                      return new MessageEvent('message', {
                        data: JSON.stringify(msg),
                        origin: e.origin,
                        lastEventId: e.lastEventId,
                        source: e.source,
                        ports: e.ports
                      });
                    }
                  } catch (_) {}
                  return e;
                }

                function PatchedWebSocket(url, protocols) {
                  var ws = protocols !== undefined ? new OrigWebSocket(url, protocols) : new OrigWebSocket(url);
                  var isHmr = typeof url === 'string' && url.indexOf('/_next/webpack-hmr') !== -1;
                  if (!isHmr) return ws;

                  var originalAddEventListener = ws.addEventListener.bind(ws);
                  var listenersMap = new WeakMap();

                  ws.addEventListener = function(type, listener, options) {
                    if (type === 'message' && typeof listener === 'function') {
                      var wrapped = function(event) {
                        return listener.call(this, transformEvent(event));
                      };
                      listenersMap.set(listener, wrapped);
                      return originalAddEventListener(type, wrapped, options);
                    }
                    return originalAddEventListener(type, listener, options);
                  };

                  var originalRemoveEventListener = ws.removeEventListener.bind(ws);
                  ws.removeEventListener = function(type, listener, options) {
                    if (type === 'message' && typeof listener === 'function') {
                      var wrapped = listenersMap.get(listener) || listener;
                      return originalRemoveEventListener(type, wrapped, options);
                    }
                    return originalRemoveEventListener(type, listener, options);
                  };

                  var userOnMessage = null;
                  originalAddEventListener('message', function(event) {
                    if (userOnMessage) {
                      userOnMessage.call(ws, transformEvent(event));
                    }
                  });

                  Object.defineProperty(ws, 'onmessage', {
                    get: function() {
                      return userOnMessage;
                    },
                    set: function(fn) {
                      userOnMessage = typeof fn === 'function' ? fn : null;
                    },
                    configurable: true,
                    enumerable: true
                  });

                  return ws;
                }

                PatchedWebSocket.prototype = OrigWebSocket.prototype;
                PatchedWebSocket.CONNECTING = OrigWebSocket.CONNECTING;
                PatchedWebSocket.OPEN = OrigWebSocket.OPEN;
                PatchedWebSocket.CLOSING = OrigWebSocket.CLOSING;
                PatchedWebSocket.CLOSED = OrigWebSocket.CLOSED;
                window.WebSocket = PatchedWebSocket;
              })();
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning className="font-sans antialiased bg-white text-gray-900 w-full max-w-full overflow-x-clip">
        {/* Google Translate hidden container */}
        <div id="google_translate_element" style={{ display: "none" }} />

        {/* Early inline script: hide toolbar and keep body at top */}
        <script
          id="hide-gt-toolbar"
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