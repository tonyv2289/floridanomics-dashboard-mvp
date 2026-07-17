import { useId } from "react";
import clsx from "clsx";
import "./signup-form.css";

const SUBSTACK_SIGNUP_URL = "https://floridanomics.substack.com/api/v1/free?nojs=true";

type SignupFormProps = {
  source?: string;
  variant?: "dashboard" | "briefing";
};

export function SignupForm({ source = "dashboard", variant = "dashboard" }: SignupFormProps) {
  const emailId = useId();
  const consentId = useId();

  return (
    <form
      className={clsx("signup", `signup--${variant}`)}
      action={SUBSTACK_SIGNUP_URL}
      method="post"
      aria-label="Subscribe to Floridanomics Weekly"
    >
      <input type="hidden" name="source" value={source} />
      <div className="signup-copy">
        <p className="signup-kicker">Floridanomics Weekly</p>
        <h2>One story. Three signals. The Florida read.</h2>
        <p>The weekly briefing on Florida's innovation economy, delivered every Monday.</p>
      </div>
      <div className="signup-fields">
        <div className="signup-row">
          <label className="signup-visually-hidden" htmlFor={emailId}>
            Email address
          </label>
          <input
            id={emailId}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@company.com"
            aria-describedby={consentId}
            required
          />
          <button type="submit">Subscribe free</button>
        </div>
        <p className="signup-consent" id={consentId}>
          Managed by Substack. Unsubscribe anytime.{" "}
          <a href="https://substack.com/privacy" target="_blank" rel="noreferrer">
            Privacy
          </a>
        </p>
      </div>
    </form>
  );
}
