interface CalloutProps {
  type?: "info" | "warning" | "tip" | "hack";
  children: React.ReactNode;
}

const styles: Record<string, { border: string; bg: string; darkBg: string; icon: string }> = {
  info: {
    border: "border-blue-500",
    bg: "bg-blue-50",
    darkBg: "dark:bg-blue-950/40",
    icon: "ℹ️",
  },
  warning: {
    border: "border-amber-500",
    bg: "bg-amber-50",
    darkBg: "dark:bg-amber-950/40",
    icon: "⚠️",
  },
  tip: {
    border: "border-green-500",
    bg: "bg-green-50",
    darkBg: "dark:bg-green-950/40",
    icon: "💡",
  },
  hack: {
    border: "border-purple-500",
    bg: "bg-purple-50",
    darkBg: "dark:bg-purple-950/40",
    icon: "🔧",
  },
};

export function Callout({ type = "info", children }: CalloutProps) {
  const s = styles[type] || styles.info;

  return (
    <div className={`${s.border} ${s.bg} ${s.darkBg} border-l-4 rounded-r-lg p-4 my-4`}>
      <div className="flex items-start gap-2">
        <span className="text-lg leading-none mt-0.5">{s.icon}</span>
        <div className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
