"use client";
/* Draft previews accept local blob URLs, so native img is intentional here. */
/* eslint-disable @next/next/no-img-element */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CaretDown,
  CaretUp,
  Check,
  DotsThree,
  Image as ImageIcon,
  LinkSimple,
  ListBullets,
  ListNumbers,
  Minus,
  NotePencil,
  PaperPlaneTilt,
  Plus,
  Quotes,
  TextH,
  Trash,
  VideoCamera,
  X,
} from "@phosphor-icons/react";

import Container from "@/components/ui/Container";
import categories from "@/content/categories.json";
import { COMMUNITY_KEYWORDS } from "@/lib/community-keywords";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type TextBlockType =
  | "paragraph"
  | "heading"
  | "quote"
  | "bullets"
  | "numbers";

type TextBlock = {
  id: string;
  type: TextBlockType;
  text: string;
};

type DividerBlock = {
  id: string;
  type: "divider";
};

type VideoBlock = {
  id: string;
  type: "video";
  url: string;
  caption: string;
};

type StoryBlock = TextBlock | DividerBlock | VideoBlock;

type Draft = {
  name: string;
  title: string;
  deck: string;
  category: string;

  blocks: StoryBlock[];

  keywords: string[];
  reactions: string[];

  readerQuestion: string;
  pollOptions: string[];

  coverAlt: string;
  coverCredit: string;
  consentAccepted: boolean;
  consentVersion: string;
};

type StarterId =
  | "story"
  | "explainer"
  | "take"
  | "list";

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const STORAGE_KEY = "brisastory:community:studio:v5";
const OLD_STORAGE_KEYS = [
  "brisastory:community:studio:v4",
  "brisastory:community:studio:v3",
];


const reactionChoices = ["❤️", "🔥", "😂", "👀", "💬"];

