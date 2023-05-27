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

    if (cart.name != "Momentum Eigenmarken Vergleich" && !cart.linked) showSearch(cart, items, lookup);
    showCart(cart, lookup);
    const canvasDom = document.querySelector("#chart");
    document.querySelector("#sum").addEventListener("change", () => {
        showCharts(canvasDom, cart, lookup);
    });
    document.querySelector("#sumbilla").addEventListener("change", () => {
        showCharts(canvasDom, cart, lookup);
    });
    document.querySelector("#sumspar").addEventListener("change", () => {
        showCharts(canvasDom, cart, lookup);
    });
    document.querySelector("#sumhofer").addEventListener("change", () => {
        showCharts(canvasDom, cart, lookup);
    })
    document.querySelector("#sumdm").addEventListener("change", () => {
        showCharts(canvasDom, cart, lookup);
    })
    document.querySelector("#sumlidl").addEventListener("change", () => {
        showCharts(canvasDom, cart, lookup);
    })
    document.querySelector("#summpreis").addEventListener("change", () => {
        showCharts(canvasDom, cart, lookup);
    })
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

function showCharts(canvasDom, cart, lookup) {
    let itemsToShow = [];
    let items = [];
    cart.items.forEach((cartItem) => {
        const item = lookup[cartItem.id];
        if (!item) return;
        items.push(item);
    });

    if (document.querySelector("#sum").checked && items.length > 0) {
        itemsToShow.push({
            name: "Summe",
            priceHistory: calculateOverallPriceChanges(items)
        });
    }

    if (document.querySelector("#sumbilla").checked) {
        const itemsBilla = items.filter(item => item.store == "billa");
        if (itemsBilla.length > 0) {
            itemsToShow.push({
                name: "Summe Billa",
                priceHistory: calculateOverallPriceChanges(itemsBilla)
            });
        }
    }

    if (document.querySelector("#sumspar").checked) {
        const itemsSpar = items.filter(item => item.store == "spar");
        if (itemsSpar.length > 0) {
            itemsToShow.push({
                name: "Summe Spar",
                priceHistory: calculateOverallPriceChanges(itemsSpar)
            });
        }
    }

    if (document.querySelector("#sumhofer").checked) {
        const itemsHofer = items.filter(item => item.store == "hofer");
        if (itemsHofer.length > 0) {
            itemsToShow.push({
                name: "Summe Hofer",
                priceHistory: calculateOverallPriceChanges(itemsHofer)
            });
        }
    }

    if (document.querySelector("#sumdm").checked) {
        const itemsDm = items.filter(item => item.store == "dm");
        if (itemsDm.length > 0) {
            itemsToShow.push({
                name: "Summe dm",
                priceHistory: calculateOverallPriceChanges(itemsDm)
            });
        }
    }

    if (document.querySelector("#sumlidl").checked) {
        const itemsLidl = items.filter(item => item.store == "lidl");
        if (itemsLidl.length > 0) {
            itemsToShow.push({
                name: "Summe Lidl",
                priceHistory: calculateOverallPriceChanges(itemsLidl)
            });
        }
    }

    if (document.querySelector("#summpreis").checked) {
        const itemsMpreis = items.filter(item => item.store == "mpreis");
        if (itemsMpreis.length > 0) {
            itemsToShow.push({
                name: "Summe MPREIS",
                priceHistory: calculateOverallPriceChanges(itemsMpreis)
            });
        }
    }

    cart.items.forEach((cartItem) => {
        const item = lookup[cartItem.id];
        if (!item) return;
        if (cartItem.chart) itemsToShow.push(item);
    });

    showChart(canvasDom, itemsToShow);
}

function showCart(cart, lookup) {
    document.querySelector("#cartname").innerText = "Warenkorb '" + cart.name + "'";
    const canvasDom = document.querySelector("#chart");
    showCharts(canvasDom, cart, lookup);

    const itemTable = document.querySelector("#cartitems");
    itemTable.innerHTML = "";
    const header = dom("thead", `<tr><th>Kette</th><th>Name</th><th>Menge</th><th>Preis</th><th></th></tr>`);
    itemTable.append(header);

    cart.items.forEach((cartItem, idx) => {
        const item = lookup[cartItem.id];
        if (!item) return;
        const itemDom = itemToDOM(item)


        const cell = dom("td", "");
        const showCheckbox = dom("input", "");
        showCheckbox.setAttribute("type", "checkbox");
        if (cartItem.chart) showCheckbox.setAttribute("checked", true);
        itemDom.append(showCheckbox);
        showCheckbox.addEventListener("change", () => {
            cartItem.chart = showCheckbox.checked;
            saveCarts();
            showCharts(canvasDom, cart, lookup);
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
                showCart(cart, lookup)
            })
            cell.appendChild(deleteButton);
        }
        itemDom.append(cell);
        itemTable.append(itemDom);
    });
}

load();