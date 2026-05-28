import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MappedIcon } from "@/lib/icons";
import { MotionBuddy } from "./MotionBuddy";

const PAGE_COLORS: Record<string, string> = {
  "/chat": "#FFD93D",
  "/room": "#7BC67E",
  "/sticker-book": "#BA8FDB",
  "/settings": "#FFA502",
};

const navItems = [
  { to: "/chat", iconName: "nav-chat", labelKey: "sidebar.chat" },
  { to: "/room", iconName: "nav-room", labelKey: "sidebar.room" },
  { to: "/sticker-book", iconName: "nav-stickers", labelKey: "sidebar.stickers" },
];

function SidebarItem({ to, iconName, labelKey }: { to: string; iconName: string; labelKey: string }) {
  const { t } = useTranslation();
  const color = PAGE_COLORS[to] || "#FFD93D";

  return (
    <NavLink to={to} className="relative w-full flex justify-center">
      {({ isActive }) => (
        <>
          {isActive && (
            <div
              className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full transition-all"
              style={{ backgroundColor: color }}
            />
          )}
          <div className="flex flex-col items-center gap-0.5">
            <div
              className={`w-10 h-10 xl:w-12 xl:h-12 flex items-center justify-center rounded-xl transition-all ${
                isActive
                  ? "bg-white shadow-candy-float"
                  : "opacity-80 hover:opacity-100"
              }`}
            >
              <MappedIcon name={iconName} width={20} className="xl:!w-6 xl:!h-6" />
            </div>
            <span className={`text-[0.6875rem] font-semibold ${isActive ? "text-candy-cocoa" : "text-candy-cocoa/70"}`}>
              {t(labelKey)}
            </span>
          </div>
        </>
      )}
    </NavLink>
  );
}

export function Sidebar() {
  return (
    <nav className="w-16 xl:w-20 2xl:w-24 bg-[#FFFDF7] flex flex-col items-center py-3 xl:py-4 gap-1.5 xl:gap-2 shrink-0 relative">
      <MotionBuddy />

      <div className="flex flex-col gap-1 items-center w-full">
        {navItems.map(({ to, iconName, labelKey }) => (
          <SidebarItem key={to} to={to} iconName={iconName} labelKey={labelKey} />
        ))}
      </div>

      <div className="mt-auto w-full">
        <SidebarItem to="/settings" iconName="nav-settings" labelKey="sidebar.settings" />
      </div>

      <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-candy-border/50 to-transparent" />
    </nav>
  );
}
