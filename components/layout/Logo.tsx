export default function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`font-heading text-[1.45rem] font-black tracking-[-0.065em] leading-none sm:text-[1.55rem] ${className}`}
      aria-label="TodayAI home"
    >
      <span className="text-near-black">Today</span>
      <span className="text-electric">AI</span>
    </span>
  );
}
