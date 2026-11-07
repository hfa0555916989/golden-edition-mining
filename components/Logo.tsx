/** Default brand logo (used when no logo is uploaded in the dashboard). */
export function Emblem({ className, dark = true }: { className?: string; dark?: boolean }) {
  const id = dark ? "ge-d" : "ge-l";
  return (
    <svg viewBox="0 0 100 112" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6e27a" /><stop offset=".45" stopColor="#d4af37" /><stop offset="1" stopColor="#8a6d1d" />
        </linearGradient>
      </defs>
      <path d="M50 3 93 28v56L50 109 7 84V28z" fill={dark ? "#14161a" : "#1b1d22"} stroke={`url(#${id}-g)`} strokeWidth="5" strokeLinejoin="round" />
      <path d="M50 15 82 33.5v45L50 97 18 78.5v-45z" fill="none" stroke={`url(#${id}-g)`} strokeWidth="1.4" opacity=".55" />
      <path d="M20 78 41 46l9 12 12-20 18 40z" fill={`url(#${id}-g)`} />
      <path d="M41 46l-5 7.5 5-2 4 4.6z M62 38l-5 8.2 5-2.4 4.4 5z" fill="#fff6c9" opacity=".75" />
      <path d="M50 22l5 6-5 6-5-6z" fill={`url(#${id}-g)`} />
      <path d="M26 84h48" stroke={`url(#${id}-g)`} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}
export default function Logo({ dark = true, className = "" }: { dark?: boolean; className?: string }) {
  return (
    <span className={`brand-logo ${className}`} role="img" aria-label="الإصدار الذهبي للتعدين والمقاولات — Golden Edition Mining & Contracting">
      <Emblem className="brand-emblem" dark={dark} />
      <span className="brand-words">
        <span className="brand-ar gold-grad">الإصدار الذهبي</span>
        <span className="brand-sub" style={{ color: dark ? "#e9e3cf" : "#2a2c31" }}>للتعدين والمقاولات</span>
        <span className="brand-en" dir="ltr" style={{ color: dark ? "#b9a46a" : "#8a6d1d" }}>GOLDEN EDITION — MINING &amp; CONTRACTING</span>
      </span>
    </span>
  );
}
