export default function Logo({ className = "", tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
  return (
    <span className={`site-logo ${tone === "dark" ? "site-logo-dark" : ""} ${className}`}>
      <span className="site-logo-today">Today</span>
      <span className="site-logo-ai">AI</span>
    </span>
  );
}
