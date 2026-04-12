import { createBrowserRouter, Navigate } from "react-router";
import { LandingPage } from "./pages/LandingPage";
import { ProductPage } from "./pages/ProductPage";
import { PricingPage } from "./pages/PricingPage";
import { TrustPage } from "./pages/TrustPage";
import { FAQPage } from "./pages/FAQPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { TermsPage } from "./pages/TermsPage";
import { ContactPage } from "./pages/ContactPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { PatientChatPage } from "./pages/PatientChatPage";
import { AppLayout } from "./layouts/AppLayout";
import { DashboardPage } from "./pages/app/DashboardPage";
import { InboxPage } from "./pages/app/InboxPage";
import { InboxDetailPage } from "./pages/app/InboxDetailPage";
import { LeadsPage } from "./pages/app/LeadsPage";
import { LeadDetailPage } from "./pages/app/LeadDetailPage";
import { AppointmentsPage } from "./pages/app/AppointmentsPage";
import { CustomersPage } from "./pages/app/CustomersPage";
import { CustomerDetailPage } from "./pages/app/CustomerDetailPage";
import { OpportunitiesPage } from "./pages/app/OpportunitiesPage";
import { OperationsPage } from "./pages/app/OperationsPage";
import { ActivityPage } from "./pages/app/ActivityPage";
import { AITrainingPage } from "./pages/app/AITrainingPage";
import { BillingPage } from "./pages/app/BillingPage";
import { SettingsPage } from "./pages/app/SettingsPage";
import { AccountPage } from "./pages/app/AccountPage";
import { OnboardingPage } from "./pages/app/OnboardingPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: LandingPage,
  },
  {
    path: "/product",
    Component: ProductPage,
  },
  {
    path: "/pricing",
    Component: PricingPage,
  },
  {
    path: "/trust",
    Component: TrustPage,
  },
  {
    path: "/faq",
    Component: FAQPage,
  },
  {
    path: "/privacy",
    Component: PrivacyPage,
  },
  {
    path: "/terms",
    Component: TermsPage,
  },
  {
    path: "/contact",
    Component: ContactPage,
  },
  {
    path: "/login",
    Component: LoginPage,
  },
  {
    path: "/register",
    Component: RegisterPage,
  },
  {
    path: "/chat",
    Component: PatientChatPage,
  },
  {
    path: "/app",
    Component: AppLayout,
    children: [
      {
        index: true,
        element: <Navigate to="/app/dashboard" replace />,
      },
      {
        path: "onboarding",
        Component: OnboardingPage,
      },
      {
        path: "dashboard",
        Component: DashboardPage,
      },
      {
        path: "inbox",
        Component: InboxPage,
      },
      {
        path: "inbox/:id",
        Component: InboxDetailPage,
      },
      {
        path: "leads",
        Component: LeadsPage,
      },
      {
        path: "leads/:id",
        Component: LeadDetailPage,
      },
      {
        path: "appointments",
        Component: AppointmentsPage,
      },
      {
        path: "customers",
        Component: CustomersPage,
      },
      {
        path: "customers/:id",
        Component: CustomerDetailPage,
      },
      {
        path: "opportunities",
        Component: OpportunitiesPage,
      },
      {
        path: "operations",
        Component: OperationsPage,
      },
      {
        path: "activity",
        Component: ActivityPage,
      },
      {
        path: "ai-training",
        Component: AITrainingPage,
      },
      {
        path: "billing",
        Component: BillingPage,
      },
      {
        path: "settings",
        Component: SettingsPage,
      },
      {
        path: "account",
        Component: AccountPage,
      },
    ],
  },
]);
