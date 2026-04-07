import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Clinic AI Front Desk",
  description:
    "AI-powered front desk assistant for clinics. Reduce missed calls, capture appointment requests, and manage patient inquiries.",
  metadataBase: new URL("https://clinicaireply.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Clinic AI Front Desk",
    description:
      "AI-powered front desk assistant for clinics. Reduce missed calls, capture appointment requests, and manage patient inquiries.",
    url: "https://clinicaireply.com",
    siteName: "Clinic AI",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.className} text-[#0F172A] antialiased`}
        suppressHydrationWarning
      >
        <AuthProvider>{children}</AuthProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
