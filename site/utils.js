function currentDate() {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getQueryParameter(name) {
    const url = window.location.href;
    const queryString = url.substring(url.indexOf('?') + 1);
    const parameters = queryString.split('&');

    for (var i = 0; i < parameters.length; i++) {
        const parameter = parameters[i].split('=');
        const paramName = decodeURIComponent(parameter[0]);
        if (paramName == name) return decodeURIComponent(parameter[1]);
    }
    return null;
}

function toNumber(value, defaultValue) {
    try {
        return Number.parseFloat(value);
    } catch (e) {
        return defaultValue;
    }
}

function dom(el, html) {
    let element = document.createElement(el);
    element.innerHTML = html;
    return element;
}

let carts = [];
loadCarts();

function loadCarts() {
    let val = localStorage.getItem("carts");
    carts = val ? JSON.parse(val) : [];
}

function saveCarts() {
    localStorage.setItem("carts", JSON.stringify(carts, null, 2));
}

function hasCart(name) {
    for (cart of carts) {
        if (cart.name = name) return true;
    }
    return false;
}

function addCart(name) {
    carts.push({
        name: name,
        items: []
    });
    saveCarts();
}

function removeCart(name) {
    carts = carts.filter(cart => cart.name != name);
    saveCarts();
}

function itemToStoreLink(item) {
    if (item.store == "spar")
        return `<a target="_blank" href="https://www.interspar.at/shop/lebensmittel/search/?q=${encodeURIComponent(item.name)}">${item.name}</a>`;
    if (item.store == "billa")
        return `<a target="_blank" href="https://shop.billa.at/search/results?category=&searchTerm=${encodeURIComponent(item.name)}">${item.name}</a>`;
    if (item.store == "hofer")
        return `<a target="_blank" href="https://www.roksh.at/hofer/angebot/suche/${encodeURIComponent(item.name)}">${item.name}</a>`;
    return item.name;
}

function itemToDOM(item) {
    let storeDom = dom("td", item.store);
    let nameDom = dom("td", itemToStoreLink(item));
    let unitDom = dom("td", item.unit ? item.unit : "");
    let priceDomText = item.price + (item.priceHistory.length > 1 ? (item.priceHistory[0].price > item.priceHistory[1].price ? " 📈" : " 📉") + " (" + (item.priceHistory.length - 1) + ")" : "");
    let priceDom = dom("td", priceDomText);
    if (item.priceHistory.length > 1) {
        priceDom.style["cursor"] = "pointer";
        priceDom.addEventListener("click", () => {
            if (priceDom.innerHTML == priceDomText) {
                priceDom.innerHTML = priceDomText;
                let pricesText = "";
                for (let i = 0; i < item.priceHistory.length; i++) {
                    const date = item.priceHistory[i].date;
                    const currPrice = item.priceHistory[i].price;
                    const lastPrice = item.priceHistory[i + 1] ? item.priceHistory[i + 1].price : currPrice;
                    const increase = Math.round((currPrice - lastPrice) / lastPrice * 100);
                    let priceColor = "black";
                    if (increase > 0) priceColor = "red";
                    if (increase < 0) priceColor = "green";
                    pricesText += `<br><span style="color: ${priceColor}">${date} ${currPrice} ${increase > 0 ? "+" + increase : increase}%</span>`;
                }
                priceDom.innerHTML += pricesText;
            } else {
                priceDom.innerHTML = priceDomText;
            }
        });
    }
    let row = dom("tr", "");
    switch(item.store) {
        case "billa":
            row.style["background"] = "rgb(255 255 225)";
            break;
        case "spar":
            row.style["background"] = "rgb(225 244 225)";
            break;
        case "hofer":
            row.style["background"] = "rgb(230 230 255)";
            break;
    }
    row.appendChild(storeDom);
    row.appendChild(nameDom);
    row.appendChild(unitDom);
    row.appendChild(priceDom);
    return row;
}

let componentId = 0;

function searchItems(items, query, exact) {
    if (query.length < 3) return [];

    const tokens = query.split(/\s+/).map(token => token.toLowerCase());

    const hits = [];
    for (item of items) {
        let allFound = true;
        for (token of tokens) {
            if (token.length == 0) continue;
            const index = item.search.indexOf(token);
            if (index < 0) {
                allFound = false;
                break;
            }
            if (exact) {
                if (index > 0 && (item.search.charAt(index - 1) != " " && item.search.charAt(index - 1) != "-")) {
                    allFound = false;
                    break;
                }
                if (index + token.length < item.search.length && item.search.charAt(index + token.length) != " ") {
                    allFound = false;
                    break;
                }
            }
        }
        if (allFound)
            hits.push(item);
    }
    return hits;
}

function newSearchComponent(parentElement, items, filter, headerModifier, itemDomModifier) {
    for (item of items) {
        item.search = item.name + " " + item.unit;
        item.search = item.search.toLowerCase();
    }

    let id = componentId++;
    parentElement.innerHTML = "";
    parentElement.innerHTML = `
        <input id="search-${id}" class="search" type="text" placeholder="Produkte suchen...">
        <div class="filters">
            <label><input id="billa-${id}" type="checkbox" checked="true"> Billa</label>
            <label><input id="spar-${id}" type="checkbox" checked="true"> Spar</label>
            <label><input id="hofer-${id}" type="checkbox" checked="true"> Hofer</label>
            <label><input id="eigenmarken-${id}" type="checkbox"> Nur CLEVER / S-BUDGET / MILFINA</label>
        </div>
        <div class="filters">
            <label>Min € <input id="minprice-${id}" type="number" min="0" value="0"></label>
            <label>Max € <input id="maxprice-${id}" type="number" min="0" value="100"></label>
            <label><input id="exact-${id}" type="checkbox"> Exaktes Wort</label>
        </div>
        <table id="result-${id}"></table>
    `;

    const searchInput = parentElement.querySelector(`#search-${id}`);
    const exact = parentElement.querySelector(`#exact-${id}`);
    const table = parentElement.querySelector(`#result-${id}`);
    const eigenmarken = parentElement.querySelector(`#eigenmarken-${id}`);
    const billa = parentElement.querySelector(`#billa-${id}`);
    const spar = parentElement.querySelector(`#spar-${id}`);
    const hofer = parentElement.querySelector(`#hofer-${id}`);
    const minPrice = parentElement.querySelector(`#minprice-${id}`);
    const maxPrice = parentElement.querySelector(`#maxprice-${id}`);

    let search = (query) => {
        let hits = searchItems(items, query, exact.checked);
        if (filter) hits = hits.filter(filter);
        table.innerHTML = "";
        if (hits.length == 0) return;
        hits.sort((a, b) => a.price - b.price);

        const header = dom("tr", `<th>Kette</th><th>Name</th><th>Menge</th><th>Preis</th>`);
        if (headerModifier) headerModifier(header);
        table.appendChild(header);

        hits.forEach(hit => {
            const name = hit.name.toLowerCase();
            if (hit.store == "billa" && !billa.checked) return;
            if (hit.store == "spar" && !spar.checked) return;
            if (hit.store == "hofer" && !hofer.checked) return;
            if (hit.price < toNumber(minPrice.value, 0)) return;
            if (hit.price > toNumber(maxPrice.value, 100)) return;
            if (eigenmarken.checked && !(name.indexOf("clever") == 0 || name.indexOf("s-budget") == 0 || name.indexOf("milfina") == 0))
                return;

            let itemDom = itemToDOM(hit);
            if (itemDomModifier) itemDom = itemDomModifier(hit, itemDom);
            table.appendChild(itemDom);
        });
    }

    searchInput.addEventListener("input", (event) => {
        if (searchInput.value.length == 0) {
            minPrice.value = 0;
            maxPrice.value = 100;
        }
        search(searchInput.value);
    });
    eigenmarken.addEventListener("change", () => search(searchInput.value));
    billa.addEventListener("change", () => search(searchInput.value));
    spar.addEventListener("change", () => search(searchInput.value));
    hofer.addEventListener("change", () => search(searchInput.value));
    exact.addEventListener("change", () => search(searchInput.value));
    minPrice.addEventListener("change", () => search(searchInput.value));
    maxPrice.addEventListener("change", () => search(searchInput.value));

    return () => search(searchInput.value);
}