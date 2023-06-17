const { start } = require("repl");
const { deltaTime } = require("./misc");
const { stem } = require("./stem");
const { hyphenateSync } = require("hyphen/de");

const whitespaceRegex = /[^\p{Letter}\s]|_/gu;
const whitespaceRegex2 = /\s+/;
const isNumber = /^\d+\.\d+$/;

let dictionary = new Set();

exports.tokenize = (str) => {
    const name = str.toLowerCase().replace(whitespaceRegex, " ").replace("erdapfel", "kartoffel").replace("erdäpfel", "kartoffeln");
    return name
        .split(whitespaceRegex2)
        .filter((token) => !isNumber.test(token) && token.length > 0)
        .flatMap((token) => {
            const hyphens = hyphenateSync(token, { hyphenChar: "*" }).split("*");
            const newTokens = [];

            let i = 0;
            while (i < hyphens.length) {
                let longestMatch = null;
                let nextIndex = -1;
                let match = "";
                for (let j = i; j < hyphens.length; j++) {
                    match += hyphens[j];
                    if (dictionary.has(match)) {
                        longestMatch = match;
                        nextIndex = j + 1;
                    }
                }
                if (!longestMatch) {
                    i++;
                } else {
                    newTokens.push(longestMatch);
                    i = nextIndex;
                }
            }

            return [token, ...newTokens];
        })
        .map((token) => stem(token));
};

exports.index = (items) => {
    const start = performance.now();

    const index = {
        docs: [],
        totalDocLength: 0,
        averageDocLength: 0,
        words: {},
        k1: 1.3,
        b: 0.75,
    };

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const tokens = this.tokenize(item.name + " " + (item.description ?? ""));
        const doc = {
            id: item.store + item.id,
            body: item.name,
            words: {},
            wordCount: tokens.length,
        };
        const words = doc.words;
        for (const token of tokens) {
            let word = words[token];
            if (!word) {
                word = words[token] = {
                    count: 0,
                    frequency: 0,
                };
            }
            word.count++;
        }

        for (const key in words) {
            const word = words[key];
            word.frequency = word.count / doc.wordCount;

            let indexWord = index.words[key];
            if (!indexWord) {
                indexWord = index.words[key] = {
                    docs: [],
                    idf: 0,
                };
            }
            indexWord.docs.push(i);
        }

        index.docs.push(doc);
        index.totalDocLength += tokens.length;
        index.averageDocLength = index.totalDocLength / index.docs.length;
        if (i % 1000 == 0) console.log(`indexed ${i}/${items.length}`);
    }

    var keys = Object.keys(index.words);
    for (const key of keys) {
        var num = index.docs.length - index.words[key].docs.length + 0.5;
        var denom = index.words[key].docs.length + 0.5;
        index.words[key].idf = Math.max(Math.log10(num / denom), 0.01);
    }

    return index;
};

exports.search = (index, query) => {
    const tokens = this.tokenize(query);
    const results = [];
    const candidateDocs = new Set();
    for (const token of tokens) {
        const word = index.words[token];
        if (word) {
            for (const doc of word.docs) candidateDocs.add(doc);
        }
    }

    for (const docId of candidateDocs) {
        const doc = index.docs[docId];
        doc.score = 0;

        for (const token of tokens) {
            if (!index.words[token]) continue;
            if (!doc.words[token]) continue;
            const idf = index.words[token].idf;
            const num = doc.words[token].count * (index.k1 + 1);
            const denom = doc.words[token].count + index.k1 * (1 - index.b + (index.b * doc.wordCount) / index.averageDocLength);
            doc.score += (idf * num) / denom;
        }

        if (!isNaN(doc.score) && doc.score > 0) {
            results.push(doc);
        }
    }
    results.sort((a, b) => b.score - a.score);
    return results;
};

if (require.main === module) {
    const fs = require("fs");
    const { readJSON } = require("../../analysis");

    let items = readJSON("data/latest-canonical.json.br");
    if (items.items) items = items.items;

    const dictionaryItems = fs
        .readFileSync("site/data/dictionary-de.txt")
        .toString()
        .split("\n")
        .filter((line) => !line.includes("#"));
    dictionary = new Set(dictionaryItems);

    console.log("Indexing ...");
    const start = performance.now();
    const index = exports.index(items);
    console.log(`Building index took: ${deltaTime(start)}`);
    console.log(`Words: ${Object.keys(index.words).length}`);

    const readline = require("readline-sync");
    while (true) {
        const query = readline.question("> ");
        const result = exports.search(index, query);
        for (let i = 0; i < Math.min(result.length, 50); i++) {
            const doc = result[i];
            console.log(`${doc.score} ${doc.body}`);
        }
        console.log(`${result.length} results`);
    }
}
