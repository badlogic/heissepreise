const { dom, downloadJSON } = require("./misc");
const model = require("./model");

function render(carts) {}

(async () => {
    await model.load();
    const carts = model.carts.carts;

    document.querySelector("#new").addEventListener("click", () => {
        let name = prompt("Name für Warenkorb eingeben:");
        if (!name || name.trim().length == 0) return;
        name = name.trim();
        if (carts.some((cart) => cart.name === name)) {
            alert("Warenkorb mit Namen '" + name + "' existiert bereits");
            return;
        }
        model.carts.add(name);
        location.href = `/cart.html?name=${encodeURIComponent(name)}`;
    });

    document.querySelector("#export").addEventListener("click", () => {
        downloadJSON("carts.json", carts);
    });

    document.querySelector("#import").addEventListener("click", () => {});

    document.querySelector("#fileInput").addEventListener("change", function (event) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const importedCarts = JSON.parse(event.target.result);
            for (const importedCart of importedCarts) {
                const items = [];
                for (const cartItem of importedCart.items) {
                    const item = model.items.lookup[cartItem.store + cartItem.id];
                    if (!item) continue;
                    items.push(item);
                }
                importedCart.items = items;

                const index = carts.findIndex((cart) => cart.name === importedCart.name);
                if (index != -1) {
                    if (confirm("Existierenden Warenkorb '" + importedCart.name + " überschreiben?")) {
                        carts[index] = importedCart;
                    }
                } else {
                    carts.push(importedCart);
                }
            }
            model.carts.save();
            render(carts);
        };
        reader.readAsText(event.target.files[0]);
    });

    render(carts);
})();
