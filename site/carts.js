const { downloadJSON, today } = require("./js/misc");
const model = require("./model");
require("./views");
const { __ } = require("./browser_i18n");

const { STORE_KEYS } = require("./model/stores");
const { ProgressBar } = require("./views/progress-bar");
const progressBar = new ProgressBar(STORE_KEYS.length);

function newCart() {
    let name = prompt(__("Carts_Name für Warenkorb eingeben:"));
    if (!name || name.trim().length == 0) return;
    name = name.trim();
    if (model.carts.carts.some((cart) => cart.name === name)) {
        alert(__("Carts_Warenkorb mit Namen '{{name}}' existiert bereits", { name: name }));
        return;
    }
    model.carts.add(name);
    location.href = `cart.html?name=${encodeURIComponent(name)}`;
}

function isIterable(obj) {
    return typeof obj[Symbol.iterator] === "function";
}

function importCart(importedCart) {
    const items = [];
    for (const cartItem of importedCart.items) {
        const item = model.items.lookup[cartItem.store + cartItem.id];
        if (!item) continue;
        items.push(item);
    }
    importedCart.items = items;

    const index = model.carts.carts.findIndex((cart) => cart.name === importedCart.name);
    if (index != -1) {
        let newName = importedCart.name;
        while (true) {
            newName = prompt(
                __("Carts_Warenkorb '{{name}}' existiert bereits. Bitte einen anderen Namen für den zu importierenden Warenkorb eingeben", {
                    name: importedCart.name,
                }),
                importedCart.name + today()
            );
            if (!newName || newName.trim().length == 0) return;
            newName = newName.trim();
            if (newName != importedCart.name) {
                importedCart.name = newName;
                model.carts.carts.push(importedCart);
                break;
            }
        }
    } else {
        model.carts.carts.push(importedCart);
    }
    model.carts.save();
}

function importCarts(importedCarts) {
    if (isIterable(importedCarts)) {
        importedCarts.forEach((cart) => importCart(cart));
    } else {
        importCart(importedCarts);
    }
}

(async () => {
    await model.load(() => progressBar.addStep());
    document.querySelector("#carts").model = model.carts;
    document.querySelector("#new").addEventListener("click", () => newCart());
    document.querySelector("#export").addEventListener("click", () => downloadJSON("carts.json", model.carts.carts));
    document.querySelector("#import").addEventListener("click", () => document.querySelector("#fileInput").click());
    document.querySelector("#fileInput").addEventListener("change", function (event) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const importedCarts = JSON.parse(event.target.result);
            importCarts(importedCarts);
        };
        reader.readAsText(event.target.files[0]);
    });
})();
