import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  MapPin,
  Home,
  Info,
  Bell,
  X,
  Droplets,
} from "lucide-react";

interface AppSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const navigationItems = [
  {
    name: "Home",
    path: "/",
    icon: Home,
    description: "JalDrishti portal home",
  },
  {
    name: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    badge: "Live",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    description: "Groundwater monitoring overview",
  },
  {
    name: "Map",
    path: "/map",
    icon: MapPin,
    badge: "2,453 DWLR",
    badgeColor: "bg-cyan-100 text-cyan-800 border-cyan-200",
    description: "Interactive geospatial station map",
  },
  {
    name: "About",
    path: "/about",
    icon: Info,
    description: "About the JalDrishti initiative",
  },
];

const secondaryItems = [
  {
    name: "Alerts & Subscriptions",
    path: "/subscribe",
    icon: Bell,
    badge: "SMS/Email",
    badgeColor: "bg-red-100 text-red-800 border-red-200",
  },
];

export const AppSidebar: React.FC<AppSidebarProps> = ({
  isOpen = false,
  onClose,
}) => {
  const location = useLocation();

  const isCurrentActive = (path: string) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path === "/about" && (location.pathname === "/about" || location.hash === "#about")) return true;
    if (path === "/dashboard" && (location.pathname === "/dashboard" || location.pathname === "/GroundWaterDashboard")) return true;
    if (path !== "/" && (location.pathname === path || location.pathname.startsWith(`${path}/`))) {
      return true;
    }
    return false;
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white/95 backdrop-blur-md border-r border-slate-200/80 w-64 text-slate-800 shadow-sm select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/80">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 shadow-md text-white">
            <Droplets className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-black tracking-tight text-[#0A3D62] leading-tight">
              Jal<span className="text-[#0D9488]">Drishti</span>
            </div>
            <div className="text-[10px] text-slate-600 font-semibold uppercase tracking-wider">
              Navigation
            </div>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            aria-label="Close Sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <div>
          <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-600">
            Navigation Menu
          </div>
          <nav className="space-y-1">
            {navigationItems.map((item) => {
              const active = isCurrentActive(item.path);
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all no-underline ${
                    active
                      ? "bg-sky-50 text-[#0284C7] font-semibold ring-1 ring-sky-200/80 shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={`h-4 w-4 shrink-0 transition-colors ${
                        active
                          ? "text-[#0284C7]"
                          : "text-slate-600 group-hover:text-slate-700"
                      }`}
                    />
                    <span className="truncate">{item.name}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border shrink-0 ${
                        active
                          ? "bg-sky-100 text-[#0284C7] border-sky-300"
                          : item.badgeColor
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div>
          <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-600">
            System & Alerts
          </div>
          <nav className="space-y-1">
            {secondaryItems.map((item) => {
              const active = isCurrentActive(item.path);
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all no-underline ${
                    active
                      ? "bg-sky-50 text-[#0284C7] font-semibold ring-1 ring-sky-200/80 shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={`h-4 w-4 shrink-0 transition-colors ${
                        active
                          ? "text-[#0284C7]"
                          : "text-slate-600 group-hover:text-slate-700"
                      }`}
                    />
                    <span className="truncate">{item.name}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border shrink-0 ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer / Context info */}
      <div className="p-3 border-t border-slate-200/80 bg-slate-50/50">
        <div className="px-2 py-2 rounded-xl bg-blue-50/80 border border-blue-100 text-[11px] text-blue-900 leading-snug">
          <div className="font-bold flex items-center gap-1 text-[#0A3D62]">
            <span>Madhya Pradesh DWLR</span>
          </div>
          <div className="text-slate-600 mt-0.5">
            55 Districts • 2,453 Stations
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block shrink-0 sticky top-[57px] h-[calc(100vh-57px)] z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={onClose}
          />
          {/* Drawer Panel */}
          <div className="fixed inset-y-0 left-0 max-w-full flex z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};

export default AppSidebar;
