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
    const hofer = document.querySelector("#hofer").checked;
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

    hits.forEach(hit => {
        const name = hit.name.toLowerCase();
        if (hit.store == "billa" && !billa) return;
        if (hit.store == "spar" && !spar) return;
        if (hit.store == "hofer" && !hofer) return;
        if (hit.price < minPrice) return;
        if (hit.price > maxPrice) return;
        if (eigenmarken && !(name.indexOf("clever") == 0 || name.indexOf("s-budget") == 0))
            return;

        table.appendChild(itemToDOM(hit));
    });
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
    document.querySelector("#hofer").addEventListener("change", () => search(searchInput.value));
    document.querySelector("#exact").addEventListener("change", () => search(searchInput.value));
    document.querySelector("#minprice").addEventListener("change", () => search(searchInput.value));
    document.querySelector("#maxprice").addEventListener("change", () => search(searchInput.value));
}

load();
