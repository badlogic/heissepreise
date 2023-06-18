const { Model } = require("./model");
const { Settings } = require("./settings");
const { loadItems } = require("./items-loader");

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
        if (window.Worker && false) {
            const self = this;
            return new Promise((resolve, reject) => {
                const loader = new Worker("items-loader.js");
                loader.onmessage = (event) => {
                    self._items = event.data.items;
                    self._lookup = event.data.lookup;
                    resolve();
                };
                loader.postMessage({ settings });
            });
        } else {
            const { items, lookup } = await loadItems(settings);
            this._items = items;
            this._lookup = lookup;
        }
    }
}

exports.Items = Items;
