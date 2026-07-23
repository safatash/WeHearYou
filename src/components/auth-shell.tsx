import Link from "next/link";
import { Icon, type IconName } from "@/components/icon";

const POINTS: Array<{ icon: IconName; title: string; body: string }> = [
  { icon: "star", title: "Collect more reviews", body: "Route happy customers to public reviews with smart, on-brand funnels." },
  { icon: "sparkles", title: "Reply with AI assistance", body: "Draft thoughtful responses to every review in seconds." },
  { icon: "inbox", title: "One clear inbox", body: "See and act on feedback across all of your locations." },
];

export function AuthShell({
  mode,
  flash,
  children,
}: {
  mode: "signin" | "signup";
  flash?: { message: string; tone: "success" | "error" } | null;
  children: React.ReactNode;
}) {
  const signup = mode === "signup";

  return (
    <div className="au-root">
      {/* Brand panel */}
      <aside className="au-brand">
        <div className="au-brand-grain" />
        <div className="au-logo">
          <span className="au-logo-mark"><Icon name="bolt" size={20} style={{ color: "#fff" }} /></span>
          <span className="au-logo-name">WeHearYou</span>
        </div>

        <div className="au-brand-mid">
          <h1 className="au-brand-h">Turn customer feedback into a five-star reputation.</h1>
          <p className="au-brand-sub">
            Collect reviews, reply with AI assistance, and understand every signal across your locations — all in one calm, clear place.
          </p>
          <ul className="au-points">
            {POINTS.map((p) => (
              <li key={p.title}>
                <span className="au-points-ic"><Icon name={p.icon} size={16} style={{ color: "#fff" }} /></span>
                <span><b>{p.title}.</b> {p.body}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="au-brand-foot">
          <span>© {new Date().getFullYear()} WeHearYou</span>
        </div>
      </aside>

      {/* Form panel */}
      <main className="au-form-wrap">
        <div className="au-form-top">
          <span>{signup ? "Already have an account?" : "New to WeHearYou?"}</span>
          <Link className="au-switch-link" href={signup ? "/login" : "/signup"}>
            {signup ? "Sign in" : "Create an account"}
          </Link>
        </div>

        <div className="au-form">
          <div className="au-mobile-logo">
            <span className="au-logo-mark"><Icon name="bolt" size={19} style={{ color: "#fff" }} /></span>
            <span className="au-logo-name">WeHearYou</span>
          </div>

          {flash ? (
            <div className={`au-flash ${flash.tone === "error" ? "au-flash-error" : "au-flash-success"}`}>{flash.message}</div>
          ) : null}

          <h2 className="au-h1">{signup ? "Create your account" : "Welcome back"}</h2>
          <p className="au-lede">
            {signup
              ? "Start a new workspace and invite your team in minutes."
              : "Sign in to your dashboard to manage reviews, posts, and insights."}
          </p>

          {children}

          <p className="au-switch-foot">
            {signup ? "Already have an account? " : "Don't have an account? "}
            <Link className="au-switch-link" href={signup ? "/login" : "/signup"}>
              {signup ? "Sign in" : "Sign up free"}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
