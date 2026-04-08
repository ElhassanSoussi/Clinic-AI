import type { Clinic } from "@/types";

export type SystemStatus = "LIVE" | "READY" | "SETUP_INCOMPLETE" | "NOT_READY";

export interface StatusItem {
  key: string;
  label: string;
  completed: boolean;
  missing: string[];
  /** Which settings drawer section to open */
  drawerSection: string;
}

const SECTION_CHECKS: {
  key: string;
  label: string;
  drawerSection: string;
  check: (c: Clinic) => { completed: boolean; missing: string[] };
}[] = [
    {
      key: "clinic-info",
      label: "Clinic Information",
      drawerSection: "clinic-info",
      check: (c) => {
        const missing: string[] = [];
        if (!c.name) missing.push("Clinic name");
        if (!c.phone) missing.push("Phone number");
        if (!c.email) missing.push("Email address");
        if (!c.address) missing.push("Address");
        return { completed: missing.length === 0, missing };
      },
    },
    {
      key: "services",
      label: "Services",
      drawerSection: "services",
      check: (c) => {
        const hasServices = Array.isArray(c.services) && c.services.length > 0;
        return { completed: hasServices, missing: hasServices ? [] : ["At least one service"] };
      },
    },
    {
      key: "integrations",
      label: "Spreadsheet",
      drawerSection: "google-sheets",
      check: (c) => {
        const hasSpreadsheet = !!(c.google_sheet_id?.trim() || c.excel_workbook_id?.trim());
        return {
          completed: hasSpreadsheet,
          missing: hasSpreadsheet
            ? []
            : ["Connect Google Sheets or Microsoft Excel for leads and scheduling data"],
        };
      },
    },
    {
      key: "scheduling",
      label: "Scheduling",
      drawerSection: "scheduling",
      check: (c) => {
        const enabled = !!c.availability_enabled;
        return { completed: enabled, missing: enabled ? [] : ["Enable availability scheduling"] };
      },
    },
    {
      key: "embed",
      label: "Embed Widget",
      drawerSection: "embed",
      check: () => {
        // Embed is always "available" — the user just needs to copy the code.
        // We mark it completed by default since the code is always generated.
        return { completed: true, missing: [] };
      },
    },
  ];

export function computeSystemStatus(clinic: Clinic): {
  status: SystemStatus;
  items: StatusItem[];
  completedCount: number;
  totalCount: number;
} {
  const items: StatusItem[] = SECTION_CHECKS.map((s) => {
    const { completed, missing } = s.check(clinic);
    return { key: s.key, label: s.label, completed, missing, drawerSection: s.drawerSection };
  });

  const completedCount = items.filter((i) => i.completed).length;
  const totalCount = items.length;

  let status: SystemStatus;
  if (completedCount === totalCount && clinic.is_live) {
    status = "LIVE";
  } else if (completedCount === totalCount) {
    status = "READY";
  } else if (completedCount === 0) {
    status = "NOT_READY";
  } else {
    status = "SETUP_INCOMPLETE";
  }

  return { status, items, completedCount, totalCount };
}

export const STATUS_CONFIG: Record<SystemStatus, { label: string; color: string; bg: string; border: string; dot: string }> = {
  LIVE: { label: "Live", color: "text-green-700", bg: "bg-green-50", border: "border-green-200", dot: "bg-[#16A34A]" },
  READY: { label: "Ready", color: "text-teal-700", bg: "bg-teal-50", border: "border-teal-200", dot: "bg-teal-500" },
  SETUP_INCOMPLETE: { label: "Setup Incomplete", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", dot: "bg-amber-500" },
  NOT_READY: { label: "Not Ready", color: "text-red-700", bg: "bg-red-50", border: "border-red-200", dot: "bg-red-500" },
};
