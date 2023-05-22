async function load() {
    const response = await fetch("api/index")
    items = await response.json();
    lookup = {};
    for (item of items) {
        lookup[item.id] = item;
    }

    let cart = null;
    let cartName = getQueryParameter("name");
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

    if (cart.name != "Momentum Eigenmarken Vergleich") showSearch(cart, items);
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

let lastChart = null;
function showChart(canvasDom, cart, lookup) {
    let data = [];
    cart.items.forEach((i, idx) => {
        const item = lookup[i.id];
        if (!item) return;
        if(i.chart) data.push(item);
    });
    if (data.length == 0) {
        canvasDom.style.display = "none";
        return;
    } else {
        canvasDom.style.display = "block";
    }

    const allDates = data.flatMap(product => product.priceHistory.map(item => item.date));
    const uniqueDates = [...new Set(allDates)];
    uniqueDates.sort();

    const datasets = data.map(product => {
        let price = null;
        const prices = uniqueDates.map(date => {
            const priceObj = product.priceHistory.find(item => item.date === date);
            if (!price && priceObj) price = priceObj.price;
            return priceObj ? priceObj.price : null;
        });

        for (let i = 0; i < prices.length; i++) {
            if (!prices[i]) {
                prices[i] = price;
            } else {
                price = prices[i];
            }
        }

        return {
            label: product.name,
            data: prices,
        };
    });

    const ctx = canvasDom.getContext('2d');
    if (lastChart) lastChart.destroy();
    lastChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: uniqueDates,
            datasets: datasets
        },
        options: {
            responsive: true,
        }
    });
}

function showCart(cart, lookup) {
    const cartDom = document.querySelector("#cart");
    cartDom.innerHTML = "";
    cartDom.append(dom("h2", "Warenkorb '" + cart.name + "'"));
    const canvasDom = dom("canvas", "");
    cartDom.append(canvasDom);
    showChart(canvasDom, cart, lookup);

    const itemTable = dom("table", "");
    const header = dom("tr", `<th>Kette</th><th>Name</th><th>Menge</th><th>Preis</th><th></th>`);
    itemTable.append(header);

    cart.items.forEach((i, idx) => {
        const item = lookup[i.id];
        if (!item) return;
        const itemDom = itemToDOM(item)

        const checkBox = dom("input", "");
        checkBox.setAttribute("type", "checkbox");
        if (i.chart) checkBox.setAttribute("checked", true);
        itemDom.append(checkBox);
        checkBox.addEventListener("change", () => {
            i.chart = checkBox.checked;
            saveCarts();
            showChart(canvasDom, cart, lookup);
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