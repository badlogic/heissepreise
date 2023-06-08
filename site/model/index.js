exports.stores = require("./stores");
exports.categories = require("./categories");
exports.items = require("./items");
exports.carts = require("./carts");

exports.load = async () => {
    await exports.items.load();
    await exports.carts.load(exports.items.lookup);
};
