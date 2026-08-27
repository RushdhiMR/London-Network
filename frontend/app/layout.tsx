import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "London BigBen Network",
  description: "London BigBen Network - Smart News. Real Impact.",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
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
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}