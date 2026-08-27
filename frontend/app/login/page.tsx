"use client";

import Link from "next/link";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import GoogleAccountChooserModal from "@/components/GoogleAccountChooserModal";
import { Lock } from "lucide-react";
import { getUserProfile, saveUserProfile, isEmailAlreadyRegistered } from "@/lib/userProfiles";
import { triggerGoogleOAuth } from "@/lib/googleAuth";
import { dispatchTabLogin } from "@/lib/auth-context";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [googleError, setGoogleError] = useState("");
  const [showGoogleChooser, setShowGoogleChooser] = useState(false);

  const getRedirectDestination = (userRole: string) => {
    const rawRedirect = searchParams
      ? (searchParams.get("redirect") ||
         searchParams.get("callbackUrl") ||
         searchParams.get("from") ||
         searchParams.get("next"))
      : null;

    let destinationPath = rawRedirect;

    // Fallback to document.referrer if no query param and user navigated from another page on the same origin
    if (!destinationPath && typeof window !== "undefined" && document.referrer) {
      try {
        const refUrl = new URL(document.referrer);
        if (refUrl.origin === window.location.origin) {
          const path = refUrl.pathname;
          if (path && path !== "/login" && path !== "/register" && path !== "/forgot-password") {
            destinationPath = path;
          }
        }
      } catch (e) {
        // ignore invalid referrer
      }
    }

    const normalizedRole = (userRole || "").toLowerCase();
    const isAdmin = normalizedRole === "admin" || normalizedRole === "co-admin";
    const isWriter = normalizedRole === "writer" || normalizedRole === "editor" || isAdmin;

    if (
      destinationPath &&
      destinationPath.startsWith("/") &&
      !destinationPath.startsWith("//") &&
      destinationPath !== "/login" &&
      destinationPath !== "/register"
    ) {
      // Permission checks for role-restricted destinations
      if (destinationPath.startsWith("/admin") && !isAdmin) {
        return isWriter ? "/writer" : "/reader";
      }
      if (destinationPath.startsWith("/writer") && !isWriter) {
        return "/reader";
      }
      return destinationPath;
    }

    // Default home "belong page" according to user role
    if (isAdmin) {
      return "/admin";
    }
    if (normalizedRole === "writer" || normalizedRole === "editor") {
      return "/writer";
    }
    return "/reader";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!email || !password) {
      setErrorMessage("Please enter both email address and password.");
      return;
    }
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Sign-in failed. Please check your credentials.");
        return;
      }

      const authenticatedUser = data.user;
      const userRole = authenticatedUser.role;

      // Bind this user to this tab's session (tab-isolated via sessionStorage)
      dispatchTabLogin({
        id: authenticatedUser.id,
        name: authenticatedUser.name,
        email: authenticatedUser.email,
        role: authenticatedUser.role,
        provider: authenticatedUser.provider || 'local',
      });

      const targetDestination = getRedirectDestination(userRole);
      localStorage.setItem("dj_toast", `Welcome back, ${authenticatedUser.name}! Signed in successfully.`);

      setSuccessMessage(`✓ Security Verified! Signed in as ${authenticatedUser.name}. Opening ${targetDestination}...`);
      setTimeout(() => {
        window.location.href = targetDestination;
      }, 300);
    } catch (err: any) {
      setErrorMessage("Sign-in process failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = () => {
    setErrorMessage("");
    setGoogleError("");
    setIsGoogleLoading(true);
    triggerGoogleOAuth(
      async (user) => {
        handleSelectGoogleAccount({ name: user.name, email: user.email, avatar: user.avatar, googleId: user.googleId });
      },
      () => {
        setIsGoogleLoading(false);
        setShowGoogleChooser(true);
      },
      (err) => {
        setIsGoogleLoading(false);
        setGoogleError("Google sign-in could not be completed. Please try again.");
      }
    );
  };

  const handleSelectGoogleAccount = async (acc: { name: string; email: string; avatar?: string; googleId?: string }) => {
    setShowGoogleChooser(false);
    setIsGoogleLoading(true);
    setErrorMessage("");
    setGoogleError("");
    setSuccessMessage("");

    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: acc.email,
          name: acc.name,
          googleId: acc.googleId,
          avatar: acc.avatar,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setGoogleError(data.error || "Google sign-in failed. Please try again.");
        return;
      }

      const finalAccount = data.user;
      const role = finalAccount.role;

      // Bind this Google user to this tab's session (tab-isolated via sessionStorage)
      dispatchTabLogin({
        id: finalAccount.id,
        name: finalAccount.name,
        email: finalAccount.email,
        role: finalAccount.role,
        provider: finalAccount.provider || 'google',
      });

      const targetDestination = getRedirectDestination(role);
      localStorage.setItem("dj_toast", `Welcome back, ${finalAccount.name}! Opening ${targetDestination}...`);

      setSuccessMessage(`✓ Authenticated as ${acc.name} (${acc.email}) with Google! Opening ${targetDestination}...`);
      setTimeout(() => {
        window.location.href = targetDestination;
      }, 300);
    } catch (err: any) {
      setGoogleError("Google sign-in could not be completed. Please try again.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-slate-900 selection:bg-red-100 selection:text-red-900">
      <Header />

      {/* MAIN PLAIN PAGE CONTAINER */}
      <main className="flex-1 bg-white py-12 lg:py-16 flex items-center justify-center">
        <div className="w-full max-w-[440px] mx-auto px-4 font-sans text-slate-900">
          
          {/* Logo & Corporate Title */}
          <div className="flex flex-col items-center mb-8 text-center">
            <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity mb-2 group">
              <img
                src="/logo.png"
                alt="London BigBen Logo"
                className="w-9 h-9 object-contain"
              />
              <span className="text-2xl font-serif font-black tracking-tight text-slate-900 group-hover:text-[#BF1E2D] transition-colors">
                LONDON BIGBEN
              </span>
            </Link>

            <h1 className="text-xl font-bold text-slate-900">Sign in to your account</h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Access your Reader Hub, Author Studio, or Management Console.
            </p>
          </div>

          {/* Success Banner */}
          {successMessage && (
            <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold p-4 rounded-xl text-center shadow-xs flex items-center justify-center gap-2">
              <span className="text-base">✓</span>
              <span>{successMessage}</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold p-4 rounded-xl text-center shadow-xs flex items-center justify-center gap-2">
              <span className="text-base">⚠</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Official Google Sign In Section */}
          <div className="w-full mb-6">
            <button 
              onClick={handleGoogleSignIn}
              disabled={isSubmitting || isGoogleLoading}
              type="button"
              aria-label="Continue with Google"
              className="w-full h-11 sm:h-12 flex items-center justify-center gap-3 bg-white hover:bg-slate-50/90 active:bg-slate-100 active:scale-[0.99] border border-slate-200 hover:border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:text-slate-900 shadow-2xs hover:shadow-xs transition-all duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-300/40 focus:border-slate-400 disabled:opacity-60 disabled:cursor-not-allowed select-none"
            >
              {isGoogleLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-slate-600 shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="font-medium text-slate-600 text-sm">Connecting to Google...</span>
                </>
              ) : (
                <>
                  <svg className="w-[18px] h-[18px] flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            {/* Error Message for Google Authentication */}
            {googleError && (
              <p className="mt-2 text-center text-xs font-medium text-rose-600 animate-in fade-in duration-150">
                {googleError}
              </p>
            )}
          </div>

          {/* Separator */}
          <div className="relative flex items-center mb-6">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-4 text-xs font-medium text-slate-400">
              or continue with email
            </span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {/* Form Fields */}
          <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
            {/* Fake hidden inputs to trap browser autofill heuristics */}
            <input type="text" name="fake_autofill_email" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" autoComplete="off" />
            <input type="password" name="fake_autofill_password" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" autoComplete="new-password" />

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                BUSINESS EMAIL ADDRESS
              </label>
              <input
                type="email"
                name="dj_login_email_no_autofill"
                autoComplete="off"
                placeholder="e.g. yourname@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#BF1E2D] focus:ring-1 focus:ring-red-100 transition-all bg-slate-50/50 focus:bg-white font-medium"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  PASSCODE / PASSWORD
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] font-bold text-[#BF1E2D] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="dj_login_pass_no_autofill"
                  autoComplete="new-password"
                  placeholder="Enter passcode"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 pr-10 py-3 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#BF1E2D] focus:ring-1 focus:ring-red-100 transition-all bg-slate-50/50 focus:bg-white"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-1"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L21 21m-14.772-14.772l3.472 3.472m3.472 3.472L17.772 17.772M12 15.5a3.5 3.5 0 110-7 3.5 3.5 0 010 7z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#0F172A] hover:bg-[#1E293B] active:scale-[0.99] text-white font-bold text-sm py-3.5 rounded-xl transition-all uppercase tracking-wider cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    VERIFYING IDENTITY...
                  </>
                ) : (
                  <>
                    <Lock size={15} />
                    <span>SIGN IN TO ACCOUNT</span>
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <Link href="/register" className="text-xs text-slate-600 hover:text-slate-900 transition-colors font-medium">
              Don't have an account? <span className="text-[#BF1E2D] font-bold hover:underline">Create a new account</span>
            </Link>
          </div>

        </div>
      </main>

      <Footer />

      <GoogleAccountChooserModal
        isOpen={showGoogleChooser}
        onClose={() => setShowGoogleChooser(false)}
        onSelectAccount={handleSelectGoogleAccount}
      />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center font-sans">
        <div className="text-slate-500 font-medium text-sm">Loading sign in...</div>
      </div>
    }>
      <LoginFormContent />
    </Suspense>
  );
}

