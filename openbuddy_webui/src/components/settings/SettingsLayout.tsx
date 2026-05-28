import { type ReactNode } from "react";

export function SectionHeader({
  accent,
  icon,
  title,
  subtitle,
  action,
}: {
  accent: string;
  icon: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div
        className={`w-1 self-stretch min-h-6 rounded-full shrink-0 ${accent}`}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-candy-cocoa flex items-center gap-2">
            {icon}
            {title}
          </h2>
          {action}
        </div>
        {subtitle && (
          <p className="text-[0.6875rem] text-candy-caramel mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
