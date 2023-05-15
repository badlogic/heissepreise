let items = null;

async function load() {
    let response = await fetch("api/index")
    items = await response.json();
    let units = {};
    for (item of items) {        
        item.search = item.name + " " + item.unit;
        item.search = item.search.toLowerCase();   
        units[item.unit] = item.unit; 
    }

    console.log(Object.keys(units));
    
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
            hits.push({ doc: item });
    }
    return hits;
}

function toNumber(value, defaultValue) {
    try {
        return Number.parseFloat(value);
    } catch(e) {
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
        return a.doc.price - b.doc.price;
    })

    table.appendChild(dom("tr", `
        <th>Kette</th><th>Name</th><th>Menge</th><th>Preis</th>
    `));

    for (hit of hits) {
        const name = hit.doc.name.toLowerCase();
        if (hit.doc.store == "billa" && !billa) continue;
        if (hit.doc.store == "spar" && !spar) continue;
        if (hit.doc.price < minPrice) continue;
        if (hit.doc.price > maxPrice) continue;
        if (eigenmarken && !(name.indexOf("clever") == 0 || name.indexOf("s-budget") == 0))
            continue;

        table.appendChild(dom("tr", `
        <td>${hit.doc.store}</td>
        <td>${hit.doc.name}</td>
        <td>${hit.doc.unit}</td>
        <td>${hit.doc.price}</td>
        `));
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