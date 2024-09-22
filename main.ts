/*
	MIT License
	Copyright (c) 2018 Kai Krause <kaikrause95@gmail.com>
	See license here: https://github.com/krausekai/Japanese-Known-Word-Checker/blob/master/LICENSE.txt
*/

import { parseArgs } from "@std/cli/parse-args";
import { match } from "./fuzzy_match_words.ts";
import { auxillaries, grammar, modifiers, terms } from "./words.ts";
import { processComparisonText } from "./process_text.ts";
import {
  alphabetRegex,
  hiragana,
  jaTest,
  kanji,
  katakana,
  puncReg,
  punctuation,
  suruFormsRegex,
} from "./regexes.ts";

const args = parseArgs(Deno.args, {
  string: ["known-words", "text", "delimiter", "column"],
  default: {
    delimiter: "\t",
    column: "0",
  },
});
const knownWordsPath = args["known-words"];
if (!knownWordsPath)
  throw new Error(
    "Please provide a path to a known words file via --known-words",
  );
const textPath = args["text"];
if (!textPath)
  throw new Error("Please provide a path to a text file via --text");
const text = await Deno.readTextFile(textPath);

const delimiter = args["delimiter"];
const column = parseInt(args["column"]);
if (!Number.isInteger(column)) throw new Error("Column must be a number!");

const knownWordsText = await Deno.readTextFile(knownWordsPath);
// Split on new lines and assign the result
const knownWordsArr = knownWordsText.split(/\r?\n/);
if (!knownWordsArr[1].split(delimiter)[column]) {
  // Check 1 and not 0, in case of CSV header comment
  alert("Delimiter and/or Column are Incorrect!");
}
const knownWords = knownWordsArr
  .map((row) => row.split(delimiter)[column])
  .filter(Boolean);

// Concat the above arrays into groups
const jpStopWords_base = [...grammar, ...terms];
const jpStopWords = [...grammar, ...terms, ...auxillaries, ...modifiers];

const banned: string[] = [];
function testBanned(term: string) {
  let res = false;
  // Test whether a kana term, with first or last character removed, is equal to a term. Removes the need for some hard-coded auxillaries.
  if (term.length >= 3) {
    const pfxRemoved_term = term.slice(1); // term with first character removed
    const sfxRemoved_term = term.slice(0, -1); // term with last character removed
    if (
      jpStopWords_base.indexOf(pfxRemoved_term) > -1 ||
      jpStopWords_base.indexOf(sfxRemoved_term) > -1
    ) {
      res = true;
    }
  }
  // Test whether a term is banned
  if (!res) {
    const bannedAux = ["っ", "ッ", "ぇ"];
    if (
      (term.length <= 2 &&
        !kanji.test(term) &&
        !katakana.test(term) &&
        hiragana.test(term)) ||
      (term.length === 1 && katakana.test(term)) ||
      jpStopWords.indexOf(term) > -1 ||
      (!term.includes("々") && punctuation.test(term)) ||
      !jaTest.test(term) ||
      bannedAux.indexOf(term[0]) > -1 ||
      bannedAux.indexOf(term[term.length - 1]) > -1 ||
      term.startsWith("ー") ||
      (term.length <= 3 && term.endsWith("ー")) ||
      (term.length === 2 && katakana.test(term) && hiragana.test(term))
    ) {
      res = true;
    }
  }
  if (res) banned.push(term);
  //if (term.length <= 2 && !kanji.test(term) && !katakana.test(term) && hiragana.test(term)) banned.push(term);
  return res;
}

// Purify terms of unnecessary parts
const purifyCache = new Map<string, string>();
function purify(term: string) {
  let purified = purifyCache.get(term);
  if (purified) return purified;
  purified = term
    // Remove punctuation
    .replace(puncReg, "")
    // Remove English
    .replace(alphabetRegex, "")
    // Remove ending する verbs...
    .replace(suruFormsRegex, "");
  purifyCache.set(term, purified);
  return purified;
}

const segs = processComparisonText(text);

// Non-blocking Comparison Setup
let total = segs.length; // Matches out of total
let matches = 0; // Matches out of total
const newWords: string[] = []; // Record unknown words

let lastDisplayAt = new Date(0);

function compare(segmentsIndex = 0, knownWordsIndex = 0) {
  if (new Date().getTime() - lastDisplayAt.getTime() > 250) {
    displayResult();
    lastDisplayAt = new Date();
  }

  if (segmentsIndex >= segs.length) return;

  // Early out if term is banned
  if (testBanned(segs[segmentsIndex])) {
    total--;
    return compare(segmentsIndex + 1);
  }

  compareSegment(segmentsIndex, knownWordsIndex);
  if (segmentsIndex < segs.length) {
    compare(segmentsIndex + 1);
  }
}

function compareSegment(segmentsIndex: number, knownWordsIndex: number) {
  const seg = segs[segmentsIndex];
  const segLength = seg.length;
  while (knownWordsIndex < knownWords.length) {
    // Whether current process should resolve
    let shouldReturn = false;

    // Current known word
    let wordListWord = knownWords[knownWordsIndex];

    // Clean known word of unneeded data
    wordListWord = purify(wordListWord);

    // Compare until any equal match is found
    const result = match(wordListWord, seg);

    // 1 and 2 Character Compounds must be 100%
    if (segLength <= 2 && result >= 100) {
      matches++;
      shouldReturn = true;
    }
    // Otherwise, be 60% or above
    else if (segLength >= 2 && result >= 60) {
      matches++;
      shouldReturn = true;
    }
    // Record new words
    else if (knownWordsIndex >= knownWords.length - 1) {
      newWords.push(seg);
      shouldReturn = true;
    }

    knownWordsIndex++;

    if (shouldReturn) {
      return;
    }
  }
}

const encoder = new TextEncoder();
function displayResult() {
  const resultPercent = Math.floor((matches / total) * 100) || 0;
  Deno.stdout.writeSync(
    encoder.encode(
      `\runique words (known/total): ${matches} / ${total} (${resultPercent}% known), ${newWords.length} new`,
    ),
  );
}

compare();
displayResult();
