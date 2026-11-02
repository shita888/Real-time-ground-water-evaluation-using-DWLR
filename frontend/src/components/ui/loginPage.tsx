"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Header from "@/components/ui/header";
import Footer from "@/components/ui/footer";
import { LogIn, Shield, AlertCircle, CheckCircle2, Loader2, Bell } from "lucide-react";
import { loginUser } from "@/services/api";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/dashboard";

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await loginUser({
        email: values.email,
        password: values.password,
      });

      if (res.ok && res.token && res.user) {
        localStorage.setItem("jaldrishti_token", res.token);
        localStorage.setItem("jaldrishti_user", JSON.stringify(res.user));
        // Dispatch custom event to notify Header and Subscription page of auth change
        window.dispatchEvent(new Event("auth-changed"));

        setSuccessMessage(res.message || "Logged in successfully! Redirecting...");
        setTimeout(() => {
          navigate(redirectTarget);
        }, 700);
      } else {
        setErrorMessage(res.message || "Login failed. Please verify your credentials.");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setErrorMessage(err.message || "Unable to connect to server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <Header />
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-6 pt-32 pb-16">
        <div className="w-full max-w-md">
          {/* Main login card */}
          <div className="rounded-3xl bg-white/95 backdrop-blur-sm shadow-2xl p-8 ring-1 ring-blue-200/50 border border-blue-100">
            {/* Header section with icon */}
            <div className="text-center mb-8">
              <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent">
                Welcome Back
              </h2>
              <p className="text-slate-600 mt-2 font-medium">
                Sign in to your JalDrishti account
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

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 font-semibold">Email Address</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="you@example.com"
                          type="email"
                          disabled={isLoading}
                          className="bg-white/90 border-blue-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400 shadow-sm rounded-xl py-3 ring-1 ring-blue-100/50 h-12"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-red-500 text-xs font-medium" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 font-semibold">Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          disabled={isLoading}
                          className="bg-white/90 border-blue-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400 shadow-sm rounded-xl py-3 ring-1 ring-blue-100/50 h-12"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-red-500 text-xs font-medium" />
                    </FormItem>
                  )}
                />

                {/* Forgot password link */}
                <div className="text-right">
                  <Link
                    to="/forgot-password"
                    className="text-sm text-blue-600 hover:text-cyan-600 font-medium hover:underline transition-colors duration-200"
                  >
                    Forgot your password?
                  </Link>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg font-semibold py-3 rounded-xl transition-all duration-300 hover:shadow-xl hover:scale-[1.02] text-lg disabled:opacity-70 disabled:hover:scale-100 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    <>
                      <LogIn className="h-5 w-5 mr-2" />
                      Sign In
                    </>
                  )}
                </Button>
              </form>
            </Form>

            {/* Signup link */}
            <div className="mt-6 text-center">
              <p className="text-slate-600 text-sm">
                Don't have an account?
              </p>
              <Link
                to={redirectTarget !== "/dashboard" ? `/signup?redirect=${encodeURIComponent(redirectTarget)}` : "/signup"}
                className="inline-flex items-center gap-1.5 mt-2 text-blue-600 hover:text-cyan-600 font-semibold hover:underline transition-all duration-200"
              >
                Create Account
                <span>→</span>
              </Link>
            </div>

            {/* Link to Subscribe for Alerts */}
            <div className="mt-4 pt-4 border-t border-slate-100 text-center">
              <Link
                to="/subscribe"
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-sky-600 font-medium transition-colors"
              >
                <Bell className="h-3.5 w-3.5 text-amber-500" />
                Want groundwater alerts without an account? <span className="underline font-semibold">Subscribe here</span>
              </Link>
            </div>
          </div>

          {/* Additional security info */}
          <div className="mt-6 rounded-2xl bg-gradient-to-r from-blue-50 to-cyan-50 p-6 shadow-lg ring-1 ring-blue-200/50 border border-blue-100">
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-800 mb-2">Secure Access</h3>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="text-center">
                  <div className="text-2xl mb-1">🔒</div>
                  <p className="text-slate-600 font-medium">PBKDF2 SHA256</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-1">🛡️</div>
                  <p className="text-slate-600 font-medium">Data Encrypted</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-1">✅</div>
                  <p className="text-slate-600 font-medium">Session Safe</p>
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