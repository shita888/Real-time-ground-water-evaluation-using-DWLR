"use client";

import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/ui/header";
import Footer from "@/components/ui/footer";
import { KeyRound, Mail, Lock, AlertCircle, CheckCircle2, Loader2, ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { forgotPassword, resetPassword } from "@/services/api";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [resetCompleted, setResetCompleted] = useState(false);

  async function handleRequestCode(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setDemoCode(null);

    try {
      const res = await forgotPassword(email.trim());
      setSuccessMessage(res.message || "Reset instructions generated.");
      if (res.reset_code) {
        setDemoCode(res.reset_code);
        setResetCode(res.reset_code);
      }
      setStep("reset");
    } catch (err: any) {
      console.error("Forgot password error:", err);
      setErrorMessage(err.message || "Unable to process request. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !resetCode.trim() || !newPassword) {
      setErrorMessage("Please fill in all required fields.");
      return;
    }
    if (newPassword.length < 6) {
      setErrorMessage("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please re-check.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await resetPassword({
        email: email.trim(),
        token: resetCode.trim(),
        new_password: newPassword,
      });

      setSuccessMessage(res.message || "Password reset successfully!");
      setResetCompleted(true);
    } catch (err: any) {
      console.error("Reset password error:", err);
      setErrorMessage(err.message || "Failed to reset password. Please check your reset code.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <Header />
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-6 pt-32 pb-16">
        <div className="w-full max-w-md">
          {/* Main card */}
          <div className="rounded-3xl bg-white/95 backdrop-blur-sm shadow-2xl p-8 ring-1 ring-blue-200/50 border border-blue-100">
            {/* Header section with icon */}
            <div className="text-center mb-8">
              <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                <KeyRound className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent">
                {resetCompleted
                  ? "Password Updated"
                  : step === "request"
                  ? "Forgot Password"
                  : "Set New Password"}
              </h2>
              <p className="text-slate-600 mt-2 font-medium text-sm">
                {resetCompleted
                  ? "Your account credentials have been updated securely."
                  : step === "request"
                  ? "Enter your registered email to receive a password reset code."
                  : "Enter the reset code and choose a new password."}
              </p>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
                <div className="text-sm font-medium leading-relaxed">{errorMessage}</div>
              </div>
            )}

            {/* Success Banner */}
            {successMessage && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500 mt-0.5" />
                <div className="text-sm font-medium leading-relaxed">{successMessage}</div>
              </div>
            )}

            {/* Demo / Unconfigured Email Banner */}
            {demoCode && (
              <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 ring-1 ring-amber-100">
                <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider mb-1">
                  Server Reset Code (Demo / Notification Inactive)
                </p>
                <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-amber-300 font-mono text-sm font-bold text-slate-800 select-all">
                  <span>{demoCode}</span>
                </div>
                <p className="text-xs text-amber-700 mt-1.5">
                  Email service is unconfigured on the server; your reset code has been provided directly above and filled below.
                </p>
              </div>
            )}

            {resetCompleted ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-center">
                  <ShieldCheck className="h-10 w-10 text-blue-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-700 font-medium">
                    You can now sign in using your new password.
                  </p>
                </div>
                <Link
                  to="/login"
                  className="w-full inline-flex items-center justify-center bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg font-semibold py-3 rounded-xl transition-all duration-300 text-lg no-underline"
                >
                  Sign In Now
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Link>
              </div>
            ) : step === "request" ? (
              /* Step 1: Request Code */
              <form onSubmit={handleRequestCode} className="space-y-6">
                <div>
                  <label className="block text-slate-700 font-semibold mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    disabled={isLoading}
                    className="w-full px-4 bg-white/90 border border-blue-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400 shadow-sm rounded-xl py-3 ring-1 ring-blue-100/50 h-12 outline-none transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg font-semibold py-3 rounded-xl transition-all duration-300 hover:shadow-xl hover:scale-[1.02] text-lg disabled:opacity-70 disabled:hover:scale-100 cursor-pointer flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Generating Code...
                    </>
                  ) : (
                    <>
                      <KeyRound className="h-5 w-5" />
                      Get Reset Code
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep("reset")}
                    className="text-blue-600 hover:underline font-medium cursor-pointer"
                  >
                    Already have a reset code?
                  </button>
                  <Link to="/login" className="text-slate-600 hover:text-blue-600 font-medium">
                    Back to Login
                  </Link>
                </div>
              </form>
            ) : (
              /* Step 2: Reset Password Form */
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1 text-sm">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    disabled={isLoading}
                    className="w-full px-4 bg-white/90 border border-blue-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400 shadow-sm rounded-xl py-2.5 ring-1 ring-blue-100/50 h-11 outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1 text-sm">
                    Reset Code
                  </label>
                  <input
                    type="text"
                    required
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    placeholder="Enter 32-character reset code"
                    disabled={isLoading}
                    className="w-full px-4 bg-white/90 border border-blue-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400 shadow-sm rounded-xl py-2.5 ring-1 ring-blue-100/50 h-11 outline-none font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1 text-sm">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="•••••••• (min 6 chars)"
                    disabled={isLoading}
                    className="w-full px-4 bg-white/90 border border-blue-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400 shadow-sm rounded-xl py-2.5 ring-1 ring-blue-100/50 h-11 outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1 text-sm">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={isLoading}
                    className="w-full px-4 bg-white/90 border border-blue-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400 shadow-sm rounded-xl py-2.5 ring-1 ring-blue-100/50 h-11 outline-none text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg font-semibold py-3 rounded-xl transition-all duration-300 hover:shadow-xl hover:scale-[1.02] text-lg disabled:opacity-70 disabled:hover:scale-100 cursor-pointer flex items-center justify-center gap-2 mt-4"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Updating Password...
                    </>
                  ) : (
                    <>
                      <KeyRound className="h-5 w-5" />
                      Set New Password
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep("request")}
                    className="text-blue-600 hover:underline font-medium cursor-pointer inline-flex items-center gap-1"
                  >
                    <ArrowLeft className="h-3 w-3" /> Request new code
                  </button>
                  <Link to="/login" className="text-slate-600 hover:text-blue-600 font-medium">
                    Back to Login
                  </Link>
                </div>
              </form>
            )}

            {/* Bottom Links */}
            <div className="mt-6 pt-4 border-t border-slate-100 text-center space-y-2">
              <p className="text-slate-600 text-sm">
                Remember your credentials?{" "}
                <Link to="/login" className="text-blue-600 hover:underline font-semibold">
                  Sign In
                </Link>
              </p>
              <p className="text-slate-600 text-sm">
                Don't have an account?{" "}
                <Link to="/signup" className="text-blue-600 hover:underline font-semibold">
                  Create Account
                </Link>
              </p>
            </div>
          </div>

          {/* Security badge card */}
          <div className="mt-6 rounded-2xl bg-gradient-to-r from-blue-50 to-cyan-50 p-6 shadow-lg ring-1 ring-blue-200/50 border border-blue-100">
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-800 mb-2">Password Security</h3>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="text-center">
                  <div className="text-2xl mb-1">⏱️</div>
                  <p className="text-slate-600 font-medium">1-Hour Expiry</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-1">🔐</div>
                  <p className="text-slate-600 font-medium">PBKDF2 Hash</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-1">🛡️</div>
                  <p className="text-slate-600 font-medium">One-Time Use</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
