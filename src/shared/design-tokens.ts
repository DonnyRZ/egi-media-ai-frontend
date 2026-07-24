export const designTokens = {
  color: {
    ink: "#111827", text: "#374151", muted: "#6B7280", canvas: "#F7F8FA", surface: "#FFFFFF",
    border: "#E5E7EB", borderStrong: "#D1D5DB", primary: "#2563EB", primaryHover: "#1D4ED8",
    primarySoft: "#EFF6FF", primaryBorder: "#BFDBFE", high: "#DC2626", highSoft: "#FEF2F2",
    medium: "#D97706", mediumSoft: "#FFFBEB", low: "#6B7280", lowSoft: "#F3F4F6",
    success: "#15803D", successSoft: "#F0FDF4", developing: "#F59E0B", monitored: "#16A36A",
  },
  typography: {
    sans: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif",
    display: "'Fraunces', Georgia, 'Times New Roman', serif",
    sizes: { xs: "0.6875rem", sm: "0.8125rem", base: "0.9375rem", lg: "1.0625rem", xl: "1.375rem", display: "2rem" },
    lineHeight: { tight: "1.2", body: "1.55", relaxed: "1.7" },
  },
  spacing: { page: "clamp(1rem, 3vw, 2.5rem)", section: "2rem", card: "1.25rem", control: "0.75rem", sidebar: "17rem", header: "6rem" },
  radius: { sm: "0.5rem", md: "0.75rem", lg: "0.875rem", pill: "999px" },
  shadow: { sm: "0 1px 2px rgba(16, 24, 40, 0.04)", md: "0 8px 24px rgba(16, 24, 40, 0.08)", drawer: "-12px 0 32px rgba(16, 24, 40, 0.12)" },
  motion: { fast: "120ms", standard: "180ms", deliberate: "240ms", easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
} as const;

export type IssuePriority = "tinggi" | "sedang" | "rendah";
export type IssueStatus = "baru" | "berkembang" | "dipantau" | "selesai";
