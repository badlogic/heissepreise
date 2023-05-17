let items = null;

async function load() {
    let response = await fetch("api/index")
    items = await response.json();
    for (item of items) {
        item.search = item.name + " " + item.unit;
        item.search = item.search.toLowerCase();
    }

    setupUI();
}

function dom(el, html) {
    let element = document.createElement(el);
    element.innerHTML = html;
    return element;
}

function searchItems(query, exact) {
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

function toNumber(value, defaultValue) {
    try {
        return Number.parseFloat(value);
    } catch (e) {
        return defaultValue;
    }
}

function search(query) {
    const exact = document.querySelector("#exact").checked;
    const hits = searchItems(query, exact);
    const table = document.querySelector("#result");
    const eigenmarken = document.querySelector("#eigenmarken").checked;
    const billa = document.querySelector("#billa").checked;
    const spar = document.querySelector("#spar").checked;
    const minPrice = toNumber(document.querySelector("#minprice").value, 0);
    const maxPrice = toNumber(document.querySelector("#maxprice").value, 100);
    table.innerHTML = "";

    if (hits.length == 0) return;

    hits.sort((a, b) => {
        return a.price - b.price;
    })

    table.appendChild(dom("tr", `
        <th>Kette</th><th>Name</th><th>Menge</th><th>Preis</th>
    `));

    for (hit of hits) {
        const name = hit.name.toLowerCase();
        if (hit.store == "billa" && !billa) continue;
        if (hit.store == "spar" && !spar) continue;
        if (hit.price < minPrice) continue;
        if (hit.price > maxPrice) continue;
        if (eigenmarken && !(name.indexOf("clever") == 0 || name.indexOf("s-budget") == 0))
            continue;

        let storeDom = dom("td", hit.store);
        let nameDom = dom("td", hit.store == "spar" ?
            `<a target="_blank" href="https://www.interspar.at/shop/lebensmittel/search/?q=${encodeURIComponent(hit.name)}">${hit.name}</a>` :
            `<a target="_blank" href="https://shop.billa.at/search/results?category=&searchTerm=${encodeURIComponent(hit.name)}">${hit.name}</a>`);
        let unitDom = dom("td", hit.unit ? hit.unit : "");
        let priceDom = dom("td", hit.price + (hit.priceHistory.length > 1 ? (hit.priceHistory[0].price > hit.priceHistory[1].price ? " 📈" : " 📉") : ""));
        if (hit.priceHistory.length > 1) {
            priceDom.style["cursor"] = "pointer";
        }
        let row = dom("tr", "");
        row.appendChild(storeDom);
        row.appendChild(nameDom);
        row.appendChild(unitDom);
        row.appendChild(priceDom);
        table.appendChild(row);
    }
}

function setupUI() {
    let searchInput = document.querySelector("#search");
    searchInput.addEventListener("input", (event) => {
        if (searchInput.value.length == 0) {
            document.querySelector("#minprice").value = 0;
            document.querySelector("#maxprice").value = 100;
        }
        search(searchInput.value);
    });
    document.querySelector("#eigenmarken").addEventListener("change", () => search(searchInput.value));
    document.querySelector("#billa").addEventListener("change", () => search(searchInput.value));
    document.querySelector("#spar").addEventListener("change", () => search(searchInput.value));
    document.querySelector("#exact").addEventListener("change", () => search(searchInput.value));
    document.querySelector("#minprice").addEventListener("change", () => search(searchInput.value));
    document.querySelector("#maxprice").addEventListener("change", () => search(searchInput.value));
}

load();