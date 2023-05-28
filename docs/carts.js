function downloadFile(filename, content) {
    const blob = new Blob([content], { type: 'text/plain' });
    const element = document.createElement('a');
    element.href = URL.createObjectURL(blob);
    element.download = filename;
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(element.href);
}

async function load() {
    const items = await loadItems();
    lookup = {};
    for (item of items) {
        lookup[item.id] = item;
    }

    // Update carts with latest price info
    for (cart of carts) {
        const items = [];
        for (cartItem of cart.items) {
            const item = lookup[cartItem.id];
            if (!item) continue;
            items.push(item);
        }
        cart.items = items;
    }
    saveCarts();

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

    const exportButton = document.querySelector("#export");
    exportButton.addEventListener("click", () => {
        downloadFile("carts.json", JSON.stringify(carts, null, 2));
    });

    const importButton = document.querySelector("#import");
    importButton.addEventListener("click", () => {
        document.getElementById('fileInput').value = null
        document.getElementById('fileInput').click();
    });

    document.querySelector("#fileInput").addEventListener('change', function (event) {
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.onload = function (event) {
            const contents = event.target.result;
            const importedCarts = JSON.parse(contents);
            for (importedCart of importedCarts) {
                const items = [];
                for (cartItem of cart.items) {
                    const item = lookup[cartItem.id];
                    if (!item) continue;
                    items.push(item);
                }
                importedCart.items = items;

                let index = carts.findIndex(cart => cart.name == importedCart.name);
                if (index != -1) {
                    if (confirm("Existierenden Warenkorb '" + importedCart.name + " überschreiben?")) {
                        carts[index] = importedCart;
                    }
                } else {
                    carts.push(importedCart);
                }
            }
            saveCarts();
            showCarts(lookup);
        };
        reader.readAsText(file);
    });

    showCarts(lookup);
}

function showCarts(lookup) {
    const cartsTable = document.querySelector("#carts");
    cartsTable.innerHTML = "";
    cartsTable.appendChild(dom("thead", `
        <tr>
            <th>Name</th>
            <th>Produkte</th>
            <th>Preis</th>
            <th></th>
        </tr>
    `));

    carts.forEach(cart => {
        let oldPrice = 0;
        let currPrice = 0;
        let link = cart.name + ";"
        for (cartItem of cart.items) {
            const item = lookup[cartItem.id];
            if (!item) continue;
            oldPrice += item.priceHistory[item.priceHistory.length - 1].price;
            currPrice += item.priceHistory[0].price;
            link += item.id + ";";
        }
        const increase = Math.round((currPrice - oldPrice) / oldPrice * 100);

        const row = dom("tr", ``);

        const nameDom = dom("td", `<a href="cart.html?name=${cart.name}">${cart.name}</a>`);
        nameDom.setAttribute("data-label", "Name");
        row.appendChild(nameDom);

        const itemsDom = dom("td", cart.items.length);
        itemsDom.setAttribute("data-label", "Produkte");
        row.appendChild(itemsDom);

        const priceDom = dom("td", `<span style="color: ${currPrice > oldPrice ? "red" : "green"}">${currPrice.toFixed(2)} ${(increase > 0 ? "+" : "") + increase + "%"}`);
        priceDom.setAttribute("data-label", "Preis");
        row.appendChild(priceDom);

        const actionsDom = dom("td", ``);
        const linkDom = dom("a", "Teilen");
        linkDom.setAttribute("href", "cart.html?cart=" + link);
        actionsDom.appendChild(linkDom);

        if (cart.name != "Momentum Eigenmarken Vergleich") {
            let deleteButton = dom("input");
            deleteButton.setAttribute("type", "button");
            deleteButton.setAttribute("value", "Löschen");
            actionsDom.appendChild(deleteButton);

            deleteButton.addEventListener("click", () => {
                removeCart(cart.name);
                showCarts(lookup);
            });
        }
        row.appendChild(actionsDom);
        cartsTable.appendChild(row);
    });
}

load();