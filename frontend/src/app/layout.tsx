import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { Analytics } from "@vercel/analytics/next";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
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
        className={`${manrope.className} text-slate-900 antialiased`}
        suppressHydrationWarning
      >
        <AuthProvider>{children}</AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
