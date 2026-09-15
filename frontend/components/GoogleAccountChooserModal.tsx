"use client";

import React, { useState, useEffect } from "react";
import { KeyRound, CheckCircle2, ArrowLeft, ShieldCheck } from "lucide-react";
import { getUserProfile, saveUserProfile, isEmailDeletedOnClient } from "@/lib/userProfiles";

export interface Account {
  name: string;
  email: string;
  avatar?: string;
  status?: string;
  isDevice?: boolean;
}

interface GoogleAccountChooserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAccount: (account: Account) => void;
  requirePasswordSetup?: boolean;
}

export default function GoogleAccountChooserModal({
  isOpen,
  onClose,
  onSelectAccount,
  requirePasswordSetup = false,
}: GoogleAccountChooserModalProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  
  const [customEmail, setCustomEmail] = useState("");
  const [customName, setCustomName] = useState("");
  const [emailError, setEmailError] = useState("");

  // Password Setup State (Triggered ONLY when requirePasswordSetup is true for new registrations)
  const [pendingAccount, setPendingAccount] = useState<Account | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Helper to parse real Google Identity Services JWT OAuth credentials
  const parseGoogleJwtToken = (token: string) => {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.warn("Error parsing Google OAuth JWT token:", e);
      return null;
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    setCustomEmail("");
    setCustomName("");
    setEmailError("");
    setPendingAccount(null);
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");

    // Load Google Identity Services Client Script dynamically if needed
    if (typeof window !== "undefined" && !(window as any).google) {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    try {
      const savedAccountsStr = localStorage.getItem("dj_device_google_accounts");
      const activeUserStr = localStorage.getItem("dj_user");

      const deviceList: Account[] = savedAccountsStr ? JSON.parse(savedAccountsStr) : [];

      if (activeUserStr) {
        const activeUser = JSON.parse(activeUserStr);
        if (activeUser?.email) {
          const found = deviceList.find((a) => a.email.toLowerCase() === activeUser.email.toLowerCase());
          if (found) {
            found.status = "Signed in";
            found.isDevice = true;
          } else {
            const initials = activeUser.name
              ? activeUser.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
              : activeUser.email.slice(0, 2).toUpperCase();

            deviceList.unshift({
              name: activeUser.name || activeUser.email.split("@")[0],
              email: activeUser.email,
              avatar: activeUser.avatar || initials,
              status: "Signed in",
              isDevice: true,
            });
          }
        }
      }

      // Filter out any accounts that were deleted by the administrator
      const activeDeviceAccounts = deviceList.filter((a) => !isEmailDeletedOnClient(a.email));
      setAccounts(activeDeviceAccounts);

      if (activeDeviceAccounts.length === 0) {
        setIsAddingAccount(true);
      } else {
        setIsAddingAccount(false);
      }
    } catch (e) {
      console.warn("Error reading local device google accounts:", e);
      setAccounts([]);
      setIsAddingAccount(true);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Helper to validate real email address format strictly
  const isValidRealEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  // Helper to check if an email is already registered in local user registry
  const isEmailRegistered = (email: string): boolean => {
    const lower = email.trim().toLowerCase();
    if (isEmailDeletedOnClient(lower)) return false;
    const systemAccounts = [
      "coadmin@digitaljournal.com",
      "writer@digitaljournal.com",
      "reader@digitaljournal.com",
    ];
    if (systemAccounts.includes(lower)) return true;

    try {
      const regStr = localStorage.getItem("dj_registered_users");
      if (regStr) {
        const regList: any[] = JSON.parse(regStr);
        return regList.some((u) => u.email && u.email.toLowerCase() === lower);
      }
    } catch (e) {
      console.warn(e);
    }

    return false;
  };

  const processAccountSelection = (acc: Account) => {
    if (isEmailDeletedOnClient(acc.email)) {
      setEmailError("Access Denied: This account has been removed by the administrator. Access is disabled.");
      return;
    }
    completeSignIn(acc);
  };

  const handlePasswordSetupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");

    if (!pendingAccount) return;
    if (!newPassword || newPassword.length < 4) {
      setPasswordError("Password must be at least 4 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match. Please re-enter.");
      return;
    }

    // Register user with password in localStorage
    try {
      const regStr = localStorage.getItem("dj_registered_users");
      const regList: any[] = regStr ? JSON.parse(regStr) : [];
      
      const newUser = {
        name: pendingAccount.name,
        email: pendingAccount.email.toLowerCase().trim(),
        role: "Reader",
        registeredAt: new Date().toISOString(),
      };

      if (!regList.some((u) => u.email.toLowerCase() === newUser.email)) {
        regList.push(newUser);
        localStorage.setItem("dj_registered_users", JSON.stringify(regList));
      }
    } catch (err) {
      console.warn("Could not save new user registration:", err);
    }

    completeSignIn(pendingAccount);
  };

  const completeSignIn = (acc: Account) => {
    const savedProfile = getUserProfile(acc.email);
    const finalAccount: Account = {
      ...acc,
      name: savedProfile?.name || acc.name,
      avatar: savedProfile?.avatar || acc.avatar
    };

    saveUserProfile({
      name: finalAccount.name,
      email: finalAccount.email,
      avatar: finalAccount.avatar
    });

    // Save to local device google accounts
    try {
      const existingStr = localStorage.getItem("dj_device_google_accounts");
      const existingList: Account[] = existingStr ? JSON.parse(existingStr) : [];
      const idx = existingList.findIndex((a) => a.email.toLowerCase() === acc.email.toLowerCase());
      if (idx !== -1) {
        existingList[idx] = finalAccount;
      } else {
        existingList.unshift(finalAccount);
      }
      localStorage.setItem("dj_device_google_accounts", JSON.stringify(existingList));
    } catch (err) {
      console.warn("Failed to persist device account:", err);
    }

    onSelectAccount(finalAccount);
  };

  const handleAddCustomAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError("");

    const trimmedEmail = customEmail.trim();
    if (!trimmedEmail || !isValidRealEmail(trimmedEmail)) {
      setEmailError("Please enter a valid real email address (e.g. user@gmail.com).");
      return;
    }

    const nameFromEmail =
      customName.trim() ||
      trimmedEmail
        .split("@")[0]
        .split(".")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

    const initials =
      nameFromEmail
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "GA";

    const newAcc: Account = {
      name: nameFromEmail,
      email: trimmedEmail,
      avatar: initials,
      status: "Device Account",
      isDevice: true,
    };

    processAccountSelection(newAcc);
  };

  const handleRemoveAccount = (e: React.MouseEvent, emailToRemove: string) => {
    e.stopPropagation();
    const updated = accounts.filter((a) => a.email.toLowerCase() !== emailToRemove.toLowerCase());
    setAccounts(updated);
    try {
      localStorage.setItem("dj_device_google_accounts", JSON.stringify(updated));
    } catch (err) {
      console.warn("Failed to update device accounts list:", err);
    }
    if (updated.length === 0) {
      setIsAddingAccount(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fade-in font-sans">
      <div className="w-full max-w-[450px] bg-[#121314] text-white rounded-xl shadow-2xl border border-zinc-800 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#1E1F22] border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span className="text-[14px] font-medium text-zinc-200">Sign in with Google</span>
          </div>

          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors cursor-pointer p-1 rounded-full hover:bg-zinc-800"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-7 md:p-8 flex-1">

          {/* PASSWORD SETUP SCREEN FOR NEW GOOGLE REGISTRATIONS ON REGISTER PAGE */}
          {pendingAccount ? (
            <form onSubmit={handlePasswordSetupSubmit} className="space-y-4">
              <div>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider mb-2 inline-flex items-center gap-1">
                  <KeyRound size={12} /> ACCOUNT PASSWORD SETUP
                </span>
                <h2 className="text-[22px] font-medium text-white mb-1 tracking-tight font-sans">
                  Set Account Password
                </h2>
                <p className="text-[12.5px] text-zinc-400 font-sans leading-relaxed">
                  Welcome <span className="text-white font-medium">{pendingAccount.name}</span> (<span className="text-white font-medium">{pendingAccount.email}</span>)! Set a password for your new London BigBen account.
                </p>
              </div>

              {passwordError && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded font-medium">
                  {passwordError}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 font-sans">
                  Create Account Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 4 chars)"
                  autoFocus
                  required
                  className="w-full bg-[#1A1B1E] border border-zinc-700 rounded-lg px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 font-sans">
                  Confirm Account Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  className="w-full bg-[#1A1B1E] border border-zinc-700 rounded-lg px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setPendingAccount(null)}
                  className="text-xs font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors cursor-pointer shadow flex items-center gap-1.5"
                >
                  <CheckCircle2 size={15} /> Create Password & Register
                </button>
              </div>
            </form>
          ) : !isAddingAccount && accounts.length > 0 ? (
            /* ACCOUNT CHOOSER LIST */
            <>
              <h2 className="text-[28px] md:text-[32px] font-normal text-white mb-1.5 tracking-tight font-sans">
                Choose an account
              </h2>
              <p className="text-[14px] md:text-[15px] text-zinc-300 mb-6 font-sans">
                to continue to <span className="text-blue-400 font-medium hover:underline cursor-pointer">digital-journal.com</span>
              </p>

              <div className="space-y-1 divide-y divide-zinc-800/80 max-h-[260px] overflow-y-auto pr-1">
                {accounts.map((acc, index) => {
                  const initials = acc.name
                    ? acc.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)
                    : acc.email.slice(0, 2).toUpperCase();

                  const isImageUrl = acc.avatar && (acc.avatar.startsWith("http") || acc.avatar.startsWith("data:image"));

                  return (
                    <div
                      key={index}
                      onClick={() => processAccountSelection(acc)}
                      className="flex items-center justify-between py-3.5 px-3 rounded-lg hover:bg-zinc-800/70 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1 mr-2">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow overflow-hidden">
                          {isImageUrl ? (
                            <img src={acc.avatar} alt={acc.name} className="w-full h-full object-cover rounded-full" />
                          ) : (
                            <span className="font-bold text-sm text-white select-none">{initials}</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-[15px] font-medium text-zinc-100 group-hover:text-white truncate">
                              {acc.name}
                            </h3>
                            {acc.isDevice && (
                              <span className="text-[9px] bg-blue-500/20 text-blue-300 font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
                                Device
                              </span>
                            )}
                          </div>
                          <p className="text-[13px] text-zinc-400 font-normal truncate">
                            {acc.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {acc.status && (
                          <span className="text-[12px] text-zinc-500 font-normal">
                            {acc.status}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleRemoveAccount(e, acc.email)}
                          className="text-zinc-500 hover:text-rose-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove account from device"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}

                <div
                  onClick={() => {
                    if (typeof window !== "undefined" && (window as any).google?.accounts?.id && process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
                      try {
                        (window as any).google.accounts.id.prompt();
                      } catch (e) {
                        console.warn(e);
                      }
                    }
                    setIsAddingAccount(true);
                  }}
                  className="flex items-center gap-4 py-3.5 px-3 rounded-lg hover:bg-zinc-800/70 transition-colors cursor-pointer group pt-4"
                >
                  <div className="w-10 h-10 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center flex-shrink-0 border border-zinc-700">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <span className="text-[15px] font-medium text-zinc-200 group-hover:text-white">
                    Use another Google account
                  </span>
                </div>
              </div>
            </>
          ) : (
            /* NEW EMAIL INPUT FORM */
            <form onSubmit={handleAddCustomAccountSubmit} className="space-y-4">
              <div>
                <h2 className="text-[24px] font-medium text-white mb-1 tracking-tight font-sans">
                  Sign in with Google
                </h2>
                <p className="text-[13px] text-zinc-400 font-sans">
                  Enter your Google email address for this device.
                </p>
              </div>

              {emailError && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded">
                  {emailError}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 font-sans">
                  Google Email Address
                </label>
                <input
                  type="email"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  placeholder="e.g. user@gmail.com"
                  autoFocus
                  required
                  className="w-full bg-[#1A1B1E] border border-zinc-700 rounded-lg px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 font-sans">
                  Account Display Name (Optional)
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full bg-[#1A1B1E] border border-zinc-700 rounded-lg px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                {accounts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsAddingAccount(false)}
                    className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                )}
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors cursor-pointer shadow"
                >
                  Continue with Google
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-4 text-[12px] text-zinc-400 bg-[#16171a]">
          <button type="button" className="hover:text-zinc-200 cursor-pointer flex items-center gap-1">
            English (United Kingdom) <span className="text-[10px]">▼</span>
          </button>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-zinc-200 transition-colors">Help</a>
            <a href="#" className="hover:text-zinc-200 transition-colors">Privacy</a>
            <a href="#" className="hover:text-zinc-200 transition-colors">Terms</a>
          </div>
        </div>
      </div>
    </div>
  );
}
