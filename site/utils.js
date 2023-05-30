const stores = {
    billa: {
        name: "Billa",
        budgetBrands: ["clever"],
        color: "rgb(255 255 225)",
    },
    spar: {
        name: "Spar",
        budgetBrands: ["s-budget"],
        color: "rgb(225 244 225)",
    },
    hofer: {
        name: "Hofer",
        budgetBrands: ["milfina"],
        color: "rgb(230 230 255)",
    },
    lidl: {
        name: "Lidl",
        budgetBrands: ["milbona"],
        color: "rgb(255 225 225)",
    },
    mpreis: {
        name: "MPREIS",
        budgetBrands: [],
        color: "rgb(255 230 230)",
    },
    dm: {
        name: "DM",
        budgetBrands: ["balea"],
        color: "rgb(255 240 230)",
    },
    unimarkt: {
        name: "Unimarkt",
        budgetBrands: ["jeden tag", "unipur"],
        color: "rgb(179, 217, 255)",
    },
};

const STORE_KEYS = Object.keys(stores);
const BUDGET_BRANDS = [].concat(
    ...Object.values(stores).map((store) => store.budgetBrands)
);

/**
 * @description Returns the current date in ISO format
 * @returns {string} ISO date string in format YYYY-MM-DD
 */
function currentDate() {
    return new Date().toISOString().slice(0, 10);
}

/**
 * @description Gets the query parameter from the URL
 * @param {string} name Name of the query parameter
 * @returns {string | null} Value of the query parameter or null if not found
 */
function getQueryParameter(name) {
    const url = new URL(window.location.href);
    const params = url.searchParams.getAll(name);
    return params.length > 1 ? params : params?.[0];
}

/**
 * @description Converts a string to a number
 * @param {string} value String to convert
 * @param {number} defaultValue Default value if conversion fails
 * @returns {number} Converted number or default value
 */
function toNumber(value, defaultValue) {
    try {
        return Number.parseFloat(value);
    } catch (e) {
        return defaultValue;
    }
}

/**
 * @description Create dom element from html string and add inner html via string template
 * @param {string} el Element type
 * @param {string} html Inner html
 * @returns {HTMLElement} DOM element
 */
function dom(el, html = null) {
    const element = document.createElement(el);
    if (html != null) element.innerHTML = html;
    return element;
}

function decompress(compressedItems) {
    const items = [];
    const stores = compressedItems.stores;
    const data = compressedItems.data;
    const numItems = compressedItems.n;
    let i = 0;
    while (items.length < numItems) {
        const store = stores[data[i++]];
        const id = data[i++];
        const name = data[i++];
        const numPrices = data[i++];
        const prices = [];
        for (let j = 0; j < numPrices; j++) {
            const date = data[i++];
            const price = data[i++];
            prices.push({
                date: date.substring(0, 4) + "-" + date.substring(4, 6) + "-" + date.substring(6, 8),
                price
            });
        }
        const unit = data[i++];
        const quantity = data[i++];
        const isWeighted = data[i++] == 1;
        const bio = data[i++] == 1;
        let url = data[i++];
        switch (store) {
            case "billa":
                url = "https://shop.billa.at" + url;
                break;
            case "dm":
                url = `https://www.dm.at/product-p${id}.html`;
                break;
            case "hofer":
                url = "https://www.roksh.at/hofer/produkte/" + url;
                break;
            case "lidl":
                url = "https://www.lidl.at" + url;
                break;
            case "mpreis":
                url = "https://www.mpreis.at/shop/p/" + id;
                break;
            case "spar":
                url = "https://www.interspar.at/shop/lebensmittel" + url;
                break;
            case "unimarkt":
                url = "https://shop.unimarkt.at" + url;
                break;
        }

        items.push({
            store,
            id,
            name,
            price: prices[0].price,
            priceHistory: prices,
            isWeighted,
            unit,
            quantity,
            bio,
            url
        });
    }
    return items;
}

