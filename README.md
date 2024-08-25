# Known Words Counter

Calculate the number and percentage of words you already know from a given Japanese text.

This is based on the [Japanese Known Word Checker](https://github.com/krausekai/japanese-tools/tree/master/known-word-checker) 
with the main difference being that this is a CLI program instead of a website like the original.

## Setup

All you need is to have [Deno](https://deno.com) installed

## Usage

`deno run --allow-read main.ts --known-words <known_words.txt> --text <content.txt>`

`known_words` should be a file path to an text file [Anki export](https://docs.ankiweb.net/exporting.html#text-files).
This file is basically a .txt file of a single word on each line. There can be extra stuff after each word followed be a tab as it is ignored.
Just make sure that the export has the word as the first field listed.

`content` will be the Japanese text you are checking for known words.
This will tell you of the words in this content, how many you would expect to already know.

Now all you need to do is wait for several seconds (depending on the length of the `content`) to see you results which will look something like:

`unique words (known/total): 2847 / 4719 (60% known), 1872 new`

Here's what this means:
- There are a total of 4719 words that appear in `content` that are unique from each other (words that appear multiple times are only counted once)
- Of those 4719 words, you already should know 2847 of them (60% of the total)
- There are 1872 new words that you have yet to learn (total - known, 4719 - 2847 = 1872)
