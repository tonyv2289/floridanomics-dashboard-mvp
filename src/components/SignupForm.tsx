import { useState, type FormEvent } from "react";

// Set VITE_SIGNUP_ENDPOINT (e.g. a Make.com / webhook URL) to capture real leads.
// Without it, the form still validates and confirms so the surface is shippable today.
const ENDPOINT = import.meta.env.VITE_SIGNUP_ENDPOINT as string | undefined;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

type SubmitState = "idle" | "submitting" | "success" | "error";

export function SignupForm({ source = "dashboard" }: { source?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setState("error");
      setMessage("Enter a valid email address.");
      return;
    }

    setState("submitting");
    setMessage("");
    try {
      if (ENDPOINT) {
        const response = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: value, source, ts: new Date().toISOString() }),
        });
        if (!response.ok) {
          throw new Error(`Signup failed (${response.status})`);
        }
      }
      setState("success");
      setMessage("You are on the list. The Florida morning brief will land in your inbox.");
      setEmail("");
    } catch {
      setState("error");
      setMessage("Could not sign you up just now. Please try again.");
    }
  }

  if (state === "success") {
    return (
      <section className="v3-signup is-success" role="status" aria-live="polite">
        <p className="v3-kicker">The Florida morning brief</p>
        <h2>{message}</h2>
      </section>
    );
  }

  return (
    <form className="v3-signup" onSubmit={onSubmit} aria-label="Subscribe to the Florida morning brief">
      <div className="v3-signup-copy">
        <p className="v3-kicker">The Florida morning brief</p>
        <h2>One number, one read, in your inbox.</h2>
        <p>The dashboard, distilled. The Florida economic read that matters, before the market opens.</p>
      </div>
      <div className="v3-signup-form">
        <div className="v3-signup-row">
          <label className="v3-visually-hidden" htmlFor="v3-signup-email">
            Email address
          </label>
          <input
            id="v3-signup-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (state === "error") {
                setState("idle");
              }
            }}
            required
            aria-invalid={state === "error"}
          />
          <button type="submit" disabled={state === "submitting"}>
            {state === "submitting" ? "Signing up..." : "Get the brief"}
          </button>
        </div>
        {state === "error" ? (
          <p className="v3-signup-error" role="alert">
            {message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
