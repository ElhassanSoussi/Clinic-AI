"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  LayoutDashboard,
  Shield,
  Clock,
  ArrowRight,
  Bot,
  CheckCircle2,
  Stethoscope,
  Sparkles,
  ClipboardList,
  Check,
} from "lucide-react";
import { startCheckoutForPlan, type PaidPlanId } from "@/lib/billing-checkout";

const plans = [
  {
    id: "trial",
    name: "Free Trial",
    price: "$0",
    period: "for 14 days",
    description: "Try it risk-free with your real clinic data.",
    features: [
      "AI receptionist chat",
      "Dashboard & lead management",
      "25 leads included",
      "Full setup wizard",
    ],
    cta: "Start Free Trial",
    href: "/register",
    highlighted: false,
  },
  {
    id: "professional",
    name: "Professional",
    price: "$49",
    period: "/month",
    description: "For clinics ready to capture every patient request.",
    features: [
      "AI receptionist chat",
      "Dashboard & lead management",
      "200 leads per month",
      "Google Sheets sync",
      "Email notifications",
      "Availability-guided scheduling",
    ],
    cta: "Get Started",
    href: "/register",
    highlighted: true,
    badge: "Most Popular",
  },
  {
    id: "premium",
    name: "Premium",
    price: "$99",
    period: "/month",
    description: "For high-volume clinics that need no limits.",
    features: [
      "Everything in Professional",
      "Unlimited leads",
      "Priority support",
      "Custom branding",
    ],
    cta: "Get Started",
    href: "/register",
    highlighted: false,
  },
];

