const shoppingCarts = new ShoppingCarts();
shoppingCarts.load();

async function load() {
    const items = await loadItems();
    const lookup = {};
    for (item of items) {
        lookup[item.store + item.id] = item;
    }

    let cart = null;
    const cartName = getQueryParameter("name");
    if (cartName) {
        for (c of shoppingCarts.carts) {
            if (c.name == cartName) {
                cart = c;
                break;
            }
        }

        // Update cart pricing info
        let items = [];
        for (cartItem of cart.items) {
            const item = lookup[cartItem.store + cartItem.id];
            if (!item) shoppingCarts.items.push(cartItem);
            else items.push(item);
        }
        cart.items = items;
        shoppingCarts.save();
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
            let index = shoppingCarts.carts.findIndex((c) => c.name === cart.name);
            if (index != -1) {
                if (confirm("Existierenden Warenkorb '" + cart.name + " überschreiben?")) {
                    shoppingCarts.carts[index] = cart;
                }
            } else {
                shoppingCarts.carts.push(importedCart);
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
    document.querySelector("#sum").addEventListener("change", () => showCharts(canvasDom, cart.items));
    document.querySelector("#sumstores").addEventListener("change", () => showCharts(canvasDom, cart.items));
    document.querySelector("#todayonly").addEventListener("change", () => showCharts(canvasDom, cart.items));

    const filtersStore = document.querySelector("#filters-store");
    filtersStore.innerHTML = STORE_KEYS.map(store => `<label><input id="${store}" type="checkbox" checked="true">${stores[store].name}</label>`).join(" ");
    filtersStore.querySelectorAll("input").forEach(input => input.addEventListener("change", () => showCart(cart)));
    document.querySelector("#filter").addEventListener("input", () => showCart(cart));
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
    newSearchComponent(searchDom, items, null, null, (header) => {
        header.append(dom("th", ""));
        return header;
    }, (item, itemDom) => {
        const cell = dom("td", `<input type="button" value="+">`);
        cell.children[0].addEventListener("click", () => {
            cart.items.push(item);
            shoppingCarts.save();
            showCart(cart);
        });
        itemDom.appendChild(cell);
        return itemDom;
    });
}

function showCharts(canvasDom, items) {
    const todayOnly = document.querySelector("#todayonly").checked;
    let itemsToShow = [];

    if (document.querySelector("#sum").checked && items.length > 0) {
        itemsToShow.push({
            name: "Preissumme Warenkorb",
            priceHistory: calculateOverallPriceChanges(items, todayOnly)
        });
    }

    if (document.querySelector("#sumstores").checked && items.length > 0) {
        const storeCheckboxes = STORE_KEYS.map(store => document.querySelector(`#${store}`));
        const checkedStores = STORE_KEYS.filter((store, i) => storeCheckboxes[i].checked)

        checkedStores.forEach(store => {
            const storeItems = items.filter(item => item.store === store);
            if (storeItems.length > 0) {
                itemsToShow.push({
                    name: "Preissumme " + store,
                    priceHistory: calculateOverallPriceChanges(storeItems, todayOnly)
                });
            }
        });
    }

    items.forEach((item) => {
        if (item.chart) itemsToShow.push({ name: item.store + " " + item.name, priceHistory: todayOnly ? [{date: currentDate(), price: item.price}] : item.priceHistory});
    });

    showChart(canvasDom, itemsToShow, todayOnly ? "bar" : "line");
}

function showCart(cart) {
    let link = cart.name + ";"
    for (cartItem of cart.items) {
        link += cartItem.store + cartItem.id + ";";
    }

    document.querySelector("#cartname").innerHTML = "Warenkorb '" + cart.name + `' <a href="cart.html?cart=${link}">Teilen</a>`;
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

        const cell = dom("td", `
            <input type="checkbox">
            <input type="button" value="-">
            <input type="button" value="⬆️">
            <input type="button" value="⬇️">
        `);

        if (cartItem.chart) cell.children[0].setAttribute("checked", true);
        cell.children[0].addEventListener("change", () => {
            cartItem.chart = cell.children[0].checked;
            shoppingCarts.save();
            showCharts(canvasDom, items);
        });

        if (cart.name != "Momentum Eigenmarken Vergleich" && !cart.linked) {
            cell.children[1].addEventListener("click", () => {
                cart.items.splice(idx, 1);
                shoppingCarts.save();
                showCart(cart)
            });

            cell.children[2].addEventListener("click", () => {
                if (idx == 0) return;
                let otherItem = cart.items[idx - 1];
                cart.items[idx - 1] = cartItem;
                cart.items[idx] = otherItem;
                shoppingCarts.save();
                showCart(cart)
            });

            cell.children[3].addEventListener("click", () => {
                if (idx == cart.items.length - 1) return;
                let otherItem = cart.items[idx + 1];
                cart.items[idx + 1] = cartItem;
                cart.items[idx] = otherItem;
                shoppingCarts.save();
                showCart(cart)
            });
        } else {
            cell.querySelectorAll("input[type='button']").forEach(button => button.classList.add("hide"));
        }

        itemDom.append(cell);
        itemTable.append(itemDom);
    });
}

load();