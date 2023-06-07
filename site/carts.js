const shoppingCarts = new ShoppingCarts();
shoppingCarts.load();

async function load() {
    const items = await loadItems();
    const lookup = {};
    for (const item of items) {
        lookup[item.store + item.id] = item;
    }

    // Update carts with latest price info
    for (const cart of shoppingCarts.carts) {
        const items = [];
        for (const cartItem of cart.items) {
            const item = lookup[cartItem.store + cartItem.id];
            if (!item) continue;
            items.push(item);
        }
        cart.items = items;
    }
    shoppingCarts.save();

    if (shoppingCarts.carts.findIndex((cart) => cart.name === "Momentum Eigenmarken Vergleich") == -1) {
        response = await fetch("data/momentum-cart.json");
        momentumCart = await response.json();
        shoppingCarts.carts.unshift(momentumCart);
        shoppingCarts.save();
    }

    const newCartButton = document.querySelector("#newcart");
    newCartButton.addEventListener("click", () => {
        let name = prompt("Name für Warenkorb eingeben:");
        if (name.length === 0) return;
        for (cart of shoppingCarts.carts) {
            if (cart.name === name) {
                alert("Warenkorb mit Namen '" + name + "' existiert bereits");
                return;
            }
        }
        shoppingCarts.add(name);
        location.href = `/cart.html?name=${encodeURIComponent(name)}`;
    });

    const exportButton = document.querySelector("#export");
    exportButton.addEventListener("click", () => {
        downloadFile("carts.json", JSON.stringify(shoppingCarts.carts, null, 2));
    });

    const importButton = document.querySelector("#import");
    importButton.addEventListener("click", () => {
        document.getElementById("fileInput").value = null;
        document.getElementById("fileInput").click();
    });

    document.querySelector("#fileInput").addEventListener("change", function (event) {
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.onload = function (event) {
            const contents = event.target.result;
            const importedCarts = JSON.parse(contents);
            for (const importedCart of importedCarts) {
                const items = [];
                for (const cartItem of importedCart.items) {
                    const item = lookup[cartItem.store + cartItem.id];
                    if (!item) continue;
                    items.push(item);
                }
                importedCart.items = items;

                const index = shoppingCarts.carts.findIndex((cart) => cart.name === importedCart.name);
                if (index != -1) {
                    if (confirm("Existierenden Warenkorb '" + importedCart.name + " überschreiben?")) {
                        console.log(shoppingCarts.carts[index]);
                        shoppingCarts.carts[index] = importedCart;
                        console.log(shoppingCarts.carts[index]);
                    }
                } else {
                    shoppingCarts.carts.push(importedCart);
                }
            }
            shoppingCarts.save();
            showCarts(lookup);
        };
        reader.readAsText(file);
    });

    showCarts(lookup);
}

function showCarts(lookup) {
    const cartsTable = document.querySelector("#carts");
    cartsTable.innerHTML = "";
    cartsTable.appendChild(
        dom(
            "thead",
            `
        <tr class="bg-primary text-left hidden md:table-row uppercase text-sm text-white">
            <th class="px-2">Name</th>
            <th class="px-2">Produkte</th>
            <th class="px-2">Preis</th>
            <th class="px-2">Aktionen</th>
        </tr>
    `
        )
    );

    shoppingCarts.carts.forEach((cart) => {
        let oldPrice = 0;
        let currPrice = 0;
        let link = encodeURIComponent(cart.name) + ";";
        for (const cartItem of cart.items) {
            const item = lookup[cartItem.store + cartItem.id];
            if (!item) continue;
            oldPrice += item.priceHistory[item.priceHistory.length - 1].price;
            currPrice += item.priceHistory[0].price;
            link += item.store + item.id + ";";
        }
        const increase = oldPrice != 0 ? Math.round(((currPrice - oldPrice) / oldPrice) * 100) : 0;
        const cartUrl = `cart.html?name=${encodeURIComponent(cart.name)}`;

        const row = dom(
            "tr",
            `
            <td class="px-2 col-span-3" data-label="Name"><a class="hover:underline" href="${cartUrl}">${cart.name}</a></td>
            <td class="px-2" data-label="Produkte"><span class="md:hidden text-sm">Produkte: </span>${cart.items.length}</td>
            <td class="px-2 col-span-2" data-label="Preis">
                <span class="md:hidden text-sm">Preisänderungen: </span>
                <span style="color: ${currPrice > oldPrice ? "red" : "green"}">${currPrice.toFixed(2)} ${
                (increase > 0 ? "+" : "") + increase + "%"
            }</span>
            </td>
            <td class="px-2 col-span-3">
                <div class="cartactions flex gap-4">
                    <a class="text-primary hover:underline text-sm font-medium" href="cart.html?cart=${link}">Teilen</a>
                    <a class="cartjson text-primary hover:underline text-sm font-medium" href="">JSON</a>
                    ${
                        cart.name != "Momentum Eigenmarken Vergleich"
                            ? `<input class="cartdelete ml-auto text-red-500 hover:underline text-sm font-medium" type="button" value="Löschen">`
                            : ""
                    }
                </div>
            </td>
        `
        );
        row.classList.add("grid", "grid-cols-3", "hover:bg-gray-100", "border", "border-gray-200", "rounded-md", "p-2", "md:table-row");
        row.querySelector("td").addEventListener("click", () => (location.href = cartUrl));
        row.querySelector(".cartjson").addEventListener("click", (event) => {
            event.preventDefault();
            downloadFile(cart.name + ".json", JSON.stringify(cart, null, 2));
        });
        if (cart.name != "Momentum Eigenmarken Vergleich") {
            row.querySelector(".cartdelete").addEventListener("click", () => {
                shoppingCarts.remove(cart.name);
                showCarts(lookup);
            });
        }
        cartsTable.appendChild(row);
    });
}

load();
