import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "@/components/ui/header";
import Footer from "@/components/ui/footer";
import {
  Bell,
  MessageSquare,
  Mail,
  Smartphone,
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  ArrowRight,
  UserCheck,
  LogIn,
  LogOut,
  ShieldCheck,
  Send,
} from "lucide-react";
import { subscribeAlerts, SubscribePayload } from "@/services/api";

interface FormData {
  name: string;
  email: string;
  phone: string;
  preferredChannel: "sms" | "email" | "both";
}

interface NotificationStatus {
  email_status?: string;
  sms_status?: string;
}

interface LoggedInUser {
  id?: number;
  name: string;
  email: string;
  created_at?: string;
}

const AlertSubscription: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<LoggedInUser | null>(null);

  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    preferredChannel: "both",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notificationStatus, setNotificationStatus] = useState<NotificationStatus | null>(null);
  const [lastSubscribedEmail, setLastSubscribedEmail] = useState<string>("");

  // Check login state on mount and listen for auth events
  useEffect(() => {
    const checkUserAuth = () => {
      try {
        const stored = localStorage.getItem("jaldrishti_user");
        if (stored) {
          const parsed = JSON.parse(stored);
          setCurrentUser(parsed);
          setFormData((prev) => ({
            ...prev,
            name: prev.name || parsed.name || "",
            email: prev.email || parsed.email || "",
          }));
        } else {
          setCurrentUser(null);
        }
      } catch (e) {
        console.error("Error reading stored user:", e);
        setCurrentUser(null);
      }
    };

    checkUserAuth();
    window.addEventListener("auth-changed", checkUserAuth);
    window.addEventListener("storage", checkUserAuth);
    return () => {
      window.removeEventListener("auth-changed", checkUserAuth);
      window.removeEventListener("storage", checkUserAuth);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("jaldrishti_token");
    localStorage.removeItem("jaldrishti_user");
    setCurrentUser(null);
    window.dispatchEvent(new Event("auth-changed"));
  };

  const handleUseMyDetails = () => {
    if (currentUser) {
      setFormData((prev) => ({
        ...prev,
        name: currentUser.name || "",
        email: currentUser.email || "",
      }));
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setNotificationStatus(null);

    // Validation
    const trimmedName = formData.name.trim();
    const trimmedEmail = formData.email.trim().toLowerCase();
    const trimmedPhone = formData.phone.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setError("Please enter your full name (at least 2 characters).");
      return;
    }

    if (
      (formData.preferredChannel === "email" || formData.preferredChannel === "both") &&
      (!trimmedEmail || !trimmedEmail.includes("@"))
    ) {
      setError("A valid email address is required to receive groundwater alerts.");
      return;
    }

    if (
      (formData.preferredChannel === "sms" || formData.preferredChannel === "both") &&
      (!trimmedPhone || trimmedPhone.length < 8)
    ) {
      setError("A valid phone number is required for SMS alerts.");
      return;
    }

    setLoading(true);

    try {
      const payload: SubscribePayload = {
        name: trimmedName,
        email: trimmedEmail || undefined,
        phone: trimmedPhone || undefined,
        preferredChannel: formData.preferredChannel,
      };

      const res = await subscribeAlerts(payload);
      if (res.ok) {
        setLastSubscribedEmail(trimmedEmail);
        setMessage(res.message || "Alert preferences registered successfully!");
        setNotificationStatus({
          email_status: res.email_status,
          sms_status: res.sms_status,
        });

        // If user is not logged in, reset fields. If logged in, keep their credentials populated.
        if (!currentUser) {
          setFormData({
            name: "",
            email: "",
            phone: "",
            preferredChannel: "both",
          });
        }
      } else {
        setError(res.message || "Subscription failed. Please verify your details.");
      }
    } catch (err: any) {
      console.error("Subscription error:", err);
      setError(err.message || "Error connecting to server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-4 sm:p-6 pt-28 pb-16">
        <div className="w-full max-w-lg">
          {/* Main subscription card */}
          <div className="rounded-3xl bg-white/95 backdrop-blur-sm shadow-2xl p-6 sm:p-8 ring-1 ring-blue-200/50 border border-blue-100">
            {/* Header section */}
            <div className="text-center mb-6">
              <div className="mx-auto mb-3.5 w-16 h-16 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 flex items-center justify-center shadow-lg">
                <Bell className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-[#0A3D62] via-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Groundwater Alert Subscription
              </h2>
              <p className="text-slate-600 mt-1.5 text-sm font-medium">
                Real-time critical depletion alerts across 55 MP districts &amp; 2,453 DWLR stations
              </p>
            </div>

            {/* Account Status / Login Section */}
            {currentUser ? (
              <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-blue-50 via-sky-50 to-cyan-50 border border-blue-200 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white flex items-center justify-center font-bold text-base shadow">
                      {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{currentUser.name}</span>
                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 ring-emerald-300">
                          <ShieldCheck className="h-3 w-3" /> Signed In
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium">{currentUser.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <button
                      type="button"
                      onClick={handleUseMyDetails}
                      className="text-[11px] text-blue-700 hover:text-blue-900 font-semibold underline cursor-pointer"
                    >
                      Fill My Info
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="text-[11px] text-slate-500 hover:text-red-600 font-medium cursor-pointer"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50/40 to-blue-50 border border-amber-200/80 shadow-sm flex items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <UserCheck className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Have a JalDrishti account?
                    </p>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                      Sign in to link alerts directly with your profile &amp; auto-fill your email.
                    </p>
                  </div>
                </div>
                <Link
                  to="/login?redirect=/subscribe"
                  className="shrink-0 inline-flex items-center gap-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow transition-all hover:scale-105"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  Sign In
                </Link>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name field */}
              <div>
                <label className="block text-slate-700 text-sm font-semibold mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Ramesh Sharma"
                  disabled={loading}
                  className="w-full px-4 bg-white/90 border border-blue-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 shadow-sm rounded-xl py-2.5 ring-1 ring-blue-100/50 h-11 text-sm transition-colors outline-none"
                />
              </div>

              {/* Email field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-slate-700 text-sm font-semibold">
                    Email Address{" "}
                    {(formData.preferredChannel === "email" || formData.preferredChannel === "both") && (
                      <span className="text-red-500">*</span>
                    )}
                  </label>
                  {currentUser && formData.email === currentUser.email && (
                    <span className="text-[11px] text-emerald-600 font-medium">✓ Using account email</span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="email"
                    name="email"
                    required={formData.preferredChannel === "email" || formData.preferredChannel === "both"}
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    disabled={loading}
                    className="w-full pl-10 pr-4 bg-white/90 border border-blue-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 shadow-sm rounded-xl py-2.5 ring-1 ring-blue-100/50 h-11 text-sm transition-colors outline-none"
                  />
                  <Mail className="h-4 w-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Confirmation mail and critical telemetry alerts will be sent here.
                </p>
              </div>

              {/* Phone field */}
              <div>
                <label className="block text-slate-700 text-sm font-semibold mb-1.5">
                  Phone Number (Optional for SMS){" "}
                  {formData.preferredChannel === "sms" && <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    name="phone"
                    required={formData.preferredChannel === "sms"}
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+91 98765 43210"
                    disabled={loading}
                    className="w-full pl-10 pr-4 bg-white/90 border border-blue-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 shadow-sm rounded-xl py-2.5 ring-1 ring-blue-100/50 h-11 text-sm transition-colors outline-none"
                  />
                  <Smartphone className="h-4 w-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                </div>
              </div>

              {/* Preferred channel */}
              <div>
                <label className="block text-slate-700 text-sm font-semibold mb-2">
                  Alert Channel
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  <label className="relative cursor-pointer">
                    <input
                      type="radio"
                      name="preferredChannel"
                      value="both"
                      checked={formData.preferredChannel === "both"}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <div
                      className={`p-3 rounded-xl text-center transition-all ring-1 ${
                        formData.preferredChannel === "both"
                          ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md ring-blue-400 font-semibold"
                          : "bg-slate-50 text-slate-700 hover:bg-blue-50 ring-slate-200 font-medium"
                      }`}
                    >
                      <MessageSquare className="h-4 w-4 mx-auto mb-1" />
                      <span className="text-xs">Email &amp; SMS</span>
                    </div>
                  </label>
                  <label className="relative cursor-pointer">
                    <input
                      type="radio"
                      name="preferredChannel"
                      value="email"
                      checked={formData.preferredChannel === "email"}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <div
                      className={`p-3 rounded-xl text-center transition-all ring-1 ${
                        formData.preferredChannel === "email"
                          ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md ring-blue-400 font-semibold"
                          : "bg-slate-50 text-slate-700 hover:bg-blue-50 ring-slate-200 font-medium"
                      }`}
                    >
                      <Mail className="h-4 w-4 mx-auto mb-1" />
                      <span className="text-xs">Email Only</span>
                    </div>
                  </label>
                  <label className="relative cursor-pointer">
                    <input
                      type="radio"
                      name="preferredChannel"
                      value="sms"
                      checked={formData.preferredChannel === "sms"}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <div
                      className={`p-3 rounded-xl text-center transition-all ring-1 ${
                        formData.preferredChannel === "sms"
                          ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md ring-blue-400 font-semibold"
                          : "bg-slate-50 text-slate-700 hover:bg-blue-50 ring-slate-200 font-medium"
                      }`}
                    >
                      <Smartphone className="h-4 w-4 mx-auto mb-1" />
                      <span className="text-xs">SMS Only</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-gradient-to-r from-[#0A3D62] via-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg font-bold py-3 rounded-xl transition-all duration-300 hover:shadow-xl hover:scale-[1.01] text-base disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Saving &amp; Sending Confirmation...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Subscribe to Groundwater Alerts
                  </>
                )}
              </button>
            </form>

            {/* Success message / confirmation */}
            {message && (
              <div className="mt-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-300 ring-1 ring-emerald-200 space-y-3">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-emerald-900">
                      Successfully Subscribed! 🎉
                    </h4>
                    <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
                      {message}
                    </p>
                  </div>
                </div>

                {/* Email dispatch feedback */}
                {notificationStatus?.email_status && (
                  <div className="p-3 rounded-xl bg-white/80 border border-emerald-200 text-xs text-slate-700 space-y-1">
                    {notificationStatus.email_status === "sent" ? (
                      <div className="flex items-start gap-2">
                        <Mail className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-emerald-800">Confirmation Email Dispatched:</strong>
                          <p className="text-slate-600 mt-0.5">
                            A welcome email has been sent to{" "}
                            <span className="font-semibold text-slate-900">{lastSubscribedEmail}</span>.
                            Please check your inbox (or spam folder) for confirmation details.
                          </p>
                        </div>
                      </div>
                    ) : notificationStatus.email_status === "not_configured" ? (
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-slate-800">Database Record Activated:</strong>
                          <p className="text-slate-600 mt-0.5">
                            Your alert subscription is stored and active in the database.
                            To enable live email delivery to inboxes, add your Gmail App Password / SMTP credentials in{" "}
                            <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono text-[11px]">backend/.env</code>.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-amber-800">Email Gateway Status:</strong>
                          <p className="text-slate-600 mt-0.5">{notificationStatus.email_status}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Error banner */}
            {error && (
              <div className="mt-6 p-4 rounded-2xl bg-red-50 border border-red-200 ring-1 ring-red-100 flex items-start gap-2.5">
                <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 font-medium leading-relaxed">{error}</p>
              </div>
            )}

            {/* Quick links */}
            <div className="mt-6 pt-4 border-t border-slate-100 text-center space-y-2">
              {!currentUser && (
                <p className="text-slate-600 text-xs">
                  Already have an account?{" "}
                  <Link
                    to="/login?redirect=/subscribe"
                    className="text-blue-600 hover:text-cyan-600 underline font-semibold"
                  >
                    Sign In
                  </Link>{" "}
                  or{" "}
                  <Link
                    to="/signup?redirect=/subscribe"
                    className="text-blue-600 hover:text-cyan-600 underline font-semibold"
                  >
                    Create Account
                  </Link>
                </p>
              )}
              <p className="text-slate-600 text-xs">
                Explore station telemetry &amp; LSTM forecasts?{" "}
                <Link
                  to="/dashboard"
                  className="text-blue-600 hover:text-cyan-600 font-semibold inline-flex items-center gap-1"
                >
                  View Dashboard <ArrowRight className="h-3 w-3" />
                </Link>
              </p>
            </div>
          </div>

          {/* Reference thresholds card */}
          <div className="mt-5 rounded-2xl bg-white/90 p-5 shadow-md ring-1 ring-blue-100 border border-blue-50">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 text-center">
              Alert Trigger Thresholds
            </h3>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="text-base mb-0.5">🟢</div>
                <div className="font-bold text-emerald-800">Safe</div>
                <div className="text-[10px] text-slate-500">&lt; 5 m bgl</div>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                <div className="text-base mb-0.5">🟡</div>
                <div className="font-bold text-amber-800">Semi-Critical</div>
                <div className="text-[10px] text-slate-500">5 – 10 m bgl</div>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200">
                <div className="text-base mb-0.5">🔴</div>
                <div className="font-bold text-rose-800">Critical</div>
                <div className="text-[10px] text-slate-500">&gt; 20 m bgl</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default AlertSubscription;
