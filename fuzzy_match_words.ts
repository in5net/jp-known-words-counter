/*
	MIT License
	Copyright (c) 2018 Kai Krause <kaikrause95@gmail.com>
	See license here: https://github.com/krausekai/Japanese-Text-Difficulty-Checker/blob/master/LICENSE.txt
*/

const kana = /[\u3040-\u309f\u30a0-\u30ff]/;
const kanji = /[\u4e00-\u9faf\u3400-\u4dbf]/;

function substring_kanji(shorter: string, longer: string) {
  if (
    (kanji.test(shorter) && longer.includes(shorter)) ||
    (kanji.test(longer) && longer.includes(shorter))
  ) {
    return Math.floor((shorter.length / longer.length) * 100);
  }
  return 0;
}

function substring_kana(shorter: string, longer: string) {
  if (kana.test(shorter) && kana.test(longer) && shorter.length >= 3) {
    if (longer.includes(shorter)) {
      return Math.floor((shorter.length / longer.length) * 100);
    }
  }
  return 0;
}

const particles = "はがでにのなとやもへおご";
function substring_kanaprt(shorter: string, longer: string) {
  const lenDiff = Math.abs(shorter.length - longer.length);
  if (lenDiff === 1) {
    if (particles.includes(longer[0])) {
      const c_longer = longer.slice(1);
      if (c_longer === shorter) {
        return 100;
      }
    }
    if (particles.includes(longer[longer.length - 1])) {
      const c_longer = longer.slice(0, -1);
      if (c_longer === shorter) {
        return 100;
      }
    }
  }
  return 0;
}

function verb_compound(shorter: string, longer: string) {
  if (
    shorter.length >= 3 &&
    longer.length >= 3 &&
    kanji.test(shorter[0]) &&
    kana.test(shorter[1]) &&
    kanji.test(shorter[2]) &&
    kanji.test(longer[0]) &&
    kana.test(longer[1]) &&
    kanji.test(longer[2]) &&
    shorter[0] === longer[0] &&
    shorter[2] === longer[2]
  ) {
    return 100;
  }
  return 0;
}

function kanji_compound(shorter: string, longer: string) {
  if (
    (kana.test(shorter) && kanji.test(shorter)) ||
    (kana.test(longer) && kanji.test(longer))
  ) {
    const shorterKanjiChars: string[] = [];
    const longerKanjiChars: string[] = [];
    for (let i = 0; i < shorter.length; i++) {
      if (kanji.test(shorter[i])) {
        shorterKanjiChars.push(shorter[i]);
      }
    }
    for (let i = 0; i < longer.length; i++) {
      if (kanji.test(longer[i])) {
        longerKanjiChars.push(longer[i]);
      }
    }

    // Check the Kanji compounds as strings
    if (shorterKanjiChars[0] && longerKanjiChars[0]) {
      let shorterKanji;
      let longerKanji;
      if (shorterKanjiChars.length < longerKanjiChars.length) {
        longerKanji = longerKanjiChars.join("");
        shorterKanji = shorterKanjiChars.join("");
      } else {
        longerKanji = shorterKanjiChars.join("");
        shorterKanji = longerKanjiChars.join("");
      }

      // Check whether both Kanji strings are the same, and if so, return a full match (Kanji > Kana)
      if (shorterKanji === longerKanji) {
        return 100;
      }
      // Check for partial matches by sub string for compounds of 2 or more length by shortest
      if (shorterKanji.length >= 2 && longerKanji.includes(shorterKanji)) {
        return Math.floor((shorterKanji.length / longerKanji.length) * 100);
      }
    }
  }
  return 0;
}

// 0 to 100% (0 no match, 100 perfect match)
export function match(s1: string, s2: string) {
  // if both strings are the same, early out
  if (s1 === s2) {
    return 100;
  }

  // Total count of matches
  let count = 0;

  // Compare shortest string against the longest string
  let longer = "";
  let shorter = "";
  if (s1.length < s2.length) {
    longer = s2;
    shorter = s1;
  } else {
    longer = s1;
    shorter = s2;
  }

  // Early out if the two word lengths are too different for effeciency
  // eg. StrA is 10, StrB is 25, the diff is 15
  const numDiff = Math.abs(shorter.length - longer.length);
  let fudge = 0;
  if (shorter.length === 1) fudge = 2;
  if (numDiff > shorter.length + fudge) {
    return 0;
  }

  // Substring: Longer includes Shorter as Kanji
  const val1 = substring_kanji(shorter, longer);
  if (val1 > count) count = val1;
  // Substring: Longer includes Shorter as Kana, which is 3 or longer length
  const val2 = substring_kana(shorter, longer);
  if (val2 > count) count = val2;
  // Substring: Longer is longer by 1, and contains a basic particle at the start or end, that removed is equal to the shorter word
  const val3 = substring_kanaprt(shorter, longer);
  if (val3 > count) count = val3;
  // String contains a verb compound (eg. Base verb and auxillary: Kanji-Kana-Kanji)
  const val4 = verb_compound(shorter, longer);
  if (val4 > count) count = val4;
  // String contains Kana and Kanji, and when Kana is removed, the remaining Kanji are compared as a compound, are the same (eg. other verbs and adjectives)
  const val5 = kanji_compound(shorter, longer);
  if (val5 > count) count = val5;

  // Return a weighted result
  return count;
}
