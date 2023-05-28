async function load() {
    const items = await loadItems();
    const lookup = {};
    for (item of items) {
        lookup[item.id] = item;
    }

    let cart = null;
    const cartName = getQueryParameter("name");
    if (cartName) {
        for (c of carts) {
            if (c.name == cartName) {
                cart = c;
                break;
            }
        }

        // Update cart pricing info
        let items = [];
        for (cartItem of cart.items) {
            const item = lookup[cartItem.id];
            if (!item) items.push(cartItem);
            else items.push(item);
        }
        cart.items = items;
        saveCarts();
    }

    const cartDesc = getQueryParameter("cart");
    if (cartDesc) {
        let tokens = cartDesc.split(";");
        cart = {
            name: tokens[0],
            items: [],
            linked: true
        };
        for (let i = 1; i < tokens.length; i++) {
            const item = lookup[tokens[i]];
            if (item) cart.items.push(item);
        }
        let saveButton = document.querySelector("#save");
        saveButton.classList.remove("hide");
        saveButton.addEventListener("click", () => {
            let index = carts.findIndex(c => c.name == cart.name);
            if (index != -1) {
                if (confirm("Existierenden Warenkorb '" + cart.name + " überschreiben?")) {
                    carts[index] = cart;
                }
            } else {
                carts.push(importedCart);
            }
            location.href = "/cart.html?name=" + encodeURIComponent(cart.name);
        });
    }

    if (cart == null) {
        alert("Warenkorb '" + cartName + "' existiert nicht.");
        location.href = "carts.html";
    }

    if (cart.name != "Momentum Eigenmarken Vergleich" && !cart.linked) showSearch(cart, items);

    const canvasDom = document.querySelector("#chart");
    document.querySelector("#sum").addEventListener("change", () => {
        showCharts(canvasDom, cart.items);
    });
    const filtersStore = document.querySelector("#filters-store");
    filtersStore.innerHTML = STORE_KEYS.map(store => `<label><input id="${store}" type="checkbox" checked="true">${stores[store].name}</label>`).join(" ");
    filtersStore.querySelectorAll("input").forEach(input => {
        input.addEventListener("change", () => showCart(cart));
    });
    showCart(cart);
}

function filter(cartItems) {
    const query = document.querySelector("#filter").value.trim();
    const storeCheckboxes = STORE_KEYS.map(store => document.querySelector(`#${store}`));
    const checkedStores = STORE_KEYS.filter((store, i) => storeCheckboxes[i].checked)
    let items = [];
    if (query.charAt(0) != "!") {
        for (item of cartItems) {
            if (!checkedStores.includes(item.store)) continue;
            items.push(item);
        }
    } else {
        items = cartItems;
    }
    if (query.length >= 3) items = searchItems(items, document.querySelector("#filter").value, checkedStores, false, 0, 10000, false, false);
    return items;
}

function showSearch(cart, items) {
    const searchDom = document.querySelector("#search");
    searchDom.innerHTML = "";
    newSearchComponent(searchDom, items, null, (item) => {
        // This would filter all items in the cart from the search
        // result.
        /*for (let i = 0; i < cart.items.length; i++) {
            const cartItem = cart.items[i];
            if (cartItem.id == item.id) return false;
        }*/
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
            showCart(cart);
        });

        return itemDom;
    });
}

function showCharts(canvasDom, items) {
    let itemsToShow = [];

    if (document.querySelector("#sum").checked && items.length > 0) {
        itemsToShow.push({
            name: "Preissumme",
            priceHistory: calculateOverallPriceChanges(items)
        });
    }

    items.forEach((item) => {
        if (item.chart) itemsToShow.push(item);
    });

    showChart(canvasDom, itemsToShow);
}

function showCart(cart) {
    document.querySelector("#cartname").innerText = "Warenkorb '" + cart.name + "'";
    const canvasDom = document.querySelector("#chart");
    let items = filter(cart.items);
    if (items.length == cart.items.length) {
        document.querySelector("#numitems").innerText = `${cart.items.length} Artikel`;
    } else {
        document.querySelector("#numitems").innerText = `${items.length} / ${cart.items.length} Artikel`;
    }
    showCharts(canvasDom, items);

    const itemTable = document.querySelector("#cartitems");
    itemTable.innerHTML = "";
    const header = dom("thead", `<tr><th>Kette</th><th>Name</th><th>Menge</th><th>Preis</th><th></th></tr>`);
    itemTable.append(header);

    items.forEach((cartItem, idx) => {
        const itemDom = itemToDOM(cartItem)

        const cell = dom("td", "");
        const showCheckbox = dom("input", "");
        showCheckbox.setAttribute("type", "checkbox");
        if (cartItem.chart) showCheckbox.setAttribute("checked", true);
        itemDom.append(showCheckbox);
        showCheckbox.addEventListener("change", () => {
            cartItem.chart = showCheckbox.checked;
            saveCarts();
            showCharts(canvasDom, cart.items);
        });
        cell.append(showCheckbox);

        if (cart.name != "Momentum Eigenmarken Vergleich" && !cart.linked) {
            const deleteButton = dom("input", "");
            deleteButton.setAttribute("type", "button");
            deleteButton.setAttribute("value", "-");
            itemDom.append(deleteButton);
            deleteButton.addEventListener("click", () => {
                cart.items.splice(idx, 1);
                saveCarts();
                showCart(cart)
            })
            cell.appendChild(deleteButton);
        }
        itemDom.append(cell);
        itemTable.append(itemDom);
    });
}

load();