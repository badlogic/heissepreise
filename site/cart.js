async function load() {
    const response = await fetch("api/index")
    items = await response.json();
    lookup = {};
    for (item of items) {
        lookup[item.id] = item;
    }

    let cart = null;
    let cartName = getQueryParameter("name");

    if (cartName != "Momentum Eigenmarken Vergleich") {
        for (c of carts) {
            if (c.name == cartName) {
                cart = c;
                break;
            }
        }
    } else {
        const response = await fetch("momentum-cart.json");
        cart = await response.json();
    }

    if (cart == null) {
        alert("Warenkorb '" + cartName + "' existiert nicht.");
        location.href = "carts.html";
    }

    showSearch(cart, items);
    showCart(cart, lookup);
}

function showSearch(cart, items) {
    const searchDom = document.querySelector("#search");
    searchDom.innerHTML = "";
    newSearchComponent(searchDom, items, (item) => {
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

    const itemTable = dom("table", "");
    const header = dom("tr", `<th>Kette</th><th>Name</th><th>Menge</th><th>Preis</th><th></th>`);
    itemTable.append(header);

    cart.items.forEach((i, idx) => {
        const item = lookup[i.id];
        if (!item) return;
        const itemDom = itemToDOM(item)
        const deleteButton = dom("input", "");
        deleteButton.setAttribute("type", "button");
        deleteButton.setAttribute("value", "-");
        itemDom.append(deleteButton);
        itemTable.append(itemDom);

        deleteButton.addEventListener("click", () => {
            cart.items.splice(idx, 1);
            saveCarts();
            showCart(cart, lookup)
        })
    });
    cartDom.append(itemTable);
}

load();