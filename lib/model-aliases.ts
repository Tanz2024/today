// Explicit name matches between sources, reviewed by hand.
//
// The canonical model list is Epoch AI's Capabilities Index. LMArena entries
// and OpenRouter listings are matched to it by normalised name (see
// normaliseModelName in lib/model-rankings.ts). This file covers the cases the
// automatic rule cannot decide:
//   key   = the source's exact identifier: for LMArena, the model name without
//           its variant suffix, plus " @MMDD" for a dated snapshot
//           (see arenaAliasKey); for OpenRouter, the model id.
//   value = Epoch's model name (the "Model" column of eci_scores.csv), or null
//           to forbid a match the automatic rules would otherwise make.
// Only add an entry when the two names are verifiably the same model, and say
// why. `npm run models:update` prints the notable models left unmatched.

export type AliasSource = "lmarena" | "openrouter";

export const MODEL_ALIASES: Record<AliasSource, Record<string, string | null>> = {
  lmarena: {
    // Epoch evaluated this model under the API id "gemini-3.1-pro-preview".
    "Gemini 3.1 Pro Preview": "Gemini 3.1 Pro",
    // LMArena's 2026-09-10 snapshot. Epoch lists DeepSeek V4.1 Flash (released
    // 2026-09-09, API id "deepseek-v4.1-flash") and the later "1017" snapshot
    // separately; the dated-sibling rule therefore refuses this automatically.
    "DeepSeek-V4.1-Flash @0910": "DeepSeek V4.1 Flash",
  },
  // OpenRouter ids are matched automatically against the API ids Epoch lists
  // for each model; no manual entries are needed at present.
  openrouter: {},
};
