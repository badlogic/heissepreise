const misc = require("../misc");
const { Model } = require("./model");

class Carts extends Model {
    constructor() {
        super();
        this._carts = [];
    }

    get carts() {
        return this._carts;
    }

    async load(itemsLookup) {
        const val = localStorage.getItem("carts");
        const carts = (this._carts = val ? JSON.parse(val) : []);

        // Add Momentum cart if it is not in the list of carts
        if (!carts.some((cart) => cart.name === "Momentum Eigenmarken Vergleich")) {
            const momentumCart = await misc.fetchJSON("data/momentum-cart.json");
            carts.unshift(momentumCart);
        }

        // Update items in cart to their latest version.
        for (const cart of carts) {
            const items = [];
            for (const cartItem of cart.items) {
                const item = itemsLookup[cartItem.store + cartItem.id];
                if (!item) items.push(cartItem);
                else items.push(item);
            }
            cart.items = items;
        }
        this.save();
    }

    save() {
        localStorage.setItem("carts", JSON.stringify(this._carts, null, 2));
        this.notify();
    }

    add(name) {
        this._carts.push({ name: name, items: [] });
        this.save();
    }

    remove(name) {
        this._carts = this._carts.filter((cart) => cart.name !== name);
        this.save();
    }
}

exports.Carts = Carts;
