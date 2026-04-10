import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Clinic AI",
    template: "%s | Clinic AI",
  },
  description:
    "Clinic AI gives clinics a calmer front-desk operating system for inquiries, appointments, follow-up, and AI-assisted patient conversations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
          <SpeedInsights />
        </AuthProvider>
      </body>
    </html>
  );
}