async function loadItems() {
    now = performance.now();
    const compressedItemsPerStore = [];
    for (const store of STORE_KEYS) {
        compressedItemsPerStore.push(new Promise(async (resolve) => {
            const now = performance.now();
            try {
                const response = await fetch(`latest-canonical.${store}.compressed.json`);
                const json = await response.json();
                console.log(`Loading compressed items for ${store} took ${((performance.now() - now) / 1000)} secs`);
                resolve(decompress(json));
            } catch {
                console.log(`Error while loading compressed items for ${store}. It took ${((performance.now() - now) / 1000)} secs, continueing...`);
                resolve([]);
            }
        }));
    }
    const items = [].concat(...await Promise.all(compressedItemsPerStore));
    console.log("Loading compressed items in parallel took " + (performance.now() - now) / 1000 + " secs");

    now = performance.now();
    for (const item of items) {
        item.search = item.name + " " + item.quantity + " "  + item.unit;
        item.search = item.search.toLowerCase().replace(",", ".");

        item.numPrices = item.priceHistory.length;
        item.priceOldest =
            item.priceHistory[item.priceHistory.length - 1].price;
        item.dateOldest = item.priceHistory[item.priceHistory.length - 1].date;
        item.date = item.priceHistory[0].date;
        let highestPriceBefore = -1;
        for (let i = 1; i < item.priceHistory.length; i++) {
            const price = item.priceHistory[i];
            highestPriceBefore = Math.max(highestPriceBefore, price.price);
        }
        if (highestPriceBefore == -1) highestPriceBefore = item.price;
        item.highestBefore = highestPriceBefore;
    }
    console.log("Processing items took " + (performance.now() - now) / 1000 + " secs");
    return items;
}

/**
 * @description Class for managing the shopping carts, which are stored in local storage
 */
class ShoppingCarts {
    constructor() {
        this.carts = [];
        this.load();
    }

    /**
     * @description Load the shopping carts from local storage into carts array
     */
    load() {
        const val = localStorage.getItem("carts");
        this.carts = val ? JSON.parse(val) : [];
    }

    /**
     * @description Save the shopping carts to local storage, with key "carts"
     */
    save() {
        localStorage.setItem("carts", JSON.stringify(this.carts, null, 2));
    }

    /**
     * @description Check if the shopping carts contains a cart with the given name
     * @param {string} name Name of the shopping cart to check
     */
    has(name) {
        for (const cart of this.carts) {
            if (cart.name === name) return true;
        }
        return false;
    }

    /**
     * @description Add new shopping card to array and save new carts array to local storage
     * @param {string} name Name of the shopping cart to add
     */
    add(name) {
        this.carts.push({
            name: name,
            items: [],
        });
        this.save();
    }

    /**
     * @description Remove shopping cart from carts array based on name and save updated array to local storage
     * @param {string} name Name of the shopping cart to remove
     */
    remove(name) {
        this.carts = this.carts.filter((cart) => cart.name !== name);
        this.save();
    }
}

const shoppingCarts = new ShoppingCarts();
shoppingCarts.load();


function itemToStoreLink(item) {
    if (STORE_KEYS.includes(item.store)) {
        return `<a target="_blank" class="itemname itemname--${item.store}" rel="noopener noreferrer nofollow" href="${item.url}">${item.name}</a>`
    }
    return `<span class="itemname itemname--${item.store} itemname--nolink">${item.name}</span>`;
}

function itemToDOM(item) {
    let storeDom = dom("td", item.store);
    storeDom.setAttribute("data-label", "Kette");
    let nameDom = dom("td", `${itemToStoreLink(item)}`);
    nameDom.setAttribute("data-label", "Name");
    let quantity = item.quantity || ""
    let unit = item.unit || "";
    if(quantity >= 1000 && (unit == 'g' || unit == 'ml')) {
        quantity = parseFloat((0.001 * quantity).toFixed(2));
        unit = unit == 'ml' ? 'l' : 'kg';
    }
    let unitDom = dom("td", (item.isWeighted ? "⚖ " : "") + `${quantity} ${unit}`);
    unitDom.setAttribute("data-label", "Menge");
    let increase = "";
    if (item.priceHistory.length > 1) {
        let percentageChange = Math.round((item.priceHistory[0].price - item.priceHistory[1].price) / item.priceHistory[1].price * 100);
        increase = `<span class="${percentageChange > 0 ? "increase" : "decrease"}">${(percentageChange > 0 ? "+" + percentageChange : percentageChange)}%</span>`;
    }
    let priceDomText = `${Number(item.price).toFixed(2)} ${increase} ${item.priceHistory.length > 1 ? "(" + (item.priceHistory.length - 1) + ")" : ""}`;
    let pricesText = "";
    for (let i = 0; i < item.priceHistory.length; i++) {
        const date = item.priceHistory[i].date;
        const currPrice = item.priceHistory[i].price;
        const lastPrice = item.priceHistory[i + 1] ? item.priceHistory[i + 1].price : currPrice;
        const increase = Math.round((currPrice - lastPrice) / lastPrice * 100);
        let priceColor = "black";
        if (increase > 0) priceColor = "red";
        if (increase < 0) priceColor = "green";
        pricesText += `<span style="color: ${priceColor}">${date} ${currPrice} ${increase > 0 ? "+" + increase : increase}%</span>`;
        if (i != item.priceHistory.length - 1) pricesText += "<br>";
    }
    let priceDom = dom("td", `${priceDomText}<div class="priceinfo hide">${pricesText}</div>`);
    priceDom.setAttribute("data-label", "Preis");
    if (item.priceHistory.length > 1) {
        priceDom.style["cursor"] = "pointer";
        priceDom.addEventListener("click", () => {
            const pricesDom = priceDom.querySelector(".priceinfo");
            if (pricesDom.classList.contains("hide")) {
                pricesDom.classList.remove("hide");
            } else {
                pricesDom.classList.add("hide");
            }
        });
    }
    let row = dom("tr", "");
    row.style["background"] = stores[item.store]?.color;
    row.appendChild(storeDom);
    row.appendChild(nameDom);
    row.appendChild(unitDom);
    row.appendChild(priceDom);
    return row;
}