export default function LandingPage() {
  const router = useRouter();
  const [checkoutLoading, setCheckoutLoading] = useState<PaidPlanId | null>(null);
  const [checkoutError, setCheckoutError] = useState("");

  const handlePaidPlanClick = async (planId: PaidPlanId) => {
    setCheckoutLoading(planId);
    setCheckoutError("");

    try {
      if (globalThis.window === undefined) {
        return;
      }

      const accessToken = globalThis.localStorage.getItem("access_token");
      if (!accessToken) {
        router.push(`/register?plan=${planId}`);
        return;
      }

      await startCheckoutForPlan(planId);
    } catch (err) {
      setCheckoutError(
        err instanceof Error ? err.message : "Failed to start checkout."
      );
      setCheckoutLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur-sm z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-lg text-slate-900">
              Clinic AI
            </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-3">
            <a
              href="#pricing"
              className="hidden sm:inline-flex px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
            >
              Pricing
            </a>
            <a
              href="#how-it-works"
              className="hidden sm:inline-flex px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
            >
              How It Works
            </a>
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 text-teal-700 text-sm font-medium mb-6">
            <Bot className="w-4 h-4" />
            For Clinics &amp; Private Practices
          </div>
          <h1 className="text-5xl font-bold text-slate-900 leading-tight mb-6 tracking-tight">
            Never miss a patient inquiry
            <br />
            <span className="text-teal-600">again.</span>
          </h1>
          <p className="text-xl text-slate-500 leading-relaxed max-w-2xl mx-auto mb-10">
            Your AI receptionist answers patient questions, captures appointment
            requests, and saves every lead — so your staff can focus on care, not
            phone calls.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-6 py-3 text-base font-medium text-white bg-teal-600 rounded-xl hover:bg-teal-700 transition-colors shadow-sm"
            >
              Start Free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/chat/demo"
              className="inline-flex items-center gap-2 px-6 py-3 text-base font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-xl hover:bg-teal-100 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Try Live Demo
            </Link>
          </div>
          <p className="text-sm text-slate-400 mt-6">
            No credit card required &middot; Set up in minutes
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-4">
            Everything your front desk needs
          </h2>
          <p className="text-lg text-slate-500 text-center mb-14 max-w-2xl mx-auto">
            A smarter way to handle patient communication, built specifically
            for clinics.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <MessageSquare className="w-6 h-6" />,
                title: "AI Chat Assistant",
                desc: "Answers FAQs, collects appointment requests, and captures patient details automatically.",
              },
              {
                icon: <LayoutDashboard className="w-6 h-6" />,
                title: "Lead Dashboard",
                desc: "View, manage, and track every patient request in one place. No leads slip through.",
              },
              {
                icon: <Shield className="w-6 h-6" />,
                title: "Clinic-Safe AI",
                desc: "No medical advice, no made-up policies. Only answers based on your clinic\u2019s real information.",
              },
              {
                icon: <Clock className="w-6 h-6" />,
                title: "24/7 Availability",
                desc: "Capture appointment requests even after hours. Patients can reach you anytime.",
              },
              {
                icon: <CheckCircle2 className="w-6 h-6" />,
                title: "Easy Setup",
                desc: "Add your clinic details, services, and hours. Your AI assistant is ready in minutes.",
              },
              {
                icon: <Bot className="w-6 h-6" />,
                title: "Conversational Intake",
                desc: "The booking flow collects name, phone, reason for visit, and preferred time — all through natural conversation.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="p-6 bg-white rounded-2xl border border-slate-100 hover:shadow-md transition-shadow"
              >
                <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">
                  {f.title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* See It In Action — product visual cards */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-4">
            See what you get
          </h2>
          <p className="text-lg text-slate-500 text-center mb-14 max-w-2xl mx-auto">
            A complete system for capturing and managing patient requests — no extra tools needed.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Card 1: AI Chat */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <div className="bg-teal-600 px-5 py-3 flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                  <MessageSquare className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm font-medium text-white">Bright Smile Assistant</span>
                <span className="ml-auto flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[11px] text-white/60">Online</span>
                </span>
              </div>
              <div className="bg-slate-50 px-5 py-6 space-y-3">
                <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-[13px] text-slate-700 max-w-[85%]">
                  Hi! I can help you book an appointment. What brings you in today?
                </div>
                <div className="flex justify-end">
                  <div className="bg-teal-600 text-white rounded-2xl rounded-br-sm px-3.5 py-2.5 text-[13px] max-w-[75%]">
                    I need a teeth cleaning
                  </div>
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-[13px] text-slate-700 max-w-[85%]">
                  Great! When works best for you?
                </div>
              </div>
              <div className="bg-white border-t border-slate-100 px-4 py-3">
                <p className="text-xs font-medium text-slate-900 mb-1">AI Chat Widget</p>
                <p className="text-xs text-slate-500 leading-relaxed">Patients chat 24/7. The assistant collects their info conversationally.</p>
              </div>
            </div>

            {/* Card 2: Lead Dashboard */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <div className="bg-white px-5 py-3 border-b border-slate-100">
                <span className="text-sm font-medium text-slate-900">Patient Requests</span>
                <span className="ml-2 text-xs text-slate-400">10 total</span>
              </div>
              <div className="bg-white px-4 py-3 space-y-2.5">
                {[
                  { name: "Maria Santos", reason: "Teeth cleaning", status: "Booked", statusColor: "text-emerald-700 bg-emerald-50" },
                  { name: "James O'Brien", reason: "Chipped tooth", status: "Booked", statusColor: "text-emerald-700 bg-emerald-50" },
                  { name: "Priya Patel", reason: "Whitening consult", status: "Contacted", statusColor: "text-amber-700 bg-amber-50" },
                  { name: "Sarah Mitchell", reason: "Molar sensitivity", status: "New", statusColor: "text-blue-700 bg-blue-50" },
                ].map((lead) => (
                  <div key={lead.name} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-slate-900 truncate">{lead.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{lead.reason}</p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${lead.statusColor}`}>
                      {lead.status}
                    </span>
                  </div>
                ))}
              </div>
              <div className="bg-white border-t border-slate-100 px-4 py-3">
                <p className="text-xs font-medium text-slate-900 mb-1">Lead Dashboard</p>
                <p className="text-xs text-slate-500 leading-relaxed">Every request in one place. Filter, update status, and follow up.</p>
              </div>
            </div>

            {/* Card 3: Setup / Settings */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <div className="bg-white px-5 py-3 border-b border-slate-100">
                <span className="text-sm font-medium text-slate-900">Clinic Settings</span>
              </div>
              <div className="bg-white px-4 py-4 space-y-3">
                <div>
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1">Services</p>
                  <div className="flex flex-wrap gap-1.5">
                    {["Cleaning", "Whitening", "Emergency", "Exams"].map((s) => (
                      <span key={s} className="text-[11px] font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">{s}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1">Hours</p>
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-[11px]"><span className="text-slate-600">Mon–Fri</span><span className="text-slate-400">8 AM – 6 PM</span></div>
                    <div className="flex justify-between text-[11px]"><span className="text-slate-600">Saturday</span><span className="text-slate-400">9 AM – 2 PM</span></div>
                    <div className="flex justify-between text-[11px]"><span className="text-slate-600">Sunday</span><span className="text-slate-400">Closed</span></div>
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1">Notifications</p>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-4.5 rounded-full bg-teal-600 relative">
                      <div className="absolute right-0.5 top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-sm" />
                    </div>
                    <span className="text-[11px] text-slate-600">Email alerts on</span>
                  </div>
                </div>
              </div>
              <div className="bg-white border-t border-slate-100 px-4 py-3">
                <p className="text-xs font-medium text-slate-900 mb-1">Quick Setup</p>
                <p className="text-xs text-slate-500 leading-relaxed">Add your info once. The assistant uses it to answer accurately.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What Happens — patient journey */}
      <section id="how-it-works" className="py-20 px-6 bg-slate-50 scroll-mt-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-4">
            What happens when a patient reaches out
          </h2>
          <p className="text-lg text-slate-500 text-center mb-14 max-w-xl mx-auto">
            From first message to booked appointment — in minutes.
          </p>
          <div className="relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-10 left-[16.67%] right-[16.67%] h-0.5 bg-slate-200" />
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  num: "1",
                  icon: <MessageSquare className="w-6 h-6" />,
                  title: "Patient opens chat",
                  desc: "A patient visits your site and starts a conversation with your AI assistant — any time, day or night.",
                },
                {
                  num: "2",
                  icon: <Bot className="w-6 h-6" />,
                  title: "Assistant collects the request",
                  desc: "The assistant answers their question, then collects their name, phone, reason for visit, and preferred time.",
                },
                {
                  num: "3",
                  icon: <LayoutDashboard className="w-6 h-6" />,
                  title: "You review and follow up",
                  desc: "The request appears on your dashboard. You confirm the appointment and the patient gets seen.",
                },
              ].map((s) => (
                <div key={s.num} className="text-center relative">
                  <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 text-teal-600 flex items-center justify-center mx-auto mb-5 shadow-sm">
                    {s.icon}
                  </div>
                  <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-teal-50 text-xs font-bold text-teal-700 mb-3">
                    {s.num}
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-2">
                    {s.title}
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Who It's For */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-4">
            Built for clinics like yours
          </h2>
          <p className="text-lg text-slate-500 text-center mb-14 max-w-2xl mx-auto">
            Whether you run a solo practice or a multi-provider office, Clinic AI fits your workflow.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-14">
            {[
              { icon: <Stethoscope className="w-5 h-5" />, label: "Private Practices" },
              { icon: <Sparkles className="w-5 h-5" />, label: "Med Spas" },
              { icon: <Shield className="w-5 h-5" />, label: "Dental Clinics" },
              { icon: <ClipboardList className="w-5 h-5" />, label: "Local Healthcare Offices" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-100"
              >
                <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                  {item.icon}
                </div>
                <span className="text-sm font-medium text-slate-900">{item.label}</span>
              </div>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {[
              "Never miss a patient inquiry — even after hours",
              "No medical advice, no made-up answers",
              "Collect appointment requests 24/7",
              "Organize every lead in one dashboard",
            ].map((b) => (
              <div key={b} className="flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                <span className="text-sm text-slate-700">{b}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6 scroll-mt-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-lg text-slate-500 text-center mb-14 max-w-xl mx-auto">
            Start free, upgrade when you&apos;re ready. No surprises.
          </p>
          {checkoutError && (
            <div className="max-w-xl mx-auto mb-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {checkoutError}
            </div>
          )}
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-2xl border p-8 flex flex-col ${
                  plan.highlighted
                    ? "border-teal-300 bg-white shadow-lg ring-1 ring-teal-200"
                    : "border-slate-200 bg-white"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-teal-600 text-white">
                      {plan.badge}
                    </span>
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-slate-500">{plan.description}</p>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-slate-900">
                    {plan.price}
                  </span>
                  <span className="text-sm text-slate-500 ml-1">
                    {plan.period}
                  </span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                      <span className="text-sm text-slate-700">{f}</span>
                    </li>
                  ))}
                </ul>
                {plan.id === "trial" ? (
                  <Link
                    href={
                      plan.id === "trial" ? plan.href : `/register?plan=${plan.id}`
                    }
                    className={`block text-center px-5 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                      plan.highlighted
                        ? "text-white bg-teal-600 hover:bg-teal-700"
                        : "text-teal-700 bg-teal-50 border border-teal-200 hover:bg-teal-100"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => handlePaidPlanClick(plan.id as PaidPlanId)}
                    disabled={checkoutLoading !== null}
                    className={`block w-full text-center px-5 py-2.5 text-sm font-medium rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${
                      plan.highlighted
                        ? "text-white bg-teal-600 hover:bg-teal-700"
                        : "text-teal-700 bg-teal-50 border border-teal-200 hover:bg-teal-100"
                    }`}
                  >
                    {checkoutLoading === plan.id ? "Starting checkout..." : plan.cta}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">
            Stop losing patients to missed calls
          </h2>
          <p className="text-lg text-slate-500 mb-8">
            Start capturing every inquiry — even after hours.
          </p>
          <div className="flex items-center justify-center gap-4 mb-6">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-6 py-3 text-base font-medium text-white bg-teal-600 rounded-xl hover:bg-teal-700 transition-colors shadow-sm"
            >
              Start Free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/chat/demo"
              className="inline-flex items-center gap-2 px-6 py-3 text-base font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-xl hover:bg-teal-100 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Try Live Demo
            </Link>
          </div>
          <p className="text-sm text-slate-400">
            No credit card required &middot; Set up in minutes &middot; Cancel anytime
          </p>
        </div>
      </section>

      {/* Trust Signals */}
      <section className="py-10 px-6 border-t border-slate-100">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-slate-500">
          <span className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-teal-600" />
            No medical advice — intake only
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
            Uses only your clinic&apos;s real data
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-teal-600" />
            Cancel anytime
          </span>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-teal-600 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-medium text-slate-600">
              Clinic AI
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-500">
            <Link href="/privacy" className="hover:text-slate-700 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-slate-700 transition-colors">Terms</Link>
            <Link href="/contact" className="hover:text-slate-700 transition-colors">Contact</Link>
          </div>
          <p className="text-sm text-slate-400">
            &copy; {new Date().getFullYear()} Clinic AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
