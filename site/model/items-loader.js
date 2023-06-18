const { deltaTime, log, uint16ToDate } = require("../js/misc");
const { stores, STORE_KEYS } = require("./stores");

function decompressBinary(buffer) {
    const objects = [];
    let offset = 0;
    const view = new DataView(buffer);
    const baseDate = new Date("2000-01-01");
    const textDecoder = new TextDecoder("utf-8");

    const numStores = view.getUint8(offset++);
    const stores = [];
    for (let i = 0; i < numStores; i++) {
        const nameLength = view.getUint16(offset, true);
        offset += 2;
        const nameBuffer = new Uint8Array(buffer, offset, nameLength);
        stores.push(textDecoder.decode(nameBuffer));
        offset += nameLength;
    }

    const numWords = view.getUint32(offset, true);
    offset += 4;
    const words = new Array(numWords);
    for (let i = 0; i < numWords; i++) {
        const nameLength = view.getUint8(offset++);
        const nameBuffer = new Uint8Array(buffer, offset, nameLength);
        words[i] = textDecoder.decode(nameBuffer);
        offset += nameLength;
    }

    while (offset < buffer.byteLength) {
        const obj = {};
        const idLength = view.getUint8(offset++);
        const idBuffer = new Uint8Array(buffer, offset, idLength);
        obj.id = textDecoder.decode(idBuffer);
        offset += idLength;

        const flagsByte = view.getUint8(offset++);
        obj.bio = (flagsByte & 1) !== 0;
        obj.isWeighted = (flagsByte & 2) !== 0;
        if (flagsByte & 4) obj.unit = "ml";
        if (flagsByte & 8) obj.unit = "g";
        if (flagsByte & 16) obj.unit = "stk";
        if (flagsByte & 32) obj.unit = "cm";
        if (flagsByte & 64) obj.unit = "wg";

        obj.quantity = view.getUint16(offset, true);
        offset += 2;

        obj.store = stores[view.getUint8(offset++)];

        let name = "";
        const numTokens = view.getUint8(offset++);
        for (let i = 0; i < numTokens; i++) {
            const b1 = view.getUint8(offset++);
            const b2 = view.getUint8(offset++);
            const b3 = view.getUint8(offset++);
            const tokenId = (b3 << 16) | (b2 << 8) | b1;
            name += words[tokenId];
            if (i < numTokens - 1) name += " ";
        }
        obj.name = name;

        const urlLength = view.getUint16(offset, true);
        offset += 2;
        if (urlLength !== 0) {
            const urlBuffer = new Uint8Array(buffer, offset, urlLength);
            obj.url = textDecoder.decode(urlBuffer);
        } else {
            obj.url = undefined;
        }
        offset += urlLength;

        const priceHistoryLength = view.getUint16(offset, true);
        offset += 2;
        obj.priceHistory = new Array(priceHistoryLength);

        for (let i = 0; i < priceHistoryLength; i++) {
            const price = view.getUint16(offset, true) / 100;
            offset += 2;

            const date = uint16ToDate(view.getUint16(offset, true));
            offset += 2;

            obj.priceHistory[i] = { date, price };
        }

        obj.price = obj.priceHistory[0].price;

        objects.push(obj);
    }

    return objects;
}

function decompress(compressedItems) {
    const storeLookup = compressedItems.stores;
    const data = compressedItems.data;
    const dates = compressedItems.dates;
    const numItems = compressedItems.n;
    const items = new Array(numItems);
    let i = 0;
    const strings = new Map();
    const internString = (string) => {
        if (strings.has(string)) {
            return strings.get(string);
        } else {
            strings.set(string, string);
            return string;
        }
    };
    for (let l = 0; l < numItems; l++) {
        const store = storeLookup[data[i++]];
        const id = internString(data[i++]);
        const name = internString(data[i++]);
        const numPrices = data[i++];
        const prices = new Array(numPrices);
        for (let j = 0; j < numPrices; j++) {
            const date = dates[data[i++]];
            const price = data[i++];
            prices[j] = {
                date: internString(date.substring(0, 4) + "-" + date.substring(4, 6) + "-" + date.substring(6, 8)),
                price,
            };
        }
        const unit = internString(data[i++]);
        const quantity = data[i++];
        const isWeighted = data[i++] == 1;
        const bio = data[i++] == 1;
        const url = data[i++];

        items[l] = {
            store,
            id,
            name,
            price: prices[0].price,
            priceHistory: prices,
            isWeighted,
            unit,
            quantity,
            bio,
            url,
        };
    }
    return items;
}

