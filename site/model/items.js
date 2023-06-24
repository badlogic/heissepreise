const { Model } = require("./model");
const { STORE_KEYS } = require("./stores");
const { Settings } = require("./settings");
const { log, deltaTime } = require("../js/misc");
const { ProgressBar } = require("../js/progress-bar");

const Bar = new ProgressBar(STORE_KEYS.length);

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

    async load() {
        const settings = new Settings();
        let start = performance.now();
        const compressedItemsPerStore = [];

        for (const store of STORE_KEYS) {
            compressedItemsPerStore.push(
                new Promise(async (resolve) => {
                    let start = performance.now();
                    try {
                        const response = await fetch(`data/latest-canonical.${store}.compressed.json`);
                        const json = await response.json();
                        log(`Loader - loading compressed items for ${store} took ${deltaTime(start)} secs`);
                        start = performance.now();
                        let items = exports.decompress(json);
                        log(`Loader - Decompressing items for ${store} took ${deltaTime(start)} secs`);
                        resolve(items);
                    } catch (e) {
                        log(`Loader - error while loading compressed items for ${store} ${e.message}`);
                        resolve([]);
                    }
                    Bar.addStep();
                })
            );
        }

        let items = [].concat(...(await Promise.all(compressedItemsPerStore)));
        log(`Loader - loaded ${items.length} items took ${deltaTime(start).toFixed(4)} secs`);

        const result = this.processItems(items);
        log(`Loader - total loading took ${deltaTime(start).toFixed(4)} secs`);

        this._items = result.items;
        this._lookup = result.lookup;
    }

    processItems(items) {
        const lookup = {};
        const start = performance.now();
        const interns = new Map();
        const intern = (value) => {
            if (interns.has(value)) {
                return interns.get(value);
            } else {
                interns.set(value, value);
                return value;
            }
        };

        const getters = {
            unitPrice: {
                get() {
                    const unitPriceFactor = this.unit == "g" || this.unit == "ml" ? 1000 : 1;
                    return (this.price / this.quantity) * unitPriceFactor;
                },
            },
            numPrices: {
                get() {
                    return this.priceHistory.length;
                },
            },
            date: {
                get() {
                    return this.priceHistory[0].date;
                },
            },
            priceOldest: {
                get() {
                    return this.priceHistory[this.priceHistory.length - 1].price;
                },
            },
            dateOldest: {
                get() {
                    return this.priceHistory[this.priceHistory.length - 1].date;
                },
            },
        };

        for (let i = 1; i < 3; i++) {
            (getters[`price${i}`] = {
                get() {
                    return this.priceHistory[i] ? this.priceHistory[i].price : 0;
                },
            }),
                (getters[`date${i}`] = {
                    get() {
                        return this.priceHistory[i] ? this.priceHistory[i].date : null;
                    },
                });
        }

        items.forEach((item) => {
            lookup[item.store + item.id] = item;
            for (const getter in getters) {
                Object.defineProperty(item, getter, getters[getter]);
            }

            item.store = intern(item.store);
            item.id = intern(item.id);
            item.name = intern(item.name);
            item.category = intern(item.category);
            item.price = intern(item.price);
            for (const price of item.priceHistory) {
                price.date = intern(price.date);
                price.price = intern(price.price);
            }
            item.unit = intern(item.unit);
            item.quantity = intern(item.quantity);

            item.search = item.name + " " + item.quantity + " " + item.unit;
            item.search = intern(item.search.toLowerCase().replace(",", "."));

            const unitPriceFactor = item.unit == "g" || item.unit == "ml" ? 1000 : 1;
            for (let i = 0; i < item.priceHistory.length; i++) {
                const price = item.priceHistory[i];
                price.unitPrice = (price.price / item.quantity) * unitPriceFactor;
            }
        });

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
}

exports.Items = Items;

exports.decompress = (compressedItems) => {
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
        const category = data[i++];
        const unavailable = data[i++] == 1;
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
        const url = data[i++];

        items[l] = {
            store,
            id,
            name,
            category,
            unavailable,
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
};
