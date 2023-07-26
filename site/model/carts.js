const misc = require("../js/misc");
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
        let carts = (this._carts = val ? JSON.parse(val) : []);

        // Add Momentum cart if it is not in the list of carts
        if (!localStorage.getItem("updatedMomentum") || !carts.some((cart) => cart.name === "Momentum Eigenmarken Vergleich")) {
            localStorage.setItem("updatedMomentum", "true");
            const momentumCart = await misc.fetchJSON("data/momentum-cart.new.json");
            carts.unshift(momentumCart);
        }

        if (!localStorage.getItem("updatedKnnCarts")) {
            localStorage.setItem("updatedKnnCarts", "true");
            carts = this._carts = carts.filter((cart) => cart.name != "Markenprodukte Billa/Spar");
            carts = this._carts = carts.filter((cart) => cart.name != "Diskont-Marken Produkte Billa/Spar");
            carts = this._carts = carts.filter((cart) => cart.name != "Bio Eigenmarken Produkte Billa/Spar");
            carts = this._carts = carts.filter((cart) => cart.name != "Mittelpreisige Eigenmarken Produkte Billa/Spar");
        }

        if (!carts.some((cart) => cart.name == "Markenprodukte Billa/Spar")) {
            const billaSparCart = await misc.fetchJSON("data/billa-spar-cart.json");
            carts.unshift(billaSparCart);
        }

        if (!carts.some((cart) => cart.name == "Diskont-Marken Produkte Billa/Spar")) {
            const budgetCart = await misc.fetchJSON("data/budget-cart.json");
            carts.unshift(budgetCart);
        }

        if (!carts.some((cart) => cart.name == "Bio Eigenmarken Produkte Billa/Spar")) {
            const budgetCart = await misc.fetchJSON("data/bio-cart.json");
            carts.unshift(budgetCart);
        }

        if (!carts.some((cart) => cart.name == "Mittelpreisige Eigenmarken Produkte Billa/Spar")) {
            const budgetCart = await misc.fetchJSON("data/midrange-cart.json");
            carts.unshift(budgetCart);
        }

        // Update items in cart to their latest version.
        for (const cart of carts) {
            const items = [];
            for (const cartItem of cart.items) {
                const item = itemsLookup[cartItem.store + cartItem.id];
                if (item) items.push(item);
            }
            cart.items = items;
        }
        this.save();
    }

    save() {
        const carts = [];
        for (const cart of this._carts) {
            carts.push({
                name: cart.name,
                items: cart.items.map((item) => {
                    return { store: item.store, id: item.id };
                }),
            });
        }
        localStorage.setItem("carts", JSON.stringify(carts, null, 2));
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
