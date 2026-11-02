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
import { UserPlus, AlertCircle, CheckCircle2, Loader2, Bell } from "lucide-react";
import { signupUser } from "@/services/api";

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function SignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/dashboard";

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const form = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof signupSchema>) {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await signupUser({
        name: values.name,
        email: values.email,
        password: values.password,
      });

      if (res.ok && res.token && res.user) {
        localStorage.setItem("jaldrishti_token", res.token);
        localStorage.setItem("jaldrishti_user", JSON.stringify(res.user));
        window.dispatchEvent(new Event("auth-changed"));

        setSuccessMessage(res.message || "Account created successfully! Redirecting...");
        setTimeout(() => {
          navigate(redirectTarget);
        }, 700);
      } else {
        setErrorMessage(res.message || "Failed to create account. Please try again.");
      }
    } catch (err: any) {
      console.error("Signup error:", err);
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
          {/* Main signup card */}
          <div className="rounded-3xl bg-white/95 backdrop-blur-sm shadow-2xl p-8 ring-1 ring-blue-200/50 border border-blue-100">
            {/* Header section with icon */}
            <div className="text-center mb-8">
              <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                <UserPlus className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent">
                Welcome to JalDrishti
              </h2>
              <p className="text-slate-600 mt-2 font-medium">
                Join the groundwater monitoring network
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
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 font-semibold">Full Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="John Doe"
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
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 font-semibold">Email Address</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="you@example.com"
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
                          placeholder="•••••••• (at least 6 characters)"
                          disabled={isLoading}
                          className="bg-white/90 border-blue-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400 shadow-sm rounded-xl py-3 ring-1 ring-blue-100/50 h-12"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-red-500 text-xs font-medium" />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg font-semibold py-3 rounded-xl transition-all duration-300 hover:shadow-xl hover:scale-[1.02] text-lg disabled:opacity-70 disabled:hover:scale-100 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-5 w-5 mr-2" />
                      Create Account
                    </>
                  )}
                </Button>
              </form>
            </Form>

            {/* Login link */}
            <div className="mt-6 text-center">
              <p className="text-slate-600 text-sm">
                Already have an account?
              </p>
              <Link
                to={redirectTarget !== "/dashboard" ? `/login?redirect=${encodeURIComponent(redirectTarget)}` : "/login"}
                className="inline-flex items-center gap-1.5 mt-2 text-blue-600 hover:text-cyan-600 font-semibold hover:underline transition-all duration-200"
              >
                Sign In Instead
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
                Just looking for alerts? <span className="underline font-semibold">Subscribe to SMS/Email Alerts</span>
              </Link>
            </div>
          </div>

          {/* Additional info card */}
          <div className="mt-6 rounded-2xl bg-gradient-to-r from-blue-50 to-cyan-50 p-6 shadow-lg ring-1 ring-blue-200/50 border border-blue-100">
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-800 mb-2">Why Join JalDrishti?</h3>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="text-center">
                  <div className="text-2xl mb-1">📊</div>
                  <p className="text-slate-600 font-medium">Real-time Data</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-1">🚨</div>
                  <p className="text-slate-600 font-medium">Smart Alerts</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-1">🌍</div>
                  <p className="text-slate-600 font-medium">Impact Research</p>
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