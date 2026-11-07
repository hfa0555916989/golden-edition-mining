/** Default brand lockup. Used when the dashboard has no custom logo upload. */
export function Emblem({ className }: { className?: string; dark?: boolean }) {
  return <img src="/mark.svg" alt="" className={className} />;
}

export default function Logo({ dark = true, className = "" }: { dark?: boolean; className?: string }) {
  return (
    <img
      src={dark ? "/logo.svg" : "/logo-light.svg"}
      alt="الإصدار الذهبي للتعدين والمقاولات — Golden Edition Mining & Contracting"
      className={`logo ${className}`}
    />
  );
}
