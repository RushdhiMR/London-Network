import type { Metadata, Viewport } from "next";
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
      <body className="font-sans antialiased bg-white text-gray-900 w-full max-w-full overflow-x-clip">
        <AuthProvider>
          <GlobalPageLoader>
            {children}
          </GlobalPageLoader>
        </AuthProvider>
      </body>
    </html>
  );
}