import { createHash } from "node:crypto";

export function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function contentHash(value) {
  return createHash("sha256").update(normalizeText(value)).digest("hex");
}

export function contentFromSegments(segments) {
  return segments
    .map((segment) => normalizeText(segment))
    .filter(Boolean)
    .map((segment) => /[.!?]$/.test(segment) ? segment : `${segment}.`)
    .join(" ");
}

export function words(value) {
  return normalizeText(value).match(/[A-Za-z0-9][A-Za-z0-9'’-]*/g) || [];
}

export function sentences(value) {
  return normalizeText(value)
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function syllablesInWord(value) {
  const word = value.toLowerCase().replace(/[^a-z]/g, "");
  if (word.length <= 3) return 1;
  const reduced = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/i, "").replace(/^y/, "");
  return Math.max(1, (reduced.match(/[aeiouy]{1,2}/g) || []).length);
}

export function readingEase(value) {
  const wordList = words(value);
  const sentenceList = sentences(value);
  if (wordList.length === 0 || sentenceList.length === 0) return 0;
  const syllables = wordList.reduce((total, word) => total + syllablesInWord(word), 0);
  return Number((206.835 - 1.015 * (wordList.length / sentenceList.length) - 84.6 * (syllables / wordList.length)).toFixed(1));
}

export function phraseHits(value, phrases = []) {
  const normalized = ` ${normalizeText(value).toLowerCase()} `;
  return phrases.filter((phrase) => normalized.includes(` ${normalizeText(phrase).toLowerCase()} `));
}

export function repeatedOpenings(value, openingWords = 2, maximumRepeats = 3) {
  const counts = new Map();
  for (const sentence of sentences(value)) {
    const opening = words(sentence).slice(0, openingWords).join(" ").toLowerCase();
    if (opening) counts.set(opening, (counts.get(opening) || 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count > maximumRepeats).map(([opening, count]) => ({ opening, count }));
}

export function matchesPattern(value, pattern) {
  const escaped = pattern.replace(/[|\\{}()[\]^$+?.]/g, "\\$&")
    .replace(/\*\*/g, "__DOUBLE_STAR__")
    .replace(/\*/g, "[^/]*")
    .replace(/__DOUBLE_STAR__/g, ".*");
  return new RegExp(`^${escaped}$`).test(value);
}

export function matchingRule(route, rules = []) {
  return rules.find((rule) => {
    const patterns = rule.patterns || [rule.pattern || route];
    return patterns.some((pattern) => matchesPattern(route, pattern));
  });
}
