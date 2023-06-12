const { deltaTime, log } = require("../misc");
const { stores, STORE_KEYS } = require("./stores");
const { Model } = require("./model");

function decompress(compressedItems) {
    const items = [];
    const storeLookup = compressedItems.stores;
    const data = compressedItems.data;
    const numItems = compressedItems.n;
    let i = 0;
    while (items.length < numItems) {
        const store = storeLookup[data[i++]];
        const id = data[i++];
        const name = data[i++];
        const numPrices = data[i++];
        const prices = [];
        for (let j = 0; j < numPrices; j++) {
            const date = data[i++];
            const price = data[i++];
            prices.push({
                date: date.substring(0, 4) + "-" + date.substring(4, 6) + "-" + date.substring(6, 8),
                price,
            });
        }
        const unit = data[i++];
        const quantity = data[i++];
        const isWeighted = data[i++] == 1;
        const bio = data[i++] == 1;
        const url = stores[store].getUrl({ id, name, url: data[i++] });

        items.push({
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
        });
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
        const lookup = {};
        const start = performance.now();
        for (const item of items) {
            lookup[item.store + item.id] = item;
            item.search = item.name + " " + item.quantity + " " + item.unit;
            item.search = item.search.toLowerCase().replace(",", ".");

            item.numPrices = item.priceHistory.length;
            item.priceOldest = item.priceHistory[item.priceHistory.length - 1].price;
            item.dateOldest = item.priceHistory[item.priceHistory.length - 1].date;
            item.date = item.priceHistory[0].date;
            let highestPriceBefore = -1;
            let lowestPriceBefore = 100000;
            for (let i = 1; i < item.priceHistory.length; i++) {
                const price = item.priceHistory[i];
                if (i < 10) {
                    item["price" + i] = price.price;
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
        const compressedItemsPerStore = [];
        for (const store of STORE_KEYS) {
            compressedItemsPerStore.push(
                new Promise(async (resolve) => {
                    const start = performance.now();
                    try {
                        const response = await fetch(`data/latest-canonical.${store}.compressed.json`);
                        const json = await response.json();
                        log(`Items - loading compressed items for ${store} took ${deltaTime(start)} secs`);
                        resolve(decompress(json));
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
    }
}

exports.Items = Items;
