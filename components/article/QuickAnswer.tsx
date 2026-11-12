export default function QuickAnswer({
  text,
}: {
  text: string;
}) {
  return (
    <aside
      aria-label="The short answer"
      className="
        my-10
        border-l-2
        border-electric
        pl-5
        sm:my-12
        sm:pl-6
      "
    >
      <p
        className="
          mb-3
          text-[11px]
          font-semibold
          uppercase
          tracking-[0.13em]
          text-electric
        "
      >
        The short answer
      </p>

      <p
        className="
          text-[calc(18px*var(--read-scale,1))]
          leading-[1.65]
          text-near-black
          sm:text-[calc(19px*var(--read-scale,1))]
        "
      >
        {text}
      </p>
    </aside>
  );
}
