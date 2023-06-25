const { Carts } = require("./carts");
const { Items } = require("./items");
const { Settings } = require("./settings");

exports.stores = require("./stores");
exports.categories = require("./categories");
exports.carts = new Carts();
exports.items = new Items();
exports.settings = new Settings();

exports.load = async (progress) => {
    await exports.items.load(progress);
    await exports.carts.load(exports.items.lookup);
};
