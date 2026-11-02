import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, User, Menu, X, LogOut, Bell, PanelLeft, LayoutDashboard, TrendingUp, History, MapPin, Building2 } from "lucide-react";
import { LanguageSelector } from "@/components/language-selector";
import { ThemeToggle } from "@/components/theme-toggle";

interface HeaderProps {
  onToggleSidebar?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      const u = localStorage.getItem("jaldrishti_user");
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const checkUser = () => {
      try {
        const u = localStorage.getItem("jaldrishti_user");
        setCurrentUser(u ? JSON.parse(u) : null);
      } catch {
        setCurrentUser(null);
      }
    };
    window.addEventListener("auth-changed", checkUser);
    window.addEventListener("storage", checkUser);
    return () => {
      window.removeEventListener("auth-changed", checkUser);
      window.removeEventListener("storage", checkUser);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("jaldrishti_token");
    localStorage.removeItem("jaldrishti_user");
    setCurrentUser(null);
    window.dispatchEvent(new Event("auth-changed"));
    navigate("/login");
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/dashboard?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  const isActive = (path: string) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path === "/about" && (location.pathname === "/about" || location.hash === "#about")) return true;
    if (path === "/dashboard" && (location.pathname === "/dashboard" || location.pathname === "/GroundWaterDashboard")) return true;
    if (path !== "/" && (location.pathname === path || location.pathname.startsWith(`${path}/`))) return true;
    return false;
  };

  return (
    <header className="bg-white/95 backdrop-blur-sm text-slate-800 border-b border-slate-200/80 sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 py-2.5">
        {/* Left side: Sidebar Toggle & Brand */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              title="Toggle navigation sidebar"
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Toggle Navigation Sidebar"
            >
              <PanelLeft className="h-5 w-5" />
            </button>
          )}

          {/* Brand / Logo */}
          <Link to="/" className="flex flex-col no-underline group shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="text-2xl font-black tracking-tight text-[#0A3D62]">
                Jal<span className="text-[#0D9488]">Drishti</span>
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-medium tracking-tight -mt-0.5 hidden sm:inline-block">
              Groundwater Monitoring for a Sustainable Tomorrow
            </span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2 text-sm font-medium">
          <Link
            to="/"
            className={`px-3 py-1.5 rounded-lg transition-colors no-underline ${
              isActive("/")
                ? "bg-sky-100 text-[#0284C7] font-semibold"
                : "text-slate-700 hover:text-slate-900 hover:bg-slate-100/70"
            }`}
          >
            Home
          </Link>

          <Link
            to="/dashboard"
            className={`px-3 py-1.5 rounded-lg transition-colors no-underline ${
              isActive("/dashboard")
                ? "bg-sky-100 text-[#0284C7] font-semibold"
                : "text-slate-700 hover:text-slate-900 hover:bg-slate-100/70"
            }`}
          >
            Dashboard
          </Link>

          <Link
            to="/map"
            className={`px-3 py-1.5 rounded-lg transition-colors no-underline ${
              isActive("/map")
                ? "bg-sky-100 text-[#0284C7] font-semibold"
                : "text-slate-700 hover:text-slate-900 hover:bg-slate-100/70"
            }`}
          >
            Map
          </Link>

          <Link
            to="/about"
            className={`px-3 py-1.5 rounded-lg transition-colors no-underline ${
              isActive("/about")
                ? "bg-sky-100 text-[#0284C7] font-semibold"
                : "text-slate-700 hover:text-slate-900 hover:bg-slate-100/70"
            }`}
          >
            About
          </Link>

          <Link
            to="/subscribe"
            className={`px-3 py-1.5 rounded-lg transition-colors no-underline flex items-center gap-1 ${
              isActive("/subscribe")
                ? "bg-sky-100 text-[#0284C7] font-semibold"
                : "text-slate-700 hover:text-slate-900 hover:bg-slate-100/70"
            }`}
          >
            <Bell className="h-3.5 w-3.5 text-amber-500" />
            Alerts
          </Link>
        </nav>

        {/* Right side: Search, Language, User/Login */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="relative hidden md:block">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search station or district..."
              className="w-48 lg:w-56 pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-full text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-all"
            />
          </form>

          {/* Language Selector */}
          <div className="hidden sm:block">
            <LanguageSelector />
          </div>

          {/* User Profile or Login Button */}
          {currentUser ? (
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                {currentUser.name}
              </span>
              <button
                onClick={handleLogout}
                title="Sign out"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-600 text-xs font-semibold border border-slate-200 hover:border-red-200 transition-all cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#0A4B8F] hover:bg-[#083c73] text-white text-xs font-semibold shadow-sm transition-all no-underline shrink-0"
            >
              <User className="h-3.5 w-3.5" />
              <span>Login</span>
            </Link>
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-2 animate-fadeIn">
          <form onSubmit={handleSearchSubmit} className="relative mb-2">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search station or district..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </form>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-3 py-2 rounded-lg font-semibold no-underline ${
                isActive("/") ? "bg-sky-50 text-sky-800" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              Home
            </Link>
            <Link
              to="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-3 py-2 rounded-lg font-semibold no-underline ${
                isActive("/dashboard") ? "bg-sky-50 text-sky-800" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              Dashboard
            </Link>
            <Link
              to="/map"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-3 py-2 rounded-lg font-semibold no-underline ${
                isActive("/map") ? "bg-sky-50 text-sky-800" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              Map
            </Link>
            <Link
              to="/about"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-3 py-2 rounded-lg font-semibold no-underline ${
                isActive("/about") ? "bg-sky-50 text-sky-800" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              About
            </Link>
            <Link
              to="/subscribe"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-3 py-2 rounded-lg font-semibold no-underline ${
                isActive("/subscribe") ? "bg-sky-50 text-sky-800" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              Alerts
            </Link>
            {currentUser ? (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 font-medium text-left cursor-pointer"
              >
                Logout ({currentUser.name})
              </button>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-sky-700 hover:bg-sky-50 font-semibold no-underline"
              >
                Sign In / Register
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
