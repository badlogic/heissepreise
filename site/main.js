let index = null;
let items = null;

async function load() {
    let response = await fetch("api/index")
    items = await response.json();

    index = elasticlunr(function () {
        // this.use(elasticlunr.de);
        this.addField("search");        
        this.setRef("id");        
    });    

    let i = 0;
    for (item of items) {
        item.id = i++;
        item.search = item.name + " " + item.unit;
        item.search = item.search.toLowerCase();
        index.addDoc(item);
    }

    console.log(items.length);
    setupUI();
}

function dom(el, html) {
    let element = document.createElement(el);
    element.innerHTML = html;
    return element;
}

function searchItems(query) {
    if (query.length < 3) return [];

    const tokens = query.split(/\s+/).map(token => token.toLowerCase());

    const hits = [];
    for (item of items) {
        let allFound = true;
        for (token of tokens) {
            if (item.search.indexOf(token) < 0) {
                allFound = false;
                break;
            }
        }
        if (allFound) hits.push({ doc: item });
    }
    return hits;
}

function search(query) {
    // const hits = index.search(query);
    const hits = searchItems(query);
    const table = document.querySelector("#result");
    const eigenmarken = document.querySelector("#eigenmarken").checked;
    const billa = document.querySelector("#billa").checked;
    const spar = document.querySelector("#spar").checked;
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
    const searchInput = document.querySelector("#search");
    searchInput.addEventListener("input", (event) => {
        search(searchInput.value);
    });
    document.querySelector("#eigenmarken").addEventListener("change", () => search(searchInput.value));
    document.querySelector("#billa").addEventListener("change", () => search(searchInput.value));
    document.querySelector("#spar").addEventListener("change", () => search(searchInput.value));
}

load();