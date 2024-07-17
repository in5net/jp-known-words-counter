import TinySegmenter from "tiny-segmenter";
import {
  alphaRegex,
  numberRegex,
  newLineRegex,
  termsToReplaceRegex,
  katakanaRegex,
  honKanjiRegex,
  verbRegex,
  verbTeRegex,
  verbKuSaBeforeNRegex,
  verbAuxRegex,
  verbTeFormRegex,
  verbTaFormRegex,
  zuFormRegex1,
  zuFormRegex2,
  kanjiAndKanjiRegex,
  prtKanjiRegex,
  kanjiVerbKanjiRegex,
  naNoGaAdverbsRegex,
  kanjiGaRegex,
  otherRegex,
  otherSuffixRegex,
  kanjiOtherSuffixRegex,
  countersRegex,
  placeNames,
  onomatopoeiaRegex,
  hiragana,
  kanji,
  katakana,
} from "./regexes.ts";

const segmenter = new TinySegmenter();

export function processComparisonText(text: string) {
  let segs: string[] = [];
  // REMOVE TERMS THAT MAY CONFUSE THE SEGMENTER
  // Remove English characters
  text = text.replace(alphaRegex, "_");
  text = text.replace(numberRegex, "_$1$2$3$4_");
  // Remove newline characters
  text = text.replace(newLineRegex, "_");
  // Remove and separate certain ('unique') terms
  text = text.replace(termsToReplaceRegex, "_");
  text = text.replace(katakanaRegex, "_$1$2_"); // TinySegmenter will usually do this, but sometimes will not for Kata+Hira
  text = text.replace(honKanjiRegex, "_$1");
  text = text.replace(verbRegex, "$1$2$3_");
  text = text.replace(verbTeRegex, "$1_$2");
  text = text.replace(verbKuSaBeforeNRegex, "$1$2$3_");
  text = text.replace(verbAuxRegex, "$1_");
  text = text.replace(verbTeFormRegex, "$1_");
  text = text.replace(verbTaFormRegex, "$1$2$3_");
  text = text.replace(zuFormRegex1, "$1_$2");
  text = text.replace(zuFormRegex2, "$1_$2");
  text = text.replace(kanjiAndKanjiRegex, "$1$2_$3");
  text = text.replace(prtKanjiRegex, "$1_$2");
  text = text.replace(kanjiVerbKanjiRegex, "$1$2_$3");
  text = text.replace(naNoGaAdverbsRegex, "$1_");
  text = text.replace(kanjiGaRegex, "$1$2_");
  text = text.replace(otherRegex, "$1_");
  //separate after modifiers
  text = text.replace(otherSuffixRegex, "$1_");
  text = text.replace(kanjiOtherSuffixRegex, "$1$2_");
  text = text.replace(countersRegex, "$1_");
  text = text.replace(placeNames, "{$1$2}");
  // separate repetitions
  text = text.replace(onomatopoeiaRegex, "_$1$2_");
  // Tokenize text to an array
  segs = segmenter.segment(text);
  // Remove or fix segmentation delimiters
  for (let i = 0; i < segs.length; i++) {
    if (segs[i] === "_") {
      segs[i] = "";
    }
    if (segs[i] === "_{") {
      segs[i] = "{";
    }
    if (segs[i] === "}_") {
      segs[i] = "}";
    }
  }
  // RE-COMBINE incorrectly segmented terms
  for (let i = 0; i < segs.length; i++) {
    if (segs[i] && segs[i + 1]) {
      // RE-COMBINE Kanji Names
      if (segs[i] === "{") {
        // remove the start checkpoint
        segs[i] = "";
        // cache the final checkpoint so as to not re-calculate it
        const greedyCheckpoint = segs.indexOf("}");
        let c_greedyCheckpoint = greedyCheckpoint;

        // Greedily search for and consume all characters until final checkpoint
        for (let x = i; x < c_greedyCheckpoint + 1; x++) {
          // Remove final checkpoint and exit
          if (segs[x] === segs[c_greedyCheckpoint]) {
            segs[x] = "";
            break;
          }
          // combine segments
          segs[i] += segs[x];
          // remove consumed characters and go back a step
          if (i !== x) {
            segs.splice(x, 1);
            c_greedyCheckpoint--;
            x--;
          }
        }
      }
      // RE-COMBINE singular Kanji to next largest Kanji compound (上映会と生配信が = ["生配", "信"] = 生配信)
      if (segs[i].length === 1) {
        // eg. 小+漢字
        if (
          kanji.test(segs[i]) &&
          kanji.test(segs[i + 1]) &&
          !hiragana.test(segs[i + 1]) &&
          !katakana.test(segs[i + 1])
        ) {
          segs[i] += segs[i + 1];
          segs.splice(i + 1, 1);
        }
      }
      if (segs[i + 1].length === 1) {
        // eg. 漢字+会
        if (
          kanji.test(segs[i][segs[i].length - 1]) &&
          kanji.test(segs[i + 1]) &&
          !hiragana.test(segs[i + 1]) &&
          !katakana.test(segs[i + 1])
        ) {
          segs[i] += segs[i + 1];
          segs.splice(i + 1, 1);
          if (i != 0) i--;
        }
      }
      // RE-COMBINE singular adjectival Kana
      const adjprt = ["い", "さ", "ず", "み", "め"];
      if (
        segs[i].length > 1 &&
        segs[i + 1].length === 1 &&
        adjprt.indexOf(segs[i + 1]) > -1
      ) {
        if (
          hiragana.test(segs[i][segs[i].length - 1]) ||
          kanji.test(segs[i][segs[i].length - 1])
        ) {
          segs[i] += segs[i + 1];
          segs.splice(i + 1, 1);
        }
      }
      // RE-COMBINE prefixes
      const prefixes = ["ご", "お"];
      if (segs[i - 1] && prefixes.indexOf(segs[i - 1]) > -1) {
        segs[i] = segs[i - 1] + segs[i];
        segs.splice(i - 1, 1);
      }
      // RE-COMBINE suffixes
      const suffixes = [
        "殿",
        "様",
        "さま",
        "氏",
        "さん",
        "君",
        "くん",
        "ちゃん",
        "坊",
        "達",
        "たち",
        "たちも",
        "だち",
        "ら",
      ];
      if (suffixes.indexOf(segs[i + 1]) > -1) {
        segs[i] += segs[i + 1];
        segs.splice(i + 1, 1);
      }
      // RE-COMBINE auxillaries
      if (kanji.test(segs[i])) {
        // TODO: possibly change がっ to .endsWith("っ")
        if (
          segs[i + 1].startsWith("ら") ||
          segs[i + 1] === "がっ" ||
          (segs[i + 1].length > 1 && segs[i + 1].startsWith("た")) || // eg. 得られる, 横たわって
          (segs[i + 1].length > 1 && segs[i + 1].startsWith("て"))
        ) {
          // eg. 待てれば
          segs[i] += segs[i + 1];
          segs.splice(i + 1, 1);
        }
      }
      if (
        segs[i].length > 1 &&
        hiragana.test(segs[i][segs[i].length - 1]) &&
        hiragana.test(segs[i + 1][0])
      ) {
        const prt = [
          "は",
          "が",
          "に",
          "を",
          "の",
          "な",
          "と",
          "や",
          "も",
          "へ",
          "お",
          "ご",
          "で",
          "よ",
          "ね",
        ];
        if (prt.indexOf(segs[i]) === -1 && prt.indexOf(segs[i + 1]) === -1) {
          segs[i] += segs[i + 1];
          segs.splice(i + 1, 1);
          if (i != 0) i--;
        }
        if (segs[i].endsWith("ん") && segs[i + 1] === "で") {
          segs[i] += segs[i + 1];
          segs.splice(i + 1, 1);
          if (i != 0) i--;
        }
      }
    }
  }
  // Remove duplicate terms
  segs = uniq_fast(segs);

  return segs;
}

/* Return a unique array - Source: https://stackoverflow.com/a/9229821 */
function uniq_fast<T>(a: T[]) {
  const seen = {};
  const out: T[] = [];
  const len = a.length;
  let j = 0;
  for (let i = 0; i < len; i++) {
    const item = a[i];
    if (seen[item] !== 1) {
      seen[item] = 1;
      out[j++] = item;
    }
  }
  return out;
}
