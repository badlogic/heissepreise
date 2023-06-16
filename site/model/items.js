const { deltaTime, log, isoDate } = require("../js/misc");
const { stores, STORE_KEYS } = require("./stores");
const { Model } = require("./model");
const { Settings } = require("./settings");

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

    while (offset < buffer.byteLength) {
        const obj = {};

        // Deserialize 'bio', 'isWeighted', and 'unit' from the single byte
        const flagsByte = view.getUint8(offset++);
        obj.bio = (flagsByte & 1) !== 0;
        obj.isWeighted = (flagsByte & 2) !== 0;
        obj.unit = (flagsByte & 4) !== 0 ? "ml" : (flagsByte & 8) !== 0 ? "stk" : "g";

        // Deserialize 'quantity' as a 4-byte float
        obj.quantity = view.getFloat32(offset, true);
        offset += 4;

        // Deserialize 'price' as a 4-byte float
        obj.price = view.getFloat32(offset, true);
        offset += 4;

        // Deserialize 'store' as a byte
        obj.store = stores[view.getUint8(offset++)];

        // Deserialize 'name' as UTF-8 with 2 bytes encoding the string length
        const nameLength = view.getUint16(offset, true);
        offset += 2;
        const nameBuffer = new Uint8Array(buffer, offset, nameLength);
        obj.name = textDecoder.decode(nameBuffer);
        offset += nameLength;

        // Deserialize 'url' as UTF-8 with 2 bytes encoding the string length (or undefined if length is 0)
        const urlLength = view.getUint16(offset, true);
        offset += 2;
        if (urlLength !== 0) {
            const urlBuffer = new Uint8Array(buffer, offset, urlLength);
            obj.url = textDecoder.decode(urlBuffer);
        } else {
            obj.url = undefined;
        }
        offset += urlLength;

        // Deserialize 'priceHistory' array
        const priceHistoryLength = view.getUint16(offset, true);
        offset += 2;
        obj.priceHistory = new Array(priceHistoryLength);

        for (let i = 0; i < priceHistoryLength; i++) {
            // Deserialize price as a 4-byte float
            const price = view.getFloat32(offset, true);
            offset += 4;

            // Deserialize days as a 32-bit integer
            const daysSince2000 = view.getInt32(offset, true);
            offset += 4;
            // Calculate the date from days since 2000-01-01
            const dateStr = isoDate(daysSince2000);

            obj.priceHistory[i] = { date: dateStr, price };
        }

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
    for (let l = 0; l < numItems; l++) {
        const store = storeLookup[data[i++]];
        const id = data[i++];
        const name = data[i++];
        const numPrices = data[i++];
        const prices = new Array(numPrices);
        for (let j = 0; j < numPrices; j++) {
            const date = dates[data[i++]];
            const price = data[i++];
            prices[j] = {
                date: date.substring(0, 4) + "-" + date.substring(4, 6) + "-" + date.substring(6, 8),
                price,
            };
        }
        const unit = data[i++];
        const quantity = data[i++];
        const isWeighted = data[i++] == 1;
        const bio = data[i++] == 1;
        const url = stores[store].getUrl({ id, name, url: data[i++] });

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

class Items extends Model {
    constructor() {
        super();
        this._items = [];
        this._filteredItems = [];
        this._lookup = {};
    }

    get items() {
        return this._items;
    }

    get filteredItems() {
        return this._filteredItems;
    }

    set filteredItems(newItems) {
        this._filteredItems = newItems;
        this.notify();
    }

    get lookup() {
        return this._lookup;
    }

    processItems(items) {
        const lookup = new Set();
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

        log(`Items - processing ${items.length} items took ${deltaTime(start).toFixed(4)} secs`);
        this._items = items;
        this._lookup = lookup;
    }

    async load() {
        let start = performance.now();
        const settings = new Settings();
        const compressedItemsPerStore = [];
        for (const store of STORE_KEYS) {
            // if (["reweDe", "dmDe", "sparSi"].includes(store)) continue;
            compressedItemsPerStore.push(
                new Promise(async (resolve) => {
                    let start = performance.now();
                    try {
                        const useJSON = settings.useJson;
                        if (useJSON) {
                            const response = await fetch(`data/latest-canonical.${store}.compressed.json`);
                            const json = await response.json();
                            log(`Items - loading compressed items for ${store} took ${deltaTime(start)} secs`);
                            start = performance.now();
                            let items = decompress(json);
                            log(`Items - Decompressing items for ${store} took ${deltaTime(start)} secs`);
                            resolve(items);
                        } else {
                            const response = await fetch(`data/latest-canonical.${store}.bin.json`);
                            const binary = await response.arrayBuffer();
                            log(`Items - loading compressed binary items for ${store} took ${deltaTime(start)} secs`);
                            start = performance.now();
                            let items = decompressBinary(binary);
                            log(`Items - Decompressing items for ${store} took ${deltaTime(start)} secs`);
                            resolve(items);
                        }
                    } catch (e) {
                        log(`Items - error while loading compressed items for ${store} ${e.message}`);
                        resolve([]);
                    }
                })
            );
        }
        const items = [].concat(...(await Promise.all(compressedItemsPerStore)));
        log(`Items - loaded ${items.length} items took ${deltaTime(start).toFixed(4)} secs`);

        this.processItems(items);
        log(`Items - total loading took ${deltaTime(start).toFixed(4)} secs`);
    }
}

exports.decompress = decompress;
exports.Items = Items;