const initialPollOptions = ["", ""];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function makeId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `block-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function paragraph(text = ""): TextBlock {
  return {
    id: makeId(),
    type: "paragraph",
    text,
  };
}

function heading(text = ""): TextBlock {
  return {
    id: makeId(),
    type: "heading",
    text,
  };
}

function createInitialDraft(): Draft {
  return {
    name: "",
    title: "",
    deck: "",
    category: "culture",

    blocks: [paragraph("")],

    keywords: [],
    reactions: ["❤️", "🔥", "😂"],

    readerQuestion: "",
    pollOptions: [...initialPollOptions],

    coverAlt: "",
    coverCredit: "",
    consentAccepted: false,
    consentVersion: "community-v1",
  };
}

function restoreDraft(value: unknown): Draft {
  const empty = createInitialDraft();

  if (!value || typeof value !== "object") {
    return empty;
  }

  const old = value as Partial<Draft> & {
    story?: string;
  };

  let blocks = old.blocks;

  if (!Array.isArray(blocks) || blocks.length === 0) {
    blocks = [
      paragraph(
        typeof old.story === "string"
          ? old.story
          : "",
      ),
    ];
  }

  return {
    ...empty,
    ...old,

    blocks,

    keywords: Array.isArray(old.keywords)
      ? old.keywords
      : [],

    reactions: Array.isArray(old.reactions)
      ? old.reactions
      : empty.reactions,

    pollOptions: Array.isArray(old.pollOptions)
      ? old.pollOptions
      : [...initialPollOptions],
  };
}

function plainText(blocks: StoryBlock[]) {
  return blocks
    .map((block) => {
      if (block.type === "divider") {
        return "";
      }

      if (block.type === "video") {
        return block.caption;
      }

      return block.text;
    })
    .filter(Boolean)
    .join("\n\n");
}

function wordCount(blocks: StoryBlock[]) {
  const text = plainText(blocks).trim();

  if (!text) {
    return 0;
  }

  return text.split(/\s+/).filter(Boolean).length;
}

/* -------------------------------------------------------------------------- */
/* Manual starter outlines                                                    */
/* -------------------------------------------------------------------------- */

function buildStarter(id: StarterId): StoryBlock[] {
  switch (id) {
    case "story":
      return [
        paragraph(""),
        heading("What happened"),
        paragraph(""),
        heading("Why it stuck with me"),
        paragraph(""),
        heading("What I took from it"),
        paragraph(""),
      ];

    case "explainer":
      return [
        paragraph(""),
        heading("First, what is it?"),
        paragraph(""),
        heading("Why people are talking about it"),
        paragraph(""),
        heading("What actually matters"),
        paragraph(""),
        heading("The bottom line"),
        paragraph(""),
      ];

    case "take":
      return [
        paragraph(""),
        heading("Here’s the thing"),
        paragraph(""),
        heading("Why I see it differently"),
        paragraph(""),
        heading("What people miss"),
        paragraph(""),
      ];

    case "list":
      return [
        paragraph(""),
        heading("Start here"),
        {
          id: makeId(),
          type: "numbers",
          text: "",
        },
        heading("My pick"),
        paragraph(""),
      ];

    default:
      return [paragraph("")];
  }
}

/* -------------------------------------------------------------------------- */
/* Block menu                                                                 */
/* -------------------------------------------------------------------------- */

function AddMenu({
  onSelect,
  onClose,
}: {
  onSelect: (type: StoryBlock["type"]) => void;
  onClose: () => void;
}) {
  const [more, setMore] = useState(false);
  const items: Array<{
    type: StoryBlock["type"];
    title: string;
    subtitle: string;
    icon: React.ReactNode;
  }> = [
    {
      type: "paragraph",
      title: "Text",
      subtitle: "Just keep writing",
      icon: <NotePencil size={19} />,
    },
    {
      type: "heading",
      title: "Heading",
      subtitle: "Start a new thought",
      icon: <TextH size={19} />,
    },
    {
      type: "quote",
      title: "Quote",
      subtitle: "Make one line stand out",
      icon: <Quotes size={19} />,
    },
    {
      type: "bullets",
      title: "Bullet list",
      subtitle: "Quick points",
      icon: <ListBullets size={19} />,
    },
    {
      type: "numbers",
      title: "Numbered list",
      subtitle: "Steps or rankings",
      icon: <ListNumbers size={19} />,
    },
    {
      type: "video",
      title: "Video",
      subtitle: "YouTube, Vimeo or approved link",
      icon: <VideoCamera size={19} />,
    },
    {
      type: "divider",
      title: "Break",
      subtitle: "Give the story some air",
      icon: <Minus size={19} />,
    },
  ];

  const visibleItems = more ? items : items.filter((item) => ["paragraph", "heading", "quote"].includes(item.type));
  return (
    <div
        className="
        relative z-50 w-[min(360px,calc(100vw-24px))] sm:w-[220px]
        overflow-hidden rounded-[12px]
        border border-black/[0.08]
        bg-white
        shadow-[0_20px_55px_rgba(0,0,0,0.13)]
      "
    >
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <span className="text-[11px] font-semibold text-black/40">
          Add to your story
        </span>

        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1.5 hover:bg-black/[0.05]"
        >
          <X size={15} />
        </button>
      </div>

      <div className="space-y-0.5 p-1.5">
        {visibleItems.map((item) => (
          <button
            key={item.type}
            type="button"
            onClick={() =>
              onSelect(item.type)
            }
            className="
              flex min-h-10 w-full items-center gap-3 rounded-[8px] px-3 py-2 text-left
              transition hover:bg-[#f5f4f1]
            "
          >
            <span
              className="flex h-6 w-6 items-center justify-center text-[#6252d9]"
            >
              {item.icon}
            </span>

            <span className="block text-sm font-medium">
              {item.title}
            </span>
          </button>
        ))}
        <button type="button" onClick={() => setMore((value) => !value)} className="flex min-h-10 w-full items-center gap-3 rounded-[8px] px-3 py-2 text-left text-sm font-medium text-black/60 transition hover:bg-[#f5f4f1]"><DotsThree size={20} /> {more ? "Less" : "More"}</button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Block actions                                                              */
/* -------------------------------------------------------------------------- */

function BlockActions({
  canMoveUp,
  canMoveDown,
  onUp,
  onDown,
  onDelete,
}: {
  canMoveUp: boolean;
  canMoveDown: boolean;
  onUp: () => void;
  onDown: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="
        absolute right-0 top-0 z-20
        flex items-center rounded-full
        border border-black/[0.07]
        bg-white p-0.5
        opacity-0 shadow-sm transition
        group-focus-within:opacity-100
        group-hover:opacity-100
      "
    >
      <button
        type="button"
        aria-label="Move block up"
        disabled={!canMoveUp}
        onClick={onUp}
        className="
          rounded-full p-1.5 text-black/35
          hover:bg-black/[0.04]
          hover:text-black
          disabled:opacity-20
        "
      >
        <CaretUp size={13} />
      </button>

      <button
        type="button"
        aria-label="Move block down"
        disabled={!canMoveDown}
        onClick={onDown}
        className="
          rounded-full p-1.5 text-black/35
          hover:bg-black/[0.04]
          hover:text-black
          disabled:opacity-20
        "
      >
        <CaretDown size={13} />
      </button>

      <button
        type="button"
        aria-label="Delete block"
        onClick={onDelete}
        className="
          rounded-full p-1.5 text-black/35
          hover:bg-red-50
          hover:text-red-600
        "
      >
        <Trash size={13} />
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Story block                                                                */
/* -------------------------------------------------------------------------- */

function StoryBlockView({
  block,
  index,
  total,
  menuOpen,
  onToggleMenu,
  onInsertAfter,
  onChange,
  onDelete,
  onMove,
  onEnter,
}: {
  block: StoryBlock;
  index: number;
  total: number;
  menuOpen: boolean;

  onToggleMenu: () => void;
  onInsertAfter: (
    type: StoryBlock["type"],
  ) => void;

  onChange: (block: StoryBlock) => void;
  onDelete: () => void;

  onMove: (
    direction: "up" | "down",
  ) => void;

  onEnter: () => void;
}) {
  const textareaRef =
    useRef<HTMLTextAreaElement | null>(null);

  function autosize() {
    const element = textareaRef.current;

    if (!element) {
      return;
    }

    element.style.height = "0px";
    element.style.height = `${Math.max(
      element.scrollHeight,
      34,
    )}px`;
  }

  useEffect(() => {
    autosize();
  }, [block]);

  function handleKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) {
    if (
      event.key === "/" &&
      event.currentTarget.value === ""
    ) {
      event.preventDefault();
      onToggleMenu();
      return;
    }

    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.metaKey &&
      !event.ctrlKey
    ) {
      event.preventDefault();
      onEnter();
    }
  }

  if (block.type === "divider") {
    return (
      <div className="group relative py-7">
        <div className="flex items-center gap-4">
          <span className="h-px flex-1 bg-black/[0.09]" />
          <span className="text-[9px] text-black/25">
            ✦
          </span>
          <span className="h-px flex-1 bg-black/[0.09]" />
        </div>

        <BlockActions
          canMoveUp={index > 0}
          canMoveDown={index < total - 1}
          onUp={() => onMove("up")}
          onDown={() => onMove("down")}
          onDelete={onDelete}
        />
      </div>
    );
  }

  if (block.type === "video") {
    return (
      <div
        className="
          group relative rounded-[18px]
          border border-black/[0.08]
          bg-[#f7f6f3] p-4
        "
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-black/50">
          <VideoCamera size={17} />
          Video
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-xl bg-white px-3">
          <LinkSimple
            size={16}
            className="shrink-0 text-black/30"
          />

          <input
            value={block.url}
            onChange={(event) =>
              onChange({
                ...block,
                url: event.target.value,
              })
            }
            placeholder="Paste an approved YouTube, Vimeo or video link"
            className="
              h-11 w-full border-0
              bg-transparent text-sm
              outline-none
              placeholder:text-black/25
            "
          />
        </div>

        <input
          value={block.caption}
          onChange={(event) =>
            onChange({
              ...block,
              caption:
                event.target.value,
            })
          }
          placeholder="Optional caption"
          className="
            mt-2 w-full border-0
            bg-transparent px-1 py-2
            text-xs text-black/50
            outline-none
            placeholder:text-black/25
          "
        />

        <BlockActions
          canMoveUp={index > 0}
          canMoveDown={index < total - 1}
          onUp={() => onMove("up")}
          onDown={() => onMove("down")}
          onDelete={onDelete}
        />
      </div>
    );
  }

  const style =
    block.type === "heading"
      ? `
          font-heading text-[24px]
          font-semibold leading-[1.08]
          tracking-[-0.035em]
          text-[#171614]
          sm:text-[34px]
        `
      : block.type === "quote"
        ? `
          font-heading text-[23px]
          italic leading-[1.45]
          tracking-[-0.02em]
          text-[#292724]
          sm:text-[27px]
        `
      : block.type === "bullets" ||
          block.type === "numbers"
        ? `
          text-[16px] leading-[1.65]
          text-[#302e2b]
          sm:text-[18px]
        `
      : `
          text-[17px] leading-[1.65]
          text-[#302e2b]
          sm:text-[19px]
        `;

  const placeholder =
    block.type === "heading"
      ? "Give this part a name…"
      : block.type === "quote"
        ? "The line people will remember…"
        : block.type === "bullets"
          ? "One point per line…"
          : block.type === "numbers"
            ? "One step per line…"
            : index === 0
              ? "Start wherever the story actually starts…"
              : "Keep going…";

  return (
    <div
      className={`
        group relative
        ${
          block.type === "quote"
            ? "border-l-2 border-[#6252d9]/65 pl-5"
            : ""
        }
      `}
    >
      <textarea
        ref={textareaRef}
        value={block.text}
        rows={1}
        placeholder={placeholder}
        onChange={(event) => {
          onChange({
            ...block,
            text: event.target.value,
          });

          autosize();
        }}
        onKeyDown={handleKeyDown}
        className={`
          block min-h-[34px] w-full
          resize-none overflow-hidden
          border-0 bg-transparent pr-10
          outline-none
          placeholder:text-black/[0.18]
          ${style}
        `}
      />

      <BlockActions
        canMoveUp={index > 0}
        canMoveDown={index < total - 1}
        onUp={() => onMove("up")}
        onDown={() => onMove("down")}
        onDelete={onDelete}
      />

      <div
        className="
          absolute -left-9 top-1
          hidden sm:block
        "
      >
        <button
          type="button"
          onClick={onToggleMenu}
          className="
            flex h-7 w-7 items-center
            justify-center rounded-full
            text-black/25 opacity-0
            transition
            hover:bg-black/[0.05]
            hover:text-black/60
            group-hover:opacity-100
            group-focus-within:opacity-100
          "
        >
          <Plus size={15} />
        </button>

        {menuOpen && (
          <div className="absolute left-8 top-0">
            <AddMenu
              onSelect={onInsertAfter}
              onClose={onToggleMenu}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Empty story starter                                                        */
/* -------------------------------------------------------------------------- */

function QuickStart({
  onChoose,
}: {
  onChoose: (id: StarterId) => void;
}) {
  const options: Array<{
    id: StarterId;
    title: string;
    subtitle: string;
  }> = [
    {
      id: "story",
      title: "Tell a story",
      subtitle: "Something happened",
    },
    {
      id: "explainer",
      title: "Explain something",
      subtitle: "Make it make sense",
    },
    {
      id: "take",
      title: "Give your take",
      subtitle: "Say what you actually think",
    },
    {
      id: "list",
      title: "Make a list",
      subtitle: "Fast, useful, easy to scan",
    },
  ];

  return (
    <section className="mt-9">
      <p className="text-xs text-black/38">
        Not sure how to start?
      </p>

      <div
        className="
          mt-3 grid grid-cols-2
          gap-2 sm:grid-cols-4
        "
      >
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() =>
              onChoose(option.id)
            }
            className="
              rounded-[16px]
              border border-black/[0.07]
              bg-white px-3 py-3
              text-left transition
              hover:-translate-y-[1px]
              hover:border-black/[0.13]
              hover:shadow-sm
            "
          >
            <span className="block text-[13px] font-semibold">
              {option.title}
            </span>

            <span className="mt-1 block text-[11px] leading-snug text-black/38">
              {option.subtitle}
            </span>
          </button>
        ))}
      </div>

      <p className="mt-3 text-[11px] text-black/28">
        These only add structure. You still write every word.
      </p>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Finish sheet                                                               */
/* -------------------------------------------------------------------------- */

function FinishSheet({
  draft,
  cover: _cover,
  coverUrl,
  keywordOptions,
  readyChecks,
  message,
  busy,
  setDraft,
  setCover,
  onClose,
  onSubmit,
}: {
  draft: Draft;

  cover: File | null;
  coverUrl: string;

  keywordOptions: string[];

  readyChecks: Array<{
    label: string;
    done: boolean;
  }>;

  message: string;
  busy: boolean;

  setDraft: React.Dispatch<
    React.SetStateAction<Draft>
  >;

  setCover: (
    value: File | null,
  ) => void;

  onClose: () => void;
  onSubmit: () => void;
}) {
  void _cover;
  const allReady = readyChecks.every(
    (item) => item.done,
  );

  function patch(
    values: Partial<Draft>,
  ) {
    setDraft((current) => ({
      ...current,
      ...values,
    }));
  }

  function updatePoll(
    index: number,
    value: string,
  ) {
    const next = [...draft.pollOptions];

    next[index] = value;

    patch({
      pollOptions: next,
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/25"
        aria-label="Close"
      />

      <aside
        className="
          fixed bottom-0 right-0 top-0
          z-50 w-full
          overflow-y-auto
          bg-[#fbfaf7]
          shadow-[-30px_0_80px_rgba(0,0,0,0.1)]
          sm:max-w-[430px]
        "
      >
        <header
          className="
            sticky top-0 z-10
            flex items-center
            justify-between
            border-b border-black/[0.07]
            bg-[#fbfaf7]/95
            px-5 py-4
            backdrop-blur-xl
          "
        >
          <div>
            <h2 className="font-heading text-2xl font-semibold tracking-[-0.03em]">
              Finish it
            </h2>

            <p className="mt-0.5 text-xs text-black/38">
              A few things before review.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 hover:bg-black/[0.05]"
          >
            <X size={19} />
          </button>
        </header>

        <div className="space-y-10 px-5 py-7">
          {/* Checklist */}

          <section>
            <p className="text-[11px] font-semibold text-black/42">
              Your story
            </p>

            <div className="mt-3 space-y-2">
              {readyChecks.map(
                (item) => (
                  <div
                    key={item.label}
                    className="
                      flex items-center
                      justify-between
                      rounded-[13px]
                      bg-white px-3.5 py-3
                    "
                  >
                    <span className="text-sm text-black/65">
                      {item.label}
                    </span>

                    <span
                      className={`
                        flex h-5 w-5
                        items-center
                        justify-center
                        rounded-full
                        ${
                          item.done
                            ? "bg-[#6252d9] text-white"
                            : "border border-black/10 text-transparent"
                        }
                      `}
                    >
                      <Check size={12} />
                    </span>
                  </div>
                ),
              )}
            </div>
          </section>

          {/* Category */}

          <section>
            <label className="text-[11px] font-semibold text-black/42">
              Where does it belong?
            </label>

            <select
              value={draft.category}
              onChange={(event) =>
                patch({
                  category:
                    event.target.value,
                  keywords: [],
                })
              }
              className="
                mt-3 h-12 w-full
                rounded-[14px]
                border border-black/[0.08]
                bg-white px-4
                text-sm outline-none
              "
            >
              {categories
                .filter(
                  (category) =>
                    !category.hidden,
                )
                .map((category) => (
                  <option
                    key={category.slug}
                    value={category.slug}
                  >
                    {category.name}
                  </option>
                ))}
            </select>
          </section>

          {/* Keywords */}

          <section>
            <div className="flex justify-between">
              <label className="text-[11px] font-semibold text-black/42">
                What is it about?
              </label>

              <span className="text-[11px] text-black/28">
                {draft.keywords.length}/5
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {keywordOptions.map(
                (keyword) => {
                  const selected =
                    draft.keywords.includes(
                      keyword,
                    );

                  return (
                    <button
                      key={keyword}
                      type="button"
                      onClick={() =>
                        patch({
                          keywords: selected
                            ? draft.keywords.filter(
                                (item) =>
                                  item !==
                                  keyword,
                              )
                            : [
                                ...draft.keywords,
                                keyword,
                              ].slice(
                                0,
                                5,
                              ),
                        })
                      }
                      className={`
                        rounded-full
                        border px-3 py-1.5
                        text-xs transition
                        ${
                          selected
                            ? "border-[#6252d9] bg-[#6252d9] text-white"
                            : "border-black/[0.08] bg-white text-black/55"
                        }
                      `}
                    >
                      {keyword}
                    </button>
                  );
                },
              )}
            </div>
          </section>

          {/* Cover details */}

          {coverUrl && (
            <section>
              <label className="text-[11px] font-semibold text-black/42">
                Cover
              </label>

              <div className="mt-3 overflow-hidden rounded-[16px] bg-white">
                <img
                  src={coverUrl}
                  alt=""
                  className="aspect-[16/8] w-full object-cover"
                />

                <div className="space-y-2 p-3">
                  <label className="block text-xs font-semibold text-black/55">Alternative text (required for accessibility)<input
                    value={draft.coverAlt}
                    onChange={(event) =>
                      patch({
                        coverAlt:
                          event.target
                            .value,
                      })
                    }
                    placeholder="Describe what matters in the image"
                    className="
                      w-full border-0
                      border-b
                      border-black/[0.07]
                      bg-transparent
                      py-2 text-sm
                      outline-none
                    "
                  /></label>

                  <label className="block text-xs font-semibold text-black/55">Image credit (if needed)<input
                    value={
                      draft.coverCredit
                    }
                    onChange={(event) =>
                      patch({
                        coverCredit:
                          event.target
                            .value,
                      })
                    }
                    placeholder="Photographer or source"
                    className="
                      w-full border-0
                      bg-transparent py-2
                      text-sm outline-none
                    "
                  /></label>

                  <button
                    type="button"
                    onClick={() =>
                      setCover(null)
                    }
                    className="text-xs font-semibold text-red-500"
                  >
                    Remove cover
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Reactions */}

          <section>
            <label className="text-[11px] font-semibold text-black/42">
              How can readers react?
            </label>

            <div className="mt-3 flex gap-2">
              {reactionChoices.map(
                (emoji) => {
                  const active =
                    draft.reactions.includes(
                      emoji,
                    );

                  return (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() =>
                        patch({
                          reactions: active
                            ? draft.reactions.filter(
                                (item) =>
                                  item !== emoji,
                              )
                            : [
                                ...draft.reactions,
                                emoji,
                              ].slice(
                                0,
                                5,
                              ),
                        })
                      }
                      className={`
                        flex h-11 w-11
                        items-center
                        justify-center
                        rounded-full
                        border text-lg
                        ${
                          active
                            ? "border-[#6252d9]/25 bg-[#eeecfb]"
                            : "border-black/[0.07] bg-white opacity-40"
                        }
                      `}
                    >
                      {emoji}
                    </button>
                  );
                },
              )}
            </div>
          </section>

          {/* Reader question */}

          <section>
            <label className="text-[11px] font-semibold text-black/42">
              Ask your readers
            </label>

            <p className="mt-1 text-[11px] leading-relaxed text-black/35">
              Optional. Something people can actually answer.
            </p>

            <input
              value={draft.readerQuestion}
              onChange={(event) =>
                patch({
                  readerQuestion:
                    event.target.value,
                })
              }
              placeholder="Would you try this?"
              className="
                mt-3 h-12 w-full
                rounded-[14px]
                border border-black/[0.08]
                bg-white px-4 text-sm
                outline-none
              "
            />

            {draft.readerQuestion && (
              <div className="mt-2 space-y-2">
                {draft.pollOptions.map(
                  (option, index) => (
                    <div
                      key={index}
                      className="flex gap-2"
                    >
                      <input
                        value={option}
                        onChange={(event) =>
                          updatePoll(
                            index,
                            event.target
                              .value,
                          )
                        }
                        placeholder={`Option ${
                          index + 1
                        }`}
                        className="
                          h-11 flex-1
                          rounded-[12px]
                          border
                          border-black/[0.08]
                          bg-white px-3
                          text-sm outline-none
                        "
                      />

                      {draft.pollOptions
                        .length > 2 && (
                        <button
                          type="button"
                          onClick={() =>
                            patch({
                              pollOptions:
                                draft.pollOptions.filter(
                                  (
                                    _,
                                    optionIndex,
                                  ) =>
                                    optionIndex !==
                                    index,
                                ),
                            })
                          }
                          className="px-2 text-black/30 hover:text-red-500"
                        >
                          <X size={15} />
                        </button>
                      )}
                    </div>
                  ),
                )}

                {draft.pollOptions.length <
                  4 && (
                  <button
                    type="button"
                    onClick={() =>
                      patch({
                        pollOptions: [
                          ...draft.pollOptions,
                          "",
                        ],
                      })
                    }
                    className="mt-1 text-xs font-semibold text-[#6252d9]"
                  >
                    + Add another option
                  </button>
                )}
              </div>
            )}
          </section>

          {message && (
            <p
              className="
                rounded-[14px]
                bg-[#f1effc]
                px-4 py-3
                text-sm leading-relaxed
                text-[#4f43ad]
              "
            >
              {message}
            </p>
          )}
        </div>

        <footer
          className="
            sticky bottom-0
            border-t border-black/[0.07]
            bg-[#fbfaf7]/95
            p-4 backdrop-blur-xl
          "
        >
          <label className="mb-3 flex items-start gap-3 text-xs leading-5 text-black/60"><input type="checkbox" checked={draft.consentAccepted} onChange={(event) => patch({ consentAccepted: event.target.checked })} className="mt-1 h-4 w-4" />I created this story or have permission to submit it, have permission to use its media, and agree to the BrisaStory Community Guidelines.</label>
          <button
            type="button"
            disabled={
              busy || !allReady
            }
            onClick={onSubmit}
            className="
              flex h-12 w-full
              items-center
              justify-center gap-2
              rounded-full
              bg-[#171614]
              text-sm font-bold
              text-white
              transition
              disabled:cursor-not-allowed
              disabled:opacity-30
            "
          >
            <PaperPlaneTilt size={17} />

            {busy
              ? "Sending…"
              : "Submit for review"}
          </button>

          {!allReady && (
            <p className="mt-2 text-center text-[11px] text-black/30">
              Finish the items above first.
            </p>
          )}
        </footer>
      </aside>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Main                                                                       */
/* -------------------------------------------------------------------------- */

export default function CommunityWriter() {
  const [draft, setDraft] =
    useState<Draft>(() =>
      createInitialDraft(),
    );

  const [cover, setCover] =
    useState<File | null>(null);

  const [coverUrl, setCoverUrl] =
    useState("");

  const [
    addMenuIndex,
    setAddMenuIndex,
  ] = useState<number | null>(null);

  const [
    bottomAddOpen,
    setBottomAddOpen,
  ] = useState(false);

  const [
    finishOpen,
    setFinishOpen,
  ] = useState(false);

  const [message, setMessage] =
    useState("");
  const [turnstileToken, setTurnstileToken] = useState("");

  const [busy, setBusy] =
    useState(false);

  const [hydrated, setHydrated] =
    useState(false);
  const [communityUser, setCommunityUser] = useState<{ id: string; email: string; name?: string } | null>(null);
  const [serverDraftLoaded, setServerDraftLoaded] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<"mobile" | "desktop">("mobile");
  const [saveState, setSaveState] = useState<"unsaved" | "saving" | "saved">("unsaved");
  const [uploadState, setUploadState] = useState<"idle" | "uploading">("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [coverX, setCoverX] = useState(50);
  const [coverY, setCoverY] = useState(50);
  const historyRef = useRef<Draft[]>([]);
  const redoRef = useRef<Draft[]>([]);
  const historySkipRef = useRef(false);

  /* ---------------------------------------------------------------------- */
  /* Restore                                                                */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    const handler = (event: Event) => setTurnstileToken((event as CustomEvent<string>).detail ?? "");
    window.addEventListener("community-turnstile", handler);
    return () => window.removeEventListener("community-turnstile", handler);
  }, []);

  useEffect(() => {
    try {
      const current =
        localStorage.getItem(
          STORAGE_KEY,
        );

      if (current) {
        queueMicrotask(() => setDraft(restoreDraft(JSON.parse(current))));

        return;
      }

      for (const key of OLD_STORAGE_KEYS) {
        const old =
          localStorage.getItem(key);

        if (old) {
          queueMicrotask(() => setDraft(restoreDraft(JSON.parse(old))));

          break;
        }
      }
    } catch {
      // Ignore broken local drafts.
    } finally {
      queueMicrotask(() => setHydrated(true));
    }
  }, []);

  useEffect(() => {
    fetch("/api/community/auth/current", { credentials: "include" })
      .then(async (response) => response.ok ? setCommunityUser((await response.json()).user) : undefined)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!communityUser) { queueMicrotask(() => setServerDraftLoaded(false)); return; }
    fetch("/api/community/drafts", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) return;
        const data = await response.json();
        if (data.draft?.value) {
          try { queueMicrotask(() => setDraft(restoreDraft(JSON.parse(data.draft.value)))); } catch { /* keep local draft */ }
        }
        setServerDraftLoaded(true);
      })
      .catch(() => setServerDraftLoaded(true));
  }, [communityUser]);

  /* ---------------------------------------------------------------------- */
  /* Autosave                                                               */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(draft),
      );
      queueMicrotask(() => setSaveState("saved"));
    } catch {
      queueMicrotask(() => setSaveState("unsaved"));
    }
  }, [draft, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (historySkipRef.current) {
      historySkipRef.current = false;
      return;
    }
    const last = historyRef.current.at(-1);
    if (!last || JSON.stringify(last) !== JSON.stringify(draft)) {
      historyRef.current = [...historyRef.current, draft].slice(-50);
      redoRef.current = [];
    }
  }, [draft, hydrated]);

  function undo() {
    if (historyRef.current.length < 2) return;
    const current = historyRef.current.pop()!;
    redoRef.current.push(current);
    historySkipRef.current = true;
    setDraft(historyRef.current.at(-1)!);
  }

  function redo() {
    const next = redoRef.current.pop();
    if (!next) return;
    historyRef.current.push(next);
    historySkipRef.current = true;
    setDraft(next);
  }

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (saveState !== "saved" || busy) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [saveState, busy]);

  useEffect(() => {
    if (!communityUser || !serverDraftLoaded || !hydrated) return;
    const timer = window.setTimeout(() => {
      fetch("/api/community/drafts", { method: "PUT", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: draft.title, value: JSON.stringify(draft) }) }).catch(() => undefined);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [draft, communityUser, serverDraftLoaded, hydrated]);

  /* ---------------------------------------------------------------------- */
  /* Cover                                                                  */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (!cover) {
      queueMicrotask(() => setCoverUrl(""));
      return;
    }

    const next =
      URL.createObjectURL(cover);

    queueMicrotask(() => setCoverUrl(next));

    return () =>
      URL.revokeObjectURL(next);
  }, [cover]);

  const words = useMemo(
    () => wordCount(draft.blocks),
    [draft.blocks],
  );

  const readingTime = Math.max(
    1,
    Math.ceil(words / 220),
  );

  const keywordOptions =
    COMMUNITY_KEYWORDS[
      draft.category
    ] ??
    COMMUNITY_KEYWORDS.culture;

  const hasRealBody =
    plainText(draft.blocks).trim()
      .length >= 20;

  const emptyBody =
    draft.blocks.length === 1 &&
    draft.blocks[0].type ===
      "paragraph" &&
    draft.blocks[0].text.trim() === "";

  const readyChecks = [
    {
      label: "Byline",
      done:
        draft.name.trim().length >
        0,
    },
    {
      label: "Headline",
      done:
        draft.title.trim().length >=
        5,
    },
    {
      label: "Story",
      done: hasRealBody,
    },
    {
      label: "Cover image",
      done: Boolean(cover) && draft.coverAlt.trim().length > 0,
    },
    {
      label: "Rights and guidelines",
      done: draft.consentAccepted,
    },
  ];

  /* ---------------------------------------------------------------------- */
  /* Draft operations                                                       */
  /* ---------------------------------------------------------------------- */

  function patch(
    values: Partial<Draft>,
  ) {
    setDraft((current) => ({
      ...current,
      ...values,
    }));
  }

  function replaceBlock(
    id: string,
    next: StoryBlock,
  ) {
    setDraft((current) => ({
      ...current,
      blocks: current.blocks.map(
        (block) =>
          block.id === id
            ? next
            : block,
      ),
    }));
  }

  function createBlock(
    type: StoryBlock["type"],
  ): StoryBlock {
    if (type === "divider") {
      return {
        id: makeId(),
        type: "divider",
      };
    }

    if (type === "video") {
      return {
        id: makeId(),
        type: "video",
        url: "",
        caption: "",
      };
    }

    return {
      id: makeId(),
      type,
      text: "",
    };
  }

  function insertAfter(
    index: number,
    type: StoryBlock["type"],
  ) {
    setDraft((current) => {
      const blocks = [
        ...current.blocks,
      ];

      blocks.splice(
        index + 1,
        0,
        createBlock(type),
      );

      return {
        ...current,
        blocks,
      };
    });

    setAddMenuIndex(null);
    setBottomAddOpen(false);
  }

  function appendBlock(
    type: StoryBlock["type"],
  ) {
    setDraft((current) => ({
      ...current,
      blocks: [
        ...current.blocks,
        createBlock(type),
      ],
    }));

    setBottomAddOpen(false);
  }

  function deleteBlock(id: string) {
    setDraft((current) => {
      const remaining =
        current.blocks.filter(
          (block) =>
            block.id !== id,
        );

      return {
        ...current,
        blocks:
          remaining.length > 0
            ? remaining
            : [paragraph("")],
      };
    });
  }

  function moveBlock(
    index: number,
    direction: "up" | "down",
  ) {
    setDraft((current) => {
      const next = [
        ...current.blocks,
      ];

      const target =
        direction === "up"
          ? index - 1
          : index + 1;

      if (
        target < 0 ||
        target >= next.length
      ) {
        return current;
      }

      [next[index], next[target]] = [
        next[target],
        next[index],
      ];

      return {
        ...current,
        blocks: next,
      };
    });
  }

  function chooseStarter(
    id: StarterId,
  ) {
    patch({
      blocks: buildStarter(id),
    });
  }

  function acceptCover(
    file: File | null,
  ) {
    if (!file) {
      return;
    }

    const accepted = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (file.size > 10 * 1024 * 1024) {
      setMessage("Cover images must be 10 MB or smaller. Choose a JPG, PNG or WebP image.");
      return;
    }
    if (
      !accepted.includes(file.type)
    ) {
      setMessage(
        "Use a JPG, PNG or WebP image.",
      );
      return;
    }

    setCover(file);
    setCoverX(50);
    setCoverY(50);
    setMessage("");
  }

  /* ---------------------------------------------------------------------- */
  /* Serialize                                                              */
  /* ---------------------------------------------------------------------- */

  function serializeBlocks() {
    return draft.blocks.map(
      (block) => {
        if (
          block.type === "divider"
        ) {
          return {
            id: block.id,
            type: "paragraph",
            style: "divider",
            text: "—",
          };
        }

        if (
          block.type === "video"
        ) {
          return {
            id: block.id,
            type: "video",
            provider: "external",
            url: block.url.trim(),
            caption:
              block.caption.trim(),
          };
        }

        return {
          id: block.id,
          type: "paragraph",
          style: block.type,
          text: block.text,
        };
      },
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Submit                                                                 */
  /* ---------------------------------------------------------------------- */

  async function submit() {
    if (busy) {
      return;
    }

    setMessage("");

    if (
      !readyChecks.every(
        (item) => item.done,
      )
    ) {
      setMessage(
        "Finish the required parts first.",
      );
      return;
    }

    setBusy(true);

    try {
      const auth = await fetch(
        "/api/community/media/authorize",
        {
          method: "POST",

          credentials: "include",

          headers: {
            "content-type":
              "application/json",
          },

          body: JSON.stringify({
            mediaType: "cover",
            mimeType: cover!.type,
            size: cover!.size,
          }),
        },
      );

      const authorization =
        await auth.json();

      if (!auth.ok) {
        throw new Error(
          authorization.error ??
            "Could not prepare the image upload.",
        );
      }

      setUploadState("uploading");
      const upload = await new Promise<boolean>((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open("PUT", authorization.uploadUrl);
        request.setRequestHeader("Content-Type", cover!.type);
        request.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) setUploadProgress(Math.round((event.loaded / event.total) * 100));
        });
        request.addEventListener("load", () => resolve(request.status >= 200 && request.status < 300));
        request.addEventListener("error", () => reject(new Error("Image upload failed. Check your connection and try again.")));
        request.send(cover);
      });
      if (!upload) throw new Error("Image upload failed. Check your connection and try again.");
      setUploadState("idle");
      setUploadProgress(100);

      const validPollOptions =
        draft.pollOptions
          .map((option) =>
            option.trim(),
          )
          .filter(Boolean)
          .slice(0, 4);

      const contextualPoll =
        draft.readerQuestion.trim() &&
        validPollOptions.length >= 2
          ? {
              question:
                draft.readerQuestion.trim(),
              options:
                validPollOptions,
            }
          : undefined;

      const response = await fetch(
        "/api/community/submissions",
        {
          method: "POST",

          credentials: "include",

          headers: {
            "content-type":
              "application/json",
          },

          body: JSON.stringify({
            displayName:
              draft.name.trim(),

            title:
              draft.title.trim(),

            category:
              draft.category,

            tags: draft.keywords,

            description:
              draft.deck.trim(),

            content: JSON.stringify({
              version: 2,

              blocks: serializeBlocks().map((block) => block.type === "video"
                ? { id: block.id, type: "video", media: { caption: block.caption, alt: "", url: block.url } }
                : { id: block.id, type: "paragraph", text: block.text }),

              contextualPoll,
            }),

            coverMediaId:
              authorization.mediaId,

            coverAlt:
              draft.coverAlt.trim(),

            coverCredit:
              draft.coverCredit.trim(),

            consentAccepted: draft.consentAccepted,
            consentVersion: draft.consentVersion,

            reactions:
              draft.reactions,

            readerQuestion:
              draft.readerQuestion.trim(),

            idempotencyKey:
              crypto.randomUUID(),

            turnstileToken,
          }),
        },
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ??
            "Submission failed.",
        );
      }

      localStorage.removeItem(
        STORAGE_KEY,
      );

      OLD_STORAGE_KEYS.forEach(
        (key) =>
          localStorage.removeItem(
            key,
          ),
      );

      setMessage(
        "Sent. We’ll review it before it goes live.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Submission failed.",
      );
    } finally {
      setBusy(false);
      setUploadState("idle");
      setUploadProgress(0);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Render                                                                 */
  /* ---------------------------------------------------------------------- */

  return (
    <main className="min-h-screen bg-[#fbfaf7] pb-24 sm:pb-10">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                             */}
      {/* ------------------------------------------------------------------ */}

      <header
        className="
          sticky top-0 z-30
          border-b border-black/[0.06]
          bg-[#fbfaf7]/94
          backdrop-blur-xl
        "
      >
        <Container className="max-w-[1180px]">
          <div className="flex h-[62px] items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/community"
                className="
                  flex h-9 w-9
                  items-center
                  justify-center
                  rounded-full
                  transition
                  hover:bg-black/[0.05]
                "
              >
                <ArrowLeft size={18} />
              </Link>

              <div className="hidden sm:block">
                <p className="text-sm font-semibold">
                  Write for BrisaStory
                </p>

                <p className="text-[11px] text-black/35">
                  {words > 0
                    ? `${words} words · ${readingTime} min`
                    : "Your draft saves automatically"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button type="button" onClick={() => { const term = window.prompt("Find text in your story"); if (term) (window as Window & { find?: (text: string) => boolean }).find?.(term); }} className="hidden text-[11px] font-semibold text-black/50 sm:inline">Find</button>
              <button type="button" onClick={() => { setPreviewMode("mobile"); setPreviewOpen(true); }} className="text-[11px] font-semibold text-electric">Preview</button>
              <button type="button" onClick={undo} aria-label="Undo" className="hidden text-[11px] font-semibold text-black/50 hover:text-electric sm:inline">Undo</button>
              <button type="button" onClick={redo} aria-label="Redo" className="hidden text-[11px] font-semibold text-black/50 hover:text-electric sm:inline">Redo</button>
              <Link href="/community/status" className="hidden text-[11px] font-semibold text-electric sm:inline">Your stories</Link>
              <span className="hidden items-center gap-1.5 text-[11px] text-black/45 md:flex" aria-live="polite">
                <span className={`h-1.5 w-1.5 rounded-full ${saveState === "saved" ? "bg-emerald-500" : "bg-amber-500"}`} />
                {saveState === "saved" ? (communityUser ? "Saved to your account" : "Saved on this device") : saveState === "saving" ? "Saving…" : "Not saved yet"}
              </span>
                {uploadState === "uploading" && <span className="text-[11px] font-semibold text-electric" role="status">Uploading cover… {uploadProgress}%</span>}

              <button
                type="button"
                onClick={() =>
                  setFinishOpen(true)
                }
                className="
                  flex h-9 items-center
                  gap-1.5 rounded-full
                  bg-[#171614]
                  px-4 text-sm
                  font-semibold text-white
                "
              >
                Finish
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-black/45">No account required. Your draft saves on this device and submissions go to editorial review anonymously.</p>
        </Container>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Article canvas                                                     */}
      {/* ------------------------------------------------------------------ */}

      <Container className="max-w-[860px]">
        <div className="px-1 pb-20 pt-10 sm:px-8 sm:pt-16">
          {/* Author */}

          <div className="flex items-center gap-3">
            <span
              className="
                flex h-9 w-9
                items-center justify-center
                rounded-full
                bg-[#6252d9]
                text-sm font-bold
                text-white
              "
            >
              {draft.name
                .trim()
                .slice(0, 1)
                .toUpperCase() || "B"}
            </span>

            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[.12em] text-black/55">Byline <span className="font-normal normal-case tracking-normal text-black/45">(required)</span></p><input
              value={draft.name}
              onChange={(event) =>
                patch({
                  name: event.target.value,
                })
              }
              maxLength={80}
              aria-label="Byline name (required)"
              placeholder="Your name"
              className="
                min-w-0 flex-1
                border-0 bg-transparent
                text-sm font-semibold
                outline-none
                placeholder:text-black/25
              "
            />
          </div>

          {/* Headline */}

          <label htmlFor="community-title" className="mt-12 block text-[11px] font-semibold uppercase tracking-[.12em] text-black/55">Title <span className="font-normal normal-case tracking-normal text-black/45">(required, 5+ characters)</span></label><textarea
            id="community-title"
            value={draft.title}
            onChange={(event) =>
              patch({
                title: event.target.value,
              })
            }
            onInput={(event) => {
              const element =
                event.currentTarget;

              element.style.height = "0";
              element.style.height = `${element.scrollHeight}px`;
            }}
            rows={1}
            maxLength={140}
            placeholder="What's the story?"
            className="
              mt-2 w-full
              resize-none overflow-hidden
              border-0 bg-transparent
              font-heading
              text-[44px]
              font-semibold
              leading-[0.96]
              tracking-[-0.055em]
              text-[#171614]
              outline-none
              placeholder:text-black/[0.42]
              sm:text-[68px]
            "
          />

          {/* Deck */}

          <label htmlFor="community-summary" className="mt-6 block text-[11px] font-semibold uppercase tracking-[.12em] text-black/55">Summary <span className="font-normal normal-case tracking-normal text-black/45">(recommended, max 240 characters)</span></label><textarea
            id="community-summary"
            value={draft.deck}
            onChange={(event) =>
              patch({
                deck: event.target.value,
              })
            }
            onInput={(event) => {
              const element =
                event.currentTarget;

              element.style.height = "0";
              element.style.height = `${element.scrollHeight}px`;
            }}
            rows={1}
            maxLength={240}
            placeholder="Give people a reason to care…"
            className="
              mt-2 w-full
              resize-none overflow-hidden
              border-0 bg-transparent
              text-[19px]
              leading-[1.55]
              text-black/48
              outline-none
              placeholder:text-black/[0.42]
              sm:text-[21px]
            "
          />

          {/* Cover */}

          <p className="mt-10 text-[11px] font-semibold uppercase tracking-[.12em] text-black/55">Cover image <span className="font-normal normal-case tracking-normal text-black/45">(required · JPG, PNG or WebP · max 10 MB)</span></p><label
            className="
              group mt-10 block
              cursor-pointer
              overflow-hidden
              rounded-[18px]
              bg-[#f0efeb]
            "
          >
            {coverUrl ? (
              <div className="relative">
                <img
                  src={coverUrl}
                  alt="Cover image preview"
                  style={{ objectPosition: `${coverX}% ${coverY}%` }}
                  className="
                    aspect-[16/9]
                    w-full object-cover
                  "
                />

                <div
                  className="
                    absolute bottom-3
                    right-3 rounded-full
                    bg-black/65
                    px-3 py-1.5
                    text-xs font-semibold
                    text-white
                    backdrop-blur
                  "
                >
                  Change image
                </div>
              </div>
            ) : (
              <div
                className="
                  flex aspect-[16/7]
                  items-center
                  justify-center
                  border border-dashed
                  border-black/[0.1]
                  transition
                  hover:border-black/20
                "
              >
                <div className="text-center">
                  <span
                    className="
                      mx-auto flex h-10 w-10
                      items-center
                      justify-center
                      rounded-full bg-white
                    "
                  >
                    <ImageIcon
                      size={18}
                      className="text-black/45"
                    />
                  </span>

                  <p className="mt-3 text-sm font-semibold">
                    Add your cover
                  </p>

                  <p className="mt-1 text-xs text-black/35">
                    JPG, PNG or WebP · maximum 10 MB
                  </p>
                </div>
              </div>
            )}

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) =>
                acceptCover(
                  event.target
                    .files?.[0] ??
                    null,
                )
              }
            />
          </label>

          {coverUrl && <div className="mt-3 grid gap-2 text-xs text-black/55 sm:max-w-md"><span className="font-semibold">Adjust crop</span><label className="flex items-center gap-3">Horizontal <input type="range" min="0" max="100" value={coverX} onChange={(event) => setCoverX(Number(event.target.value))} aria-label="Cover crop horizontal position" className="flex-1 accent-[#2563eb]" /><output>{coverX}%</output></label><label className="flex items-center gap-3">Vertical <input type="range" min="0" max="100" value={coverY} onChange={(event) => setCoverY(Number(event.target.value))} aria-label="Cover crop vertical position" className="flex-1 accent-[#2563eb]" /><output>{coverY}%</output></label></div>}

          {/* Starter choices */}

          {emptyBody && (
            <QuickStart
              onChoose={chooseStarter}
            />
          )}

          {/* Story */}

          <section className="mt-12">
            <div className="space-y-7">
              {draft.blocks.map(
                (block, index) => (
                  <StoryBlockView
                    key={block.id}
                    block={block}
                    index={index}
                    total={
                      draft.blocks.length
                    }
                    menuOpen={
                      addMenuIndex ===
                      index
                    }
                    onToggleMenu={() =>
                      setAddMenuIndex(
                        addMenuIndex ===
                          index
                          ? null
                          : index,
                      )
                    }
                    onInsertAfter={(
                      type,
                    ) =>
                      insertAfter(
                        index,
                        type,
                      )
                    }
                    onChange={(next) =>
                      replaceBlock(
                        block.id,
                        next,
                      )
                    }
                    onDelete={() =>
                      deleteBlock(
                        block.id,
                      )
                    }
                    onMove={(
                      direction,
                    ) =>
                      moveBlock(
                        index,
                        direction,
                      )
                    }
                    onEnter={() =>
                      insertAfter(
                        index,
                        "paragraph",
                      )
                    }
                  />
                ),
              )}
            </div>

            {/* Desktop add */}

            <div className="relative mt-8 hidden sm:block">
              <button
                type="button"
                onClick={() =>
                  setBottomAddOpen(
                    (value) =>
                      !value,
                  )
                }
                className="
                  flex items-center
                  gap-2 text-sm
                  font-semibold
                  text-black/35
                  transition
                  hover:text-black/65
                "
              >
                <span
                  className="
                    flex h-7 w-7
                    items-center
                    justify-center
                    rounded-full
                    border border-black/[0.09]
                  "
                >
                  <Plus size={14} />
                </span>

                Add something
              </button>

              {bottomAddOpen && (
                <div className="absolute left-0 top-10">
                  <AddMenu
                    onSelect={
                      appendBlock
                    }
                    onClose={() =>
                      setBottomAddOpen(
                        false,
                      )
                    }
                  />
                </div>
              )}
            </div>

            <p className="mt-8 hidden text-[11px] text-black/24 sm:block">
              Tip: press / on an empty block to add something.
              Press Enter for a new paragraph.
            </p>
          </section>

          {message && !finishOpen && (
            <p
              className="
                mt-10 rounded-[14px]
                bg-[#f0eefb]
                px-4 py-3
                text-sm text-[#4d429e]
              "
            >
              {message}
            </p>
          )}
        </div>
      </Container>

      {/* ------------------------------------------------------------------ */}
      {/* Mobile creation dock                                               */}
      {/* ------------------------------------------------------------------ */}

      <div
        className="
          fixed bottom-0 left-0
          right-0 z-30
          border-t border-black/[0.07]
          bg-[#fbfaf7]/96
          px-3 pb-[max(12px,env(safe-area-inset-bottom))]
          pt-2 backdrop-blur-xl
          sm:hidden
        "
      >
        <div className="mx-auto flex max-w-[600px] gap-2">
          <div className="relative flex-1">
            <button
              type="button"
              aria-expanded={bottomAddOpen}
              aria-controls="mobile-story-add-menu"
              onClick={() =>
                setBottomAddOpen(
                  (value) =>
                    !value,
                )
              }
              className="
                flex h-11 w-full
                items-center
                justify-center gap-2
                rounded-full
                border border-black/[0.08]
                bg-white
                text-sm font-semibold
              "
            >
              <Plus size={17} />
              Add
            </button>

            {bottomAddOpen && (
              <div id="mobile-story-add-menu" className="pointer-events-auto fixed bottom-[calc(64px+env(safe-area-inset-bottom))] left-3 right-3 z-[60] flex max-h-[calc(100svh-140px)] justify-end overflow-y-auto pb-2 sm:absolute sm:bottom-14 sm:left-0 sm:right-auto sm:z-50 sm:block sm:max-h-none sm:overflow-visible sm:pb-0">
                <AddMenu
                  onSelect={
                    appendBlock
                  }
                  onClose={() =>
                    setBottomAddOpen(
                      false,
                    )
                  }
                />
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() =>
              setFinishOpen(true)
            }
            className="
              hidden h-11 flex-1 sm:flex
              items-center
              justify-center gap-2
              rounded-full
              bg-[#171614]
              text-sm font-semibold
              text-white
            "
          >
            Finish
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Finish                                                             */}
      {/* ------------------------------------------------------------------ */}

      {finishOpen && (
        <FinishSheet
          draft={draft}
          cover={cover}
          coverUrl={coverUrl}
          keywordOptions={
            keywordOptions
          }
          readyChecks={
            readyChecks
          }
          message={message}
          busy={busy}
          setDraft={setDraft}
          setCover={setCover}
          onClose={() =>
            setFinishOpen(false)
          }
          onSubmit={submit}
        />
      )}
      {previewOpen && (
        <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/40 p-4 sm:p-10" role="dialog" aria-modal="true" aria-label={`${previewMode} story preview`}>
          <div className={`mx-auto min-h-[680px] rounded-[28px] bg-[#fbfaf7] p-6 shadow-2xl ${previewMode === "mobile" ? "max-w-[390px]" : "max-w-[960px]"}`}>
            <div className="flex items-center justify-between border-b border-black/10 pb-4"><div className="flex items-center gap-3"><span className="text-xs font-semibold uppercase tracking-[.14em]">{previewMode} preview</span><button type="button" onClick={() => setPreviewMode("mobile")} className={`text-xs ${previewMode === "mobile" ? "font-bold text-electric" : "text-black/45"}`}>Mobile</button><button type="button" onClick={() => setPreviewMode("desktop")} className={`text-xs ${previewMode === "desktop" ? "font-bold text-electric" : "text-black/45"}`}>Desktop</button></div><button type="button" onClick={() => setPreviewOpen(false)} aria-label="Close preview"><X size={20} /></button></div>
            {coverUrl && <><span className="sr-only">Cover preview</span><img src={coverUrl} alt={draft.coverAlt || "Cover preview"} style={{ objectPosition: `${coverX}% ${coverY}%` }} className="mt-6 aspect-[16/7] w-full rounded-xl object-cover" /></>}
            <p className="mt-8 text-xs font-semibold uppercase tracking-[.14em] text-electric">{draft.category}</p>
            <h2 className="mt-3 font-heading text-4xl font-bold leading-none">{draft.title || "Your story title"}</h2>
            <p className="mt-5 text-base leading-relaxed text-black/55">{draft.deck || "Your introduction will appear here."}</p>
            <div className="mt-8 space-y-5">{draft.blocks.map((block) => block.type === "divider" ? <hr key={block.id} /> : <p key={block.id} className={block.type === "heading" ? "font-heading text-2xl font-bold" : "text-base leading-7"}>{"text" in block ? block.text || "Your story text" : ""}</p>)}</div>
          </div>
        </div>
      )}
    </main>
  );
}
