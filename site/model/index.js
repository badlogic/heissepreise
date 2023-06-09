const { Carts } = require("./carts");
const { Items } = require("./items");

exports.stores = require("./stores");
exports.categories = require("./categories");
exports.carts = new Carts();
exports.items = new Items();

exports.load = async () => {
    await exports.items.load();
    await exports.carts.load(exports.items.lookup);
};