let componentId = 0;

function searchItems(items, query, checkedStores, budgetBrands, minPrice, maxPrice, exact, bio) {
    query = query.trim();
    if (query.length < 3) return [];

    if (query.charAt(0) == "!") {
        query = query.substring(1);
        return alasql("select * from ? where " + query, [items]);
    }

    const tokens = query.split(/\s+/).map(token => token.toLowerCase().replace(",", "."));

    let hits = [];
    for (const item of items) {
        let allFound = true;
        for (const token of tokens) {
            if (token.length === 0) continue;
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
        if (allFound) {
            const name = item.name.toLowerCase();
            if (checkedStores.length && !checkedStores.includes(item.store)) continue;
            if (item.price < minPrice) continue;
            if (item.price > maxPrice) continue;
            if (
                budgetBrands &&
                !BUDGET_BRANDS.some(budgetBrand => name.indexOf(budgetBrand) >= 0)
            ) continue;
            if (bio && !item.bio) continue;
            hits.push(item);
        }
    }
    return hits;
}

function newSearchComponent(parentElement, items, searched, filter, headerModifier, itemDomModifier) {
    let id = componentId++;
    parentElement.innerHTML = "";
    parentElement.innerHTML = `
        <input id="search-${id}" class="search" type="text" placeholder="Produkte suchen...">
        <a id="querylink-${id}" class="hide querylink">Abfrage teilen</a>
        <div class="filters filters--store">
            ${STORE_KEYS.map(store => `<label><input id="${store}-${id}" type="checkbox" checked="true">${stores[store].name}</label>`).join(" ")}
        </div>
        <div class="filters">
            <label><input id="budgetBrands-${id}" type="checkbox"> Nur ${BUDGET_BRANDS.map(budgetBrand => budgetBrand.toUpperCase()).join(", ")}</label>
            <label><input id="bio-${id}" type="checkbox"> Nur Bio</label>
        </div>
        <div class="filters">
            <label>Min € <input id="minprice-${id}" type="number" min="0" value="0"></label>
            <label>Max € <input id="maxprice-${id}" type="number" min="0" value="100"></label>
            <label><input id="exact-${id}" type="checkbox"> Exaktes Wort</label>
        </div>
        <div id="numresults-${id}"></div>
        <table id="result-${id}" class="searchresults"></table>
    `;

    const searchInput = parentElement.querySelector(`#search-${id}`);
    const queryLink = parentElement.querySelector(`#querylink-${id}`);
    const exact = parentElement.querySelector(`#exact-${id}`);
    const table = parentElement.querySelector(`#result-${id}`);
    const budgetBrands = parentElement.querySelector(`#budgetBrands-${id}`);
    const bio = parentElement.querySelector(`#bio-${id}`);
    const storeCheckboxes = STORE_KEYS.map(store => parentElement.querySelector(`#${store}-${id}`));
    const minPrice = parentElement.querySelector(`#minprice-${id}`);
    const maxPrice = parentElement.querySelector(`#maxprice-${id}`);
    const numResults = parentElement.querySelector(`#numresults-${id}`);

    const setQuery = () => {
        const query = searchInput.value.trim();
        if (query.length === 0) {
            queryLink.classList.add("hide");
            return;
        }
        queryLink.classList.remove("hide");
        const inputs = [...table.querySelectorAll("input:checked")];
        const checked = inputs.length ? inputs.map(item => item.dataset.id) : getQueryParameter("c");
        queryLink.setAttribute("href", `/?q=${encodeURIComponent(query)}${checked?.length ? `&c=${checked.join("&c=")}`: "" }`)
    };

    let search = (query) => {
        let hits = [];
        let now = performance.now();
        try {
            hits = searchItems(items, query,
                STORE_KEYS.filter((store, i) => storeCheckboxes[i].checked),
                budgetBrands.checked, toNumber(minPrice.value, 0), toNumber(maxPrice.value, 100), exact.checked, bio.checked
            );
        } catch (e) {
            console.log("Query: " + query + "\n" + e.message);
        }
        console.log("Search took " + (performance.now() - now) / 1000.0 + " secs");
        if (searched) hits = searched(hits);
        if (filter) hits = hits.filter(filter);
        table.innerHTML = "";
        if (hits.length == 0) {
            numResults.innerHTML = "Resultate: 0";
            return;
        }
        if (query.trim().charAt(0) != "!") hits.sort((a, b) => a.price - b.price);

        let header = dom("tr", `<th>Kette</th><th>Name</th><th>Menge</th><th>Preis</th>`);
        if (headerModifier) header = headerModifier(header);
        const thead = dom("thead", ``);
        thead.appendChild(header);
        table.appendChild(thead);

        now = performance.now();
        let num = 0;
        hits.every(hit => {
            let itemDom = itemToDOM(hit);
            if (itemDomModifier) itemDom = itemDomModifier(hit, itemDom, hits, setQuery);
            table.appendChild(itemDom);
            num++;
            return num < 500;
        });
        console.log("Building DOM took: " + (performance.now() - now) / 1000.0 + " secs");
        numResults.innerHTML = "Resultate: " + hits.length + (num < hits.length ? ", " + num + " angezeigt" : "");
    }

    searchInput.addEventListener("input", (event) => {
        const query = searchInput.value.trim();
        if (query == 0) {
            minPrice.value = 0;
            maxPrice.value = 100;
        }
        if (query?.charAt(0) == "!") {
            parentElement.querySelectorAll(".filters").forEach(f => f.style.display = "none");
        } else {
            parentElement.querySelectorAll(".filters").forEach(f => f.style.display = "block");
        }
        setQuery();
        search(searchInput.value);
    });
    budgetBrands.addEventListener("change", () => search(searchInput.value));
    bio.addEventListener("change", () => search(searchInput.value));
    storeCheckboxes.map(store => store.addEventListener("change", () => search(searchInput.value)));
    exact.addEventListener("change", () => search(searchInput.value));
    minPrice.addEventListener("change", () => search(searchInput.value));
    maxPrice.addEventListener("change", () => search(searchInput.value));

    return () => search(searchInput.value);
}

function showChart(canvasDom, items) {
    if (items.length == 0) {
        canvasDom.style.display = "none";
        return;
    } else {
        canvasDom.style.display = "block";
    }

    const allDates = items.flatMap(product => product.priceHistory.map(item => item.date));
    const uniqueDates = [...new Set(allDates)];
    uniqueDates.sort();

    const datasets = items.map(product => {
        let price = null;
        const prices = uniqueDates.map(date => {
            const priceObj = product.priceHistory.find(item => item.date === date);
            if (!price && priceObj) price = priceObj.price;
            return priceObj ? priceObj.price : null;
        });

        for (let i = 0; i < prices.length; i++) {
            if (prices[i] == null) {
                prices[i] = price;
            } else {
                price = prices[i];
            }
        }

        return {
            label: (product.store ? product.store + " " : "") + product.name,
            data: prices,
        };
    });

    const ctx = canvasDom.getContext('2d');
    if (canvasDom.lastChart) canvasDom.lastChart.destroy();
    canvasDom.lastChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: uniqueDates,
            datasets: datasets
        },
        options: {
            responsive: true,
            aspectRation: 16 / 9,
            scales: {
                y: {
                    title: {
                        display: true,
                        text: "EURO"
                    }
                }
            }
        }
    });
}

function calculateOverallPriceChanges(items) {
    if (items.length == 0) return { dates: [], changes: [] };
    const allDates = items.flatMap(product => product.priceHistory.map(item => item.date));
    const uniqueDates = [...new Set(allDates)];
    uniqueDates.sort();

    const allPrices = items.map(product => {
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
        return prices;
    });

    const priceChanges = [];
    for (let i = 0; i < uniqueDates.length; i++) {
        let price = 0;
        for (let j = 0; j < allPrices.length; j++) {
            price += allPrices[j][i];
        }
        priceChanges.push({ date: uniqueDates[i], price });
    }

    return priceChanges;
}
