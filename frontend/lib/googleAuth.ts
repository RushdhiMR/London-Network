/**
 * Official Google Identity Services (GIS) / OAuth 2.0 Client Authentication Handler
 */

export interface GoogleAuthResult {
  credential?: string;
  accessToken?: string;
}

let gsiScriptLoadingPromise: Promise<void> | null = null;

export function loadGoogleIdentityScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  if ((window as any).google?.accounts?.oauth2 || (window as any).google?.accounts?.id) {
    return Promise.resolve();
  }

  if (gsiScriptLoadingPromise) {
    return gsiScriptLoadingPromise;
  }

  gsiScriptLoadingPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve());
      existingScript.addEventListener("error", () => reject(new Error("Failed to load Google Identity script")));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      gsiScriptLoadingPromise = null;
      reject(new Error("Failed to load Google Identity Services SDK from Google"));
    };
    document.head.appendChild(script);
  });

  return gsiScriptLoadingPromise;
}

export async function triggerGoogleOAuth(
  onSuccess: (result: GoogleAuthResult) => void,
  onError: (errMessage: string) => void
) {
  if (typeof window === "undefined") return;

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId || clientId.trim() === "") {
    onError("Google Client ID is not configured. Please set NEXT_PUBLIC_GOOGLE_CLIENT_ID in your .env.local file.");
    return;
  }

  try {
    await loadGoogleIdentityScript();

    if (!(window as any).google?.accounts) {
      onError("Google Identity Services failed to load. Please check your internet connection.");
      return;
    }

    // Official Google Identity Services OAuth 2.0 Token Client (Popup flow for custom buttons)
    if ((window as any).google?.accounts?.oauth2) {
      const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: clientId.trim(),
        scope: "openid email profile",
        callback: (tokenResponse: any) => {
          if (tokenResponse.error) {
            if (tokenResponse.error === "popup_closed_by_user" || tokenResponse.error === "access_denied") {
              onError("Google sign-in was cancelled.");
            } else {
              onError(tokenResponse.error_description || tokenResponse.error || "Google sign-in failed.");
            }
            return;
          }

          if (tokenResponse.access_token) {
            onSuccess({
              accessToken: tokenResponse.access_token,
              credential: tokenResponse.id_token,
            });
          } else {
            onError("Google sign-in did not return an authorization token.");
          }
        },
        error_callback: (err: any) => {
          onError(err?.message || "Google sign-in popup encountered an error.");
        },
      });

      tokenClient.requestAccessToken({ prompt: "select_account" });
      return;
    }

    // Fallback: Google Identity Services ID Token flow
    if ((window as any).google?.accounts?.id) {
      (window as any).google.accounts.id.initialize({
        client_id: clientId.trim(),
        callback: (response: any) => {
          if (response && response.credential) {
            onSuccess({ credential: response.credential });
          } else {
            onError("Google sign-in did not return a valid credential.");
          }
        },
        auto_select: false,
      });

      (window as any).google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          onError("Google Sign-In prompt was suppressed by browser. Please allow popups or cookies for Google.");
        }
      });
      return;
    }

    onError("Google Identity Services is not available.");
  } catch (err: any) {
    console.error("[Google Auth] Error triggering Google OAuth:", err);
    onError(err?.message || "An unexpected error occurred during Google sign-in.");
  }
}
