async function load() {
    const items = await loadItems();
    const lookup = {};
    for (item of items) {
        lookup[item.id] = item;
    }

    let cart = null;
    const cartName = getQueryParameter("name");
    for (c of carts) {
        if (c.name == cartName) {
            cart = c;
            break;
        }
    }

    if (cart == null) {
        alert("Warenkorb '" + cartName + "' existiert nicht.");
        location.href = "carts.html";
    }

    if (cart.name != "Momentum Eigenmarken Vergleich") showSearch(cart, items, lookup);
    showCart(cart, lookup);
}

function showSearch(cart, items, lookup) {
    const searchDom = document.querySelector("#search");
    searchDom.innerHTML = "";
    newSearchComponent(searchDom, items, null, (item) => {
        for (let i = 0; i < cart.items.length; i++) {
            const cartItem = cart.items[i];
            if (cartItem.id == item.id) return false;
        }
        return true;
    }, (header) => {
        header.append(dom("th", ""));
        return header;
    }, (item, itemDom) => {
        const addButton = dom("input");
        addButton.setAttribute("type", "button");
        addButton.setAttribute("value", "+");
        const cell = dom("td", "");
        cell.appendChild(addButton);
        itemDom.appendChild(cell);

        addButton.addEventListener("click", () => {
            cart.items.push(item);
            saveCarts();
            showCart(cart, lookup);
        });

        return itemDom;
    });
}

function showCart(cart, lookup) {
    const cartDom = document.querySelector("#cart");
    cartDom.innerHTML = "";
    cartDom.append(dom("h2", "Warenkorb '" + cart.name + "'"));
    const canvasDom = dom("canvas", "");
    cartDom.append(canvasDom);
    const items = [];
    cart.items.forEach((cartItem) => {
        const item = lookup[cartItem.id];
        if (!item) return;
        if(cartItem.chart) items.push(item);
    });
    showChart(canvasDom, items, lookup);

    const itemTable = dom("table", "");
    const header = dom("tr", `<th>Kette</th><th>Name</th><th>Menge</th><th>Preis</th><th></th>`);
    itemTable.append(header);

    cart.items.forEach((cartItem, idx) => {
        const item = lookup[cartItem.id];
        if (!item) return;
        const itemDom = itemToDOM(item)

        const checkBox = dom("input", "");
        checkBox.setAttribute("type", "checkbox");
        if (cartItem.chart) checkBox.setAttribute("checked", true);
        itemDom.append(checkBox);
        checkBox.addEventListener("change", () => {
            cartItem.chart = checkBox.checked;
            saveCarts();
            const items = [];
            cart.items.forEach((cartItem) => {
                const item = lookup[cartItem.id];
                if (!item) return;
                if(cartItem.chart) items.push(item);
            });
            showChart(canvasDom, items);
        });

        if (cart.name != "Momentum Eigenmarken Vergleich") {
            const deleteButton = dom("input", "");
            deleteButton.setAttribute("type", "button");
            deleteButton.setAttribute("value", "-");
            itemDom.append(deleteButton);
            deleteButton.addEventListener("click", () => {
                cart.items.splice(idx, 1);
                saveCarts();
                showCart(cart, lookup)
            })
        }

        itemTable.append(itemDom);
    });
    cartDom.append(itemTable);
}

load();