function processItems(items) {
    const lookup = {};
    const start = performance.now();
    for (const item of items) {
        lookup[item.store + item.id] = item;
        item.search = item.name + " " + item.quantity + " " + item.unit;
        item.search = item.search.toLowerCase().replace(",", ".");

        const unitPriceFactor = item.unit == "g" || item.unit == "ml" ? 1000 : 1;
        item.unitPrice = (item.price / item.quantity) * unitPriceFactor;
        item.numPrices = item.priceHistory.length;
        item.priceOldest = item.priceHistory[item.priceHistory.length - 1].price;
        item.dateOldest = item.priceHistory[item.priceHistory.length - 1].date;
        item.date = item.priceHistory[0].date;
        let highestPriceBefore = -1;
        let lowestPriceBefore = 100000;
        for (let i = 0; i < item.priceHistory.length; i++) {
            const price = item.priceHistory[i];
            price.unitPrice = (price.price / item.quantity) * unitPriceFactor;
            if (i == 0) continue;
            if (i < 10) {
                item["price" + i] = price.price;
                item["unitPrice" + i] = price.unitPrice;
                item["date" + i] = price.date;
            }
            highestPriceBefore = Math.max(highestPriceBefore, price.price);
            lowestPriceBefore = Math.min(lowestPriceBefore, price.price);
        }
        if (highestPriceBefore == -1) highestPriceBefore = item.price;
        if (lowestPriceBefore == 100000) lowestPriceBefore = item.price;
        item.highestBefore = highestPriceBefore;
        item.lowestBefore = lowestPriceBefore;
    }

    items.sort((a, b) => {
        if (a.store < b.store) {
            return -1;
        } else if (a.store > b.store) {
            return 1;
        }

        if (a.name < b.name) {
            return -1;
        } else if (a.name > b.name) {
            return 1;
        }

        return 0;
    });

    log(`Loader - processing ${items.length} items took ${deltaTime(start).toFixed(4)} secs`);
    return { items, lookup };
}

exports.loadItems = async (settings) => {
    let start = performance.now();
    const compressedItemsPerStore = [];
    log(`Loader - load using JSON: ${settings.useJson}`);
    for (const store of STORE_KEYS) {
        compressedItemsPerStore.push(
            new Promise(async (resolve) => {
                let start = performance.now();
                try {
                    const useJSON = settings.useJson;
                    if (useJSON) {
                        const response = await fetch(`data/latest-canonical.${store}.compressed.json`);
                        const json = await response.json();
                        log(`Loader - loading compressed items for ${store} took ${deltaTime(start)} secs`);
                        start = performance.now();
                        let items = decompress(json);
                        log(`Loader - Decompressing items for ${store} took ${deltaTime(start)} secs`);
                        resolve(items);
                    } else {
                        const response = await fetch(`data/latest-canonical.${store}.bin.json`);
                        const binary = await response.arrayBuffer();
                        log(`Loader - loading compressed binary items for ${store} took ${deltaTime(start)} secs`);
                        start = performance.now();
                        let items = decompressBinary(binary);
                        log(`Loader - Decompressing items for ${store} took ${deltaTime(start)} secs`);
                        resolve(items);
                    }
                } catch (e) {
                    log(`Loader - error while loading compressed items for ${store} ${e.message}`);
                    resolve([]);
                }
            })
        );
    }
    const items = [].concat(...(await Promise.all(compressedItemsPerStore)));
    log(`Loader - loaded ${items.length} items took ${deltaTime(start).toFixed(4)} secs`);

    const result = processItems(items);
    log(`Loader - total loading took ${deltaTime(start).toFixed(4)} secs`);

    return result;
};

onmessage = async (event) => {
    const settings = event.data.settings;
    const result = await exports.loadItems(settings);
    postMessage(result);
};
