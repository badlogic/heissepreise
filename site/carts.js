async function load() {
    const items = await loadItems();
    lookup = {};
    for (item of items) {
        lookup[item.id] = item;
    }

    if (carts.findIndex(cart => cart.name == "Momentum Eigenmarken Vergleich") == -1) {
        response = await fetch("momentum-cart.json");
        momentumCart = await response.json();
        carts.unshift(momentumCart);
        saveCarts();
    }

    const newCartButton = document.querySelector("#newcart");
    newCartButton.addEventListener("click", () => {
        let name = prompt("Name für Warenkorb eingeben:");
        if (name.length == 0) return;
        for (cart of carts) {
            if (cart.name == name) {
                alert("Warenkorb mit Namen '" + name + "' existiert bereits");
                return;
            }
        }
        addCart(name);
        location.href = "/cart.html?name=" + name;
    });

    showCarts(lookup);
}

function showCarts(lookup) {
    const cartsTable = document.querySelector("#carts");
    cartsTable.innerHTML = "";
    cartsTable.appendChild(dom("tr", `
        <th>Name</th>
        <th>Produkte</th>
        <th>Preis</th>
        <th></th>
    `));

    carts.forEach(cart => {
        let oldPrice = 0;
        let currPrice = 0;
        for (cartItem of cart.items) {
            const item = lookup[cartItem.id];
            if (!item) continue;
            oldPrice += item.priceHistory[item.priceHistory.length - 1].price;
            currPrice += item.priceHistory[0].price;
        }
        const increase = Math.round((currPrice - oldPrice) / oldPrice * 100);

        const row = dom("tr", ``);
        row.appendChild(dom("td", `<a href="cart.html?name=${cart.name}">${cart.name}</a>`));
        row.appendChild(dom("td", cart.items.length));
        row.appendChild(dom("td", `<span style="color: ${currPrice > oldPrice ? "red" : "green"}">${currPrice.toFixed(2)}`));
        if (cart.name != "Momentum Eigenmarken Vergleich") {
            let deleteButton = dom("input");
            deleteButton.setAttribute("type", "button");
            deleteButton.setAttribute("value", "Löschen");
            row.appendChild(deleteButton);

            deleteButton.addEventListener("click", () => {
                removeCart(cart.name);
                showCarts(lookup);
            });
        }
        cartsTable.appendChild(row);
    });
}

load();