const misc = require("../misc");

exports.carts = [];

exports.load = async (itemsLookup) => {
    const val = localStorage.getItem("carts");
    const carts = (exports.carts = val ? JSON.parse(val) : []);

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
    exports.save();
};

exports.save = () => {
    localStorage.setItem("carts", JSON.stringify(exports.carts, null, 2));
};

exports.add = (name) => {
    exports.carts.push({
        name: name,
        items: [],
    });
    exports.save();
};

exports.remove = (name) => {
    exports.carts = exports.carts.filter((cart) => cart.name !== name);
    exports.save();
};
