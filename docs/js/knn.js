const { stem, stopWords } = require("./stem");

function dotProduct(vector1, vector2) {
    let product = 0;
    for (const key in vector1) {
        if (vector2.hasOwnProperty(key)) {
            product += vector1[key] * vector2[key];
        }
    }
    return product;
}
exports.dotProduct = dotProduct;

function addVector(vector1, vector2) {
    for (const key in vector2) {
        vector1[key] = (vector1[key] || 0) + vector2[key];
    }
}
exports.addVector = addVector;

function scaleVector(vector, scalar) {
    for (const key in vector) {
        vector[key] *= scalar;
    }
}
exports.scaleVector = scaleVector;

function normalizeVector(vector) {
    const len = magnitude(vector);
    for (const key in vector) {
        vector[key] /= len;
    }
}
exports.normalizeVector = normalizeVector;

function magnitude(vector) {
    let sumOfSquares = 0;
    for (const key in vector) {
        sumOfSquares += vector[key] ** 2;
    }
    return Math.sqrt(sumOfSquares);
}
exports.magnitude = magnitude;

function findMostSimilarItem(refItem, items) {
    let maxSimilarity = -1;
    let similarItem = null;
    let similarItemIdx = -1;
    items.forEach((item, idx) => {
        let similarity = dotProduct(refItem.vector, item.vector);
        if (similarity > maxSimilarity) {
            maxSimilarity = similarity;
            similarItem = item;
            similarItemIdx = idx;
        }
    });
    return {
        similarity: maxSimilarity,
        item: similarItem,
        index: similarItemIdx,
    };
}
exports.findMostSimilarItem = findMostSimilarItem;

function findMostSimilarItems(refItem, items, k = 5, accept = (ref, item) => true) {
    let topSimilarItems = [];
    let topSimilarities = [];

    items.forEach((item, idx) => {
        if (!accept(refItem, item)) return;
        let similarity = dotProduct(refItem.vector, item.vector);

        if (topSimilarItems.length < k) {
            topSimilarItems.push(item);
            topSimilarities.push(similarity);
        } else {
            let minSimilarity = Math.min(...topSimilarities);
            let minIndex = topSimilarities.indexOf(minSimilarity);

            if (similarity > minSimilarity) {
                topSimilarItems[minIndex] = item;
                topSimilarities[minIndex] = similarity;
            }
        }
    });

    let similarItemsWithIndices = topSimilarItems.map((item, index) => {
        return {
            similarity: topSimilarities[index],
            item: item,
            index: items.indexOf(item),
        };
    });

    return similarItemsWithIndices;
}
exports.findMostSimilarItems = findMostSimilarItems;

function similaritySortItems(items) {
    if (items.length == 0) return items;
    sortedItems = [items.shift()];
    let refItem = sortedItems[0];
    while (items.length > 0) {
        const similarItem = findMostSimilarItem(refItem, items);
        sortedItems.push(similarItem.item);
        items.splice(similarItem.index, 1);
        refItem = similarItem.item;
    }
    return sortedItems;
}
exports.similaritySortItems = similaritySortItems;

const NGRAM = 4;
function vectorizeTokens(tokens) {
    const vector = {};
    for (token of tokens) {
        if (token.length > NGRAM) {
            for (let i = 0; i < token.length - NGRAM; i++) {
                let trigram = token.substring(i, i + NGRAM);
                vector[trigram] = (vector[trigram] || 0) + 1;
            }
        } else {
            vector[token] = (vector[token] || 0) + 1;
        }
    }
    normalizeVector(vector);
    return vector;
}
exports.vectorizeTokens = vectorizeTokens;

function vectorizeItem(item, useUnit = true, useStem = true) {
    const isNumber = /^\d+\.\d+$/;
    let name = item.name
        .toLowerCase()
        .replace(/[^\w\s]|_/g, "")
        .replace("-", " ")
        .replace(",", " ");
    item.tokens = name
        .split(/\s+/)
        .filter((token) => !stopWords.includes(token))
        .filter((token) => !isNumber.test(token))
        .map((token) => (useStem ? stem(token) : token));
    if (useUnit) {
        if (item.quantity) item.tokens.push("" + item.quantity);
        if (item.unit) item.tokens.push(item.unit);
    }
    item.vector = vectorizeTokens(item.tokens);
}
exports.vectorizeItem = vectorizeItem;

function vectorizeItems(items, useUnit = true) {
    items.forEach((item) => {
        if (!item.vector) vectorizeItem(item, useUnit);
    });
}
exports.vectorizeItems = vectorizeItems;
