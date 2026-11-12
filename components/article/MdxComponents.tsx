import Image from "@/components/ui/MediaImage";
import { EyesIcon, SpotifyLogoIcon } from "@phosphor-icons/react/ssr";
import {
  isValidElement,
  type ComponentProps,
  type ReactNode,
} from "react";

import QuickAnswer from "@/components/article/QuickAnswer";
import GameScreenshot from "@/components/gaming/GameScreenshot";
import TripPlanner from "@/components/article/TripPlanner";
import { slugify } from "@/lib/toc";

// Editors sometimes end a heading with a decorative emoji (e.g. "Brisa's
// take 👀"). Swap it for the matching Phosphor icon so headings stay
// consistent with the rest of the site's iconography instead of relying on
// platform emoji rendering.
const HEADING_EMOJI_ICONS: Record<string, ReactNode> = {
  "👀": <EyesIcon weight="fill" className="inline size-[0.8em] align-[-0.08em]" />,
};

function withHeadingIcon(children: ReactNode): ReactNode {
  const text = textOf(children);
  const trimmed = text.trimEnd();

  for (const [emoji, icon] of Object.entries(HEADING_EMOJI_ICONS)) {
    if (trimmed.endsWith(emoji)) {
      const prefix = trimmed.slice(0, -emoji.length).trimEnd();
      return (
        <>
          {prefix} {icon}
        </>
      );
    }
  }

  return children;
}

function textOf(
  children: ReactNode,
): string {
  if (
    typeof children === "string" ||
    typeof children === "number"
  ) {
    return String(children);
  }

  if (Array.isArray(children)) {
    return children
      .map(textOf)
      .join("");
  }

  if (
    isValidElement<{
      children?: ReactNode;
    }>(children)
  ) {
    return textOf(
      children.props.children,
    );
  }

  return "";
}

function H2({
  children,
  className = "",
  id: providedId,
  ...props
}: ComponentProps<"h2">) {
  const id =
    providedId ??
    slugify(textOf(children));

  return (
    <h2
      {...props}
      id={id}
      className={`
        scroll-mt-28
        mb-5
        mt-14
        font-heading
        text-[calc(28px*var(--read-scale,1))]
        font-semibold
        leading-[1.15]
        tracking-[-0.025em]
        text-near-black
        sm:mb-6
        sm:mt-[72px]
        sm:text-[calc(34px*var(--read-scale,1))]
        ${className}
      `}
    >
      {withHeadingIcon(children)}
    </h2>
  );
}

function H3({
  children,
  className = "",
  id: providedId,
  ...props
}: ComponentProps<"h3">) {
  const id =
    providedId ??
    slugify(textOf(children));

  return (
    <h3
      {...props}
      id={id}
      className={`
        scroll-mt-28
        mb-4
        mt-9
        font-heading
        text-[calc(22px*var(--read-scale,1))]
        font-semibold
        leading-[1.2]
        tracking-[-0.015em]
        text-near-black
        sm:mt-12
        sm:text-[calc(25px*var(--read-scale,1))]
        ${className}
      `}
    >
      {children}
    </h3>
  );
}

function MdxImage({
  src,
  alt = "",
  title,
}: ComponentProps<"img">) {
  if (
    !src ||
    typeof src !== "string"
  ) {
    return null;
  }

  return (
    <figure className="relative left-1/2 my-10 w-screen -translate-x-1/2 sm:static sm:left-auto sm:my-12 sm:w-auto sm:translate-x-0">
      <div
        className="
          relative
          aspect-[16/10]
          w-full
          overflow-hidden
          bg-transparent
          sm:rounded-[6px]
        "
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes="700px"
          className="object-contain object-center"
        />
      </div>

      {(title || alt) && (
        <figcaption
          className="
            mx-auto
            mt-3
            max-w-[680px]
            px-5
            text-center
            text-[12px]
            leading-[1.45]
            text-muted
            sm:px-0
          "
        >
          <span>{title || alt}</span>
          {title && alt && <span className="ml-2 text-[#9a9da3]">· {alt}</span>}
        </figcaption>
      )}
    </figure>
  );
}

function Blockquote({
  children,
  className = "",
  ...props
}: ComponentProps<"blockquote">) {
  return (
    <blockquote
      {...props}
      className={`
        my-10
        border-l-2
        border-near-black
        pl-5
        font-heading
        text-[calc(21px*var(--read-scale,1))]
        font-medium
        leading-[1.45]
        tracking-[-0.015em]
        text-near-black
        sm:pl-6
        sm:text-[calc(24px*var(--read-scale,1))]
        ${className}
      `}
    >
      {children}
    </blockquote>
  );
}

function MdxLink({
  children,
  className = "",
  ...props
}: ComponentProps<"a">) {
  return (
    <a
      {...props}
      className={`
        underline
        decoration-black/25
        decoration-1
        underline-offset-[3px]
        transition-colors
        duration-150
        hover:text-electric
        hover:decoration-electric
        ${className}
      `}
    >
      {children}
    </a>
  );
}

function ListenToSpotify({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group my-8 flex items-center gap-3 py-3 font-heading text-[calc(19px*var(--read-scale,1))] font-medium leading-[1.3] text-near-black transition-colors hover:text-electric sm:gap-4"
    >
      <SpotifyLogoIcon aria-hidden="true" size={27} weight="fill" className="shrink-0 text-[#1DB954]" />
      <span>{children}</span>
    </a>
  );
}

const CALLOUT_STYLES = {
  default: {
    label: "Worth knowing",
  },

  quicktip: {
    label: "Quick tip",
  },

  worthknowing: {
    label: "Worth knowing",
  },

  remember: {
    label: "Remember",
  },

  trythis: {
    label: "Try this",
  },

  goodtoknow: {
    label: "Good to know",
  },
} as const;

function makeCallout(
  styleKey: keyof typeof CALLOUT_STYLES,
) {
  const style =
    CALLOUT_STYLES[styleKey];

  return function NamedCallout({
    children,
  }: {
    children: ReactNode;
  }) {
    return (
      <aside
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
          {style.label}
        </p>

        <div
          className="
            text-[calc(17px*var(--read-scale,1))]
            leading-[1.68]
            text-near-black
            [&>p:last-child]:mb-0
            sm:text-[calc(18px*var(--read-scale,1))]
          "
        >
          {children}
        </div>
      </aside>
    );
  };
}

export const mdxComponents = {
  h2: H2,
  h3: H3,

  img: MdxImage,
  blockquote: Blockquote,
  a: MdxLink,

  /*
   * Explicit short-answer component.
   *
   * Example MDX:
   *
   * <QuickAnswer text="The answer..." />
   */
  QuickAnswer,
  GameScreenshot,
  TripPlanner,
  ListenToSpotify,

  /*
   * Existing aliases remain supported so old articles
   * do not break, but they all share one restrained
   * editorial language.
   */
  Callout:
    makeCallout("default"),

  QuickTip:
    makeCallout("quicktip"),

  WorthKnowing:
    makeCallout(
      "worthknowing",
    ),

  Remember:
    makeCallout("remember"),

  TryThis:
    makeCallout("trythis"),

  GoodToKnow:
    makeCallout("goodtoknow"),
};
