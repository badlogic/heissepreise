const stores = {
    billa: {
        name: "Billa",
        budgetBrands: ["clever"],
        color: "yellow",
        getUrl: (item) => `https://shop.billa.at${item.url}`,
    },
    spar: {
        name: "Spar",
        budgetBrands: ["s-budget"],
        color: "green",
        getUrl: (item) => `https://www.interspar.at/shop/lebensmittel${item.url}`,
    },
    hofer: {
        name: "Hofer",
        budgetBrands: ["milfina"],
        color: "purple",
        getUrl: (item) => `https://www.roksh.at/hofer/produkte/${item.url}`,
    },
    lidl: {
        name: "Lidl",
        budgetBrands: ["milbona"],
        color: "pink",
        getUrl: (item) => `https://www.lidl.at${item.url}`,
    },
    mpreis: {
        name: "MPREIS",
        budgetBrands: [],
        color: "rose",
        getUrl: (item) => `https://www.mpreis.at/shop/p/${item.id}`,
    },
    dm: {
        name: "DM",
        budgetBrands: ["balea"],
        color: "orange",
        getUrl: (item) => `https://www.dm.at/product-p${item.id}.html`,
    },
    unimarkt: {
        name: "Unimarkt",
        budgetBrands: ["jeden tag", "unipur"],
        color: "blue",
        getUrl: (item) => `https://shop.unimarkt.at/${item.url}`,
    },
    penny: {
        name: "Penny",
        budgetBrands: ["bravo", "echt bio!", "san fabio", "federike", "blik", "berida", "today", "ich bin österreich"],
        color: "purple",
        getUrl: (item) => `https://www.penny.at/produkte/${item.url}`,
    },
    dmDe: {
        name: "DM DE",
        budgetBrands: ["balea"],
        color: "teal",
        getUrl: (item) => `https://www.dm.de/product-p${item.id}.html`,
    },
    reweDe: {
        name: "REWE DE",
        budgetBrands: ["ja!"],
        color: "stone",
        getUrl: (item) => `https://shop.rewe.de/p/${item.name.toLowerCase().replace(/ /g, "-")}/${item.id}`,
    },
};

const STORE_KEYS = Object.keys(stores);
const BUDGET_BRANDS = [...new Set([].concat(...Object.values(stores).map((store) => store.budgetBrands)))];

/**
 * @description Returns the current date in ISO format
 * @returns {string} ISO date string in format YYYY-MM-DD
 */
function currentDate() {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, "0");
    const day = String(currentDate.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
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
    const stores_ = compressedItems.stores;
    const data = compressedItems.data;
    const numItems = compressedItems.n;
    let i = 0;
    while (items.length < numItems) {
        const store = stores_[data[i++]];
        const id = data[i++];
        const name = data[i++];
        const numPrices = data[i++];
        const prices = [];
        for (let j = 0; j < numPrices; j++) {
            const date = data[i++];
            const price = data[i++];
            prices.push({
                date: date.substring(0, 4) + "-" + date.substring(4, 6) + "-" + date.substring(6, 8),
                price,
            });
        }
        const unit = data[i++];
        const quantity = data[i++];
        const isWeighted = data[i++] == 1;
        const bio = data[i++] == 1;
        const url = stores[store].getUrl({ id, name, url: data[i++] });

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
            url,
        });
    }
    return items;
}

async function loadItems() {
    now = performance.now();
    const compressedItemsPerStore = [];
    for (const store of STORE_KEYS) {
        compressedItemsPerStore.push(
            new Promise(async (resolve) => {
                const now = performance.now();
                try {
                    const response = await fetch(`data/latest-canonical.${store}.compressed.json`);
                    const json = await response.json();
                    console.log(`Loading compressed items for ${store} took ${(performance.now() - now) / 1000} secs`);
                    resolve(decompress(json));
                } catch {
                    console.log(
                        `Error while loading compressed items for ${store}. It took ${(performance.now() - now) / 1000} secs, continueing...`
                    );
                    resolve([]);
                }
            })
        );
    }
    const items = [].concat(...(await Promise.all(compressedItemsPerStore)));
    console.log("Loading compressed items in parallel took " + (performance.now() - now) / 1000 + " secs");

    now = performance.now();
    alasql.fn.hasPriceChange = (priceHistory, date, endDate) => {
        if (!endDate) return priceHistory.some((price) => price.date == date);
        else return priceHistory.some((price) => price.date >= date && price.date <= endDate);
    };
    for (const item of items) {
        item.search = item.name + " " + item.quantity + " " + item.unit;
        item.search = item.search.toLowerCase().replace(",", ".");

        item.numPrices = item.priceHistory.length;
        item.priceOldest = item.priceHistory[item.priceHistory.length - 1].price;
        item.dateOldest = item.priceHistory[item.priceHistory.length - 1].date;
        item.date = item.priceHistory[0].date;
        let highestPriceBefore = -1;
        let lowestPriceBefore = 100000;
        for (let i = 1; i < item.priceHistory.length; i++) {
            const price = item.priceHistory[i];
            if (i < 10) {
                item["price" + i] = price.price;
                item["date" + i] = price.date;
            }
            highestPriceBefore = Math.max(highestPriceBefore, price.price);
            lowestPriceBefore = Math.min(lowestPriceBefore, price.price);
        }
        if (highestPriceBefore == -1) highestPriceBefore = item.price;
        if (lowestPriceBefore == 100000) lowestPriceBefore = item.price;
        item.highestBefore = highestPriceBefore;
        item.lowestBefore = lowestPriceBefore;
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

function itemToStoreLink(item) {
    if (STORE_KEYS.includes(item.store)) {
        return `<a target="_blank" class="hover:underline" rel="noopener noreferrer nofollow" href="${item.url}">${item.name}</a>`;
    }
    return `<span>${item.name}</span>`;
}

function itemToDOM(item) {
    let quantity = item.quantity || "";
    let unit = item.unit || "";
    if (quantity >= 1000 && (unit == "g" || unit == "ml")) {
        quantity = parseFloat((0.001 * quantity).toFixed(2));
        unit = unit == "ml" ? "l" : "kg";
    }
    let percentageChange = "";
    if (item.priceHistory.length > 1) {
        percentageChange = Math.round(((item.priceHistory[0].price - item.priceHistory[1].price) / item.priceHistory[1].price) * 100);
    }

    let priceHistory = "";
    let priceBase = 150 / item.priceHistory[0].price;
    for (let i = 0; i < item.priceHistory.length; i++) {
        const date = item.priceHistory[i].date;
        const currPrice = item.priceHistory[i].price;
        const lastPrice = item.priceHistory[i + 1] ? item.priceHistory[i + 1].price : currPrice;
        const increase = Math.round(((currPrice - lastPrice) / lastPrice) * 100);

        priceHistory += `<tr>
            <td class="font-medium">${date}</td>
            <td>
                <div style="width: ${priceBase * currPrice}px"
                    class="text-xs md:text-sm text-white px-1 ${increase > 0 ? "bg-red-500" : "bg-green-500"}">
                    € ${currPrice}
                </div>
            </td>
            ${
                increase > 0
                    ? `<td class="text-right text-red-500"> + ${increase}%</td>`
                    : increase < 0
                    ? `<td class="text-right text-green-500"> ${increase}%</td>`
                    : `<td class="text-right"> ${increase}%</td>`
            }
            </tr>`;
    }

    const row = dom(
        "tr",
        `
        <td class="md:text-center p-1 order-2 uppercase font-medium align-top" data-label="Kette">${item.store}</td>
        <td class="font-bold md:font-normal text-gray-800 md:bg-white p-1 order-1 col-span-3 hover:bg-gray-100" data-label="Name">
            <div class="flex items-center">${itemToStoreLink(item)} <small class="ml-auto">${
            (item.isWeighted ? "⚖ " : "") + `${quantity} ${unit}`
        }</small></div>
            <table class="priceinfo hidden text-xs md:text-sm mt-2" aria-hidden="true">
                ${priceHistory}
            </table>
        </td>
        <td class="p-1 order-3 text-left whitespace-nowrap align-top z-20" data-label="Preis">
            <span>€ ${Number(item.price).toFixed(2)}</span>
            <span class="${percentageChange > 0 ? "text-red-500" : percentageChange < 0 ? "text-green-500" : "hidden"}">
                ${percentageChange > 0 ? "+" + percentageChange : percentageChange}%
            </span>
            ${item.priceHistory.length > 1 ? "(" + (item.priceHistory.length - 1) + ")" : ""}
            <span class="text-sm cursor-pointer chevron">▼</span>
        </td>
    `
    );

    row.classList.add(
        "bg-" + stores[item.store]?.color + "-200/50",
        "grid",
        "grid-cols-3",
        "col-span-3",
        "md:table-row",
        "border-b",
        "border-" + stores[item.store]?.color + "-200",
        "rounded-xl",
        "mb-3",
        "border",
        "overflow-hidden",
        "group",
        percentageChange > 0 ? "increased" : percentageChange < 0 ? "decreased" : "neutral"
    );

    row.querySelectorAll('td[data-label="Preis"]').forEach((priceDom) => {
        priceDom.style["cursor"] = "pointer";
        priceDom.addEventListener("click", (event) => {
            let target = event.target;
            if (!target.classList.contains("chevron")) {
                target = target.querySelector("chevron");
            }

            const pricesDom = priceDom.parentNode.querySelector(".priceinfo");
            if (pricesDom.classList.contains("hidden")) {
                pricesDom.classList.remove("hidden");
                pricesDom.ariaHidden = false;
                if (target) target.innerHTML = "▲";
            } else {
                pricesDom.classList.add("hidden");
                pricesDom.ariaHidden = true;
                if (target) target.innerHTML = "▼";
            }
        });
    });

    return row;
}

let componentId = 0;

const UNITS = {
    "stk.": { unit: "stk", factor: 1 },
    stück: { unit: "stk", factor: 1 },
    blatt: { unit: "stk", factor: 1 },
    paar: { unit: "stk", factor: 1 },
    stk: { unit: "stk", factor: 1 },
    st: { unit: "stk", factor: 1 },
    teebeutel: { unit: "stk", factor: 1 },
    tücher: { unit: "stk", factor: 1 },
    rollen: { unit: "stk", factor: 1 },
    tabs: { unit: "stk", factor: 1 },
    stück: { unit: "stk", factor: 1 },
    mm: { unit: "cm", factor: 0.1 },
    cm: { unit: "cm", factor: 1 },
    zentimeter: { unit: "cm", factor: 1 },
    m: { unit: "cm", factor: 100 },
    meter: { unit: "cm", factor: 100 },
    g: { unit: "g", factor: 1 },
    gramm: { unit: "g", factor: 1 },
    dag: { unit: "g", factor: 10 },
    kg: { unit: "g", factor: 1000 },
    kilogramm: { unit: "g", factor: 1000 },
    ml: { unit: "ml", factor: 1 },
    milliliter: { unit: "ml", factor: 1 },
    dl: { unit: "ml", factor: 10 },
    cl: { unit: "ml", factor: 100 },
    l: { unit: "ml", factor: 1000 },
    liter: { unit: "ml", factor: 1000 },
    wg: { unit: "wg", factor: 1 },
};

function searchItems(items, query, checkedStores, budgetBrands, minPrice, maxPrice, exact, bio) {
    query = query.trim();
    if (query.length < 3 || checkedStores.length == 0) return [];

    if (query.charAt(0) == "!") {
        query = query.substring(1);
        return alasql("select * from ? where " + query, [items]);
    }

    let tokens = query.split(/\s+/).map((token) => token.toLowerCase().replace(",", "."));

    // Find quantity/unit query
    let newTokens = [];
    let unitQueries = [];
    const operators = ["<", "<=", ">", ">="];
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        let unit = UNITS[token];
        if (unit && i > 0 && /^\d+(\.\d+)?$/.test(tokens[i - 1])) {
            newTokens.pop();
            let operator = "=";
            if (i > 1 && operators.includes(tokens[i - 2])) {
                newTokens.pop();
                operator = tokens[i - 2];
            }

            unitQueries.push({
                operator,
                quantity: Number.parseFloat(tokens[i - 1]) * unit.factor,
                unit: unit.unit,
            });
        } else {
            newTokens.push(token);
        }
    }
    console.log(JSON.stringify(unitQueries, null, 2));
    console.log(newTokens);
    tokens = newTokens;

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
                if (index > 0 && item.search.charAt(index - 1) != " " && item.search.charAt(index - 1) != "-") {
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
            if (budgetBrands && !BUDGET_BRANDS.some((budgetBrand) => name.indexOf(budgetBrand) >= 0)) continue;
            if (bio && !item.bio) continue;
            let allUnitsMatched = true;
            for (const query of unitQueries) {
                if (query.unit != item.unit) {
                    allUnitsMatched = false;
                    break;
                }

                if (query.operator == "=" && !(item.quantity == query.quantity)) {
                    allUnitsMatched = false;
                    break;
                }

                if (query.operator == "<" && !(item.quantity < query.quantity)) {
                    allUnitsMatched = false;
                    break;
                }

                if (query.operator == "<=" && !(item.quantity <= query.quantity)) {
                    allUnitsMatched = false;
                    break;
                }

                if (query.operator == ">" && !(item.quantity > query.quantity)) {
                    allUnitsMatched = false;
                    break;
                }

                if (query.operator == ">=" && !(item.quantity >= query.quantity)) {
                    allUnitsMatched = false;
                    break;
                }
            }
            if (allUnitsMatched) hits.push(item);
        }
    }
    return hits;
}

function customCheckbox(id, label, checked, bgColor, color) {
    let isChecked = typeof checked === "boolean" ? (checked ? "checked" : "") : checked;
    return `
        <label class="cursor-pointer inline-flex items-center gap-x-1 rounded-full bg-${bgColor}-200 border border-${bgColor}-400 hover:bg-${bgColor}-400 px-2 py-1 text-xs font-medium text-${color}-600 transition-all duration-200 hover:scale-105">
            <input id="${id}" type="checkbox" ${isChecked} class="hidden peer">
            <svg class="h-2 w-2 stroke-${color}-600 fill-${color}-100 peer-checked:fill-${color}-600" viewBox="0 0 6 6">
                <circle cx="3" cy="3" r="2" />
            </svg>
           ${label}
        </label>
    `;
}

function newSearchComponent(parentElement, items, searched, filter, headerModifier, itemDomModifier, chartCallback) {
    let id = componentId++;
    parentElement.innerHTML = "";
    parentElement.innerHTML = `
        <div class="bg-stone-200 rounded-xl p-4 max-w-4xl mx-auto md:mb-12 md:mt-6">
            <input id="search-${id}" class="search rounded-lg px-2 py-1 w-full mb-4" type="text" placeholder="Produkte suchen...">
            <div class="flex gap-2 flex-wrap justify-center py-4 px-8">
                ${customCheckbox(`all-${id}`, " <strong>Alle</strong>", true, "gray", "gray")}
                ${STORE_KEYS.map((store) =>
                    customCheckbox(
                        `${store}-${id}`,
                        stores[store].name,
                        stores[store].name.toLowerCase().endsWith("de") ? false : true,
                        stores[store].color,
                        "gray"
                    )
                ).join(" ")}
            </div>
            <div class="flex items-center justify-center flex-wrap gap-2">

                ${customCheckbox(
                    `budgetBrands-${id}`,
                    `Nur <abbr title="${BUDGET_BRANDS.map((budgetBrand) => budgetBrand.toUpperCase()).join(", ")}">
                        Diskont-Eigenmarken
                    </abbr>`,
                    false,
                    "gray",
                    "gray"
                )}
                ${customCheckbox(`bio-${id}`, `Nur Bio`, false, "gray", "gray")}
                ${customCheckbox(`exact-${id}`, `Exaktes Wort`, false, "gray", "gray")}

                <label class="cursor-pointer inline-flex items-center gap-x-1 rounded-full bg-white border border-gray-400 px-2 py-1 text-xs font-medium text-gray-600">
                    Preis € <input class="w-12" id="minprice-${id}" type="number" min="0" value="0">
                    -
                    <input class="w-12" id="maxprice-${id}" type="number" min="0" value="100">
                </label>
            </div>

        </div>
        <div id="result-container-${id}" class="flex flex-col md:flex-row gap-4 hidden px-4 py-2 my-4 justify-between items-center text-sm border rounded-xl md:mt-8 md:rounded-b-none md:mb-0 bg-gray-100 ">
            <div id="links-${id}" class="results hidden">
                <div class="flex flex-col md:flex-row gap-2 items-center">
                    <span id="numresults-${id}"></span>
                    <span>
                        <a id="querylink-${id}" class="querylink text-primary font-medium hover:underline">Teilen</a>
                        <a id="json-${id}" class="text-primary font-medium hover:underline" href="">JSON</a>
                    </span>
                    <div class="hidden">
                        ${customCheckbox(`chart-${id}`, `Diagramm`, "false", "gray", "gray")}
                    </div>
                </div>
            </div>
            <label>
                Sortieren
                <select id="sort-${id}">
                    <option value="priceasc">Preis aufsteigend</option>
                    <option value="pricedesc">Preis absteigend</option>
                    <option value="quantityasc">Menge aufsteigend</option>
                    <option value="quantitydesc">Menge absteigend</option>
                    <option value="namesim">Namensähnlichkeit</option>
                </select>
            </label>
        </div>
        <table id="result-${id}" class="searchresults rounded-b-xl overflow-hidden w-full text-left"></table>
    `;

    const searchInput = parentElement.querySelector(`#search-${id}`);
    const links = parentElement.querySelector(`#links-${id}`);
    const queryLink = parentElement.querySelector(`#querylink-${id}`);
    const jsonLink = parentElement.querySelector(`#json-${id}`);
    const chart = parentElement.querySelector(`#chart-${id}`);
    const exact = parentElement.querySelector(`#exact-${id}`);
    const resultContainer = parentElement.querySelector(`#result-container-${id}`);
    const table = parentElement.querySelector(`#result-${id}`);
    const budgetBrands = parentElement.querySelector(`#budgetBrands-${id}`);
    const bio = parentElement.querySelector(`#bio-${id}`);
    const allCheckbox = parentElement.querySelector(`#all-${id}`);
    const storeCheckboxes = STORE_KEYS.map((store) => parentElement.querySelector(`#${store}-${id}`));
    const minPrice = parentElement.querySelector(`#minprice-${id}`);
    const maxPrice = parentElement.querySelector(`#maxprice-${id}`);
    const numResults = parentElement.querySelector(`#numresults-${id}`);
    const sort = parentElement.querySelector(`#sort-${id}`);

    if (chartCallback) {
        chart.parentElement.parentElement.classList.remove("hidden");
        chart.addEventListener("change", () => chartCallback(chart.checked));
    }

    let lastHits = [];
    jsonLink.addEventListener("click", (event) => {
        event.preventDefault();
        downloadFile("items.json", JSON.stringify(lastHits, null, 2));
    });

    const setQuery = () => {
        const query = searchInput.value.trim();
        if (query.length === 0) {
            links.classList.add("hidden");
            return;
        }
        links.classList.remove("hidden");
        const inputs = [...table.querySelectorAll("input:checked")];
        let checked = inputs.length ? inputs.map((item) => item.dataset.id) : getQueryParameter("c");
        if (typeof checked === "string") checked = [checked];
        queryLink.setAttribute("href", `/?q=${encodeURIComponent(query)}${checked?.length ? `&c=${checked.join("&c=")}` : ""}`);
    };

    let search = (query) => {
        let hits = [];
        let now = performance.now();
        try {
            hits = searchItems(
                items,
                query,
                STORE_KEYS.filter((store, i) => storeCheckboxes[i].checked),
                budgetBrands.checked,
                toNumber(minPrice.value, 0),
                toNumber(maxPrice.value, 100),
                exact.checked,
                bio.checked,
                sort.value
            );
        } catch (e) {
            console.log("Query: " + query + "\n" + e.message);
        }
        console.log("Search took " + (performance.now() - now) / 1000.0 + " secs");
        if (searched) hits = searched(hits);
        if (filter) hits = hits.filter(filter);
        table.innerHTML = "";
        if (hits.length == 0) {
            numResults.innerHTML = "<strong>Resultate:</strong> 0";
            resultContainer.classList.add("hidden");
            return;
        }
        resultContainer.classList.remove("hidden");
        if (query.trim().charAt(0) != "!" || query.trim().toLowerCase().indexOf("order by") == -1) {
            if (sort.value == "priceasc") {
                hits.sort((a, b) => a.price - b.price);
            } else if (sort.value == "pricedesc") {
                hits.sort((a, b) => b.price - a.price);
            } else if (sort.value == "quantityasc") {
                hits.sort((a, b) => {
                    if (a.unit != b.unit) return a.unit.localeCompare(b.unit);
                    return a.quantity - b.quantity;
                });
            } else if (sort.value == "quantitydesc") {
                hits.sort((a, b) => {
                    if (a.unit != b.unit) return a.unit.localeCompare(b.unit);
                    return b.quantity - a.quantity;
                });
            } else {
                if (hits.length <= isMobile() ? 200 : 1000) {
                    vectorizeItems(hits);
                    hits = similaritySortItems(hits);
                }
            }
        }

        let header = dom(
            "tr",
            `
            <th class="text-center">Kette</th>
            <th>Name</th>
            <th>Preis <span class="expander">+</span></th>
            `
        );
        header.classList.add("bg-primary", "text-white", "hidden", "md:table-row", "uppercase", "text-sm");

        if (headerModifier) header = headerModifier(header);
        const showHideAll = header.querySelectorAll("th:nth-child(3)")[0];
        showHideAll.style["cursor"] = "pointer";
        showHideAll.showAll = true;
        showHideAll.addEventListener("click", () => {
            showHideAll.querySelector(".expander").innerText = showHideAll.querySelector(".expander").innerText == "+" ? "-" : "+";
            table.querySelectorAll(".priceinfo").forEach((el) => (showHideAll.showAll ? el.classList.remove("hidden") : el.classList.add("hidden")));
            showHideAll.showAll = !showHideAll.showAll;
        });
        const thead = dom("thead", ``);
        thead.appendChild(header);
        table.appendChild(thead);

        now = performance.now();
        let num = 0;
        let limit = isMobile() ? 500 : 2000;
        hits.every((hit) => {
            let itemDom = itemToDOM(hit);
            if (itemDomModifier) itemDom = itemDomModifier(hit, itemDom, hits, setQuery);
            table.appendChild(itemDom);
            num++;
            return num < limit;
        });
        console.log("Building DOM took: " + (performance.now() - now) / 1000.0 + " secs");
        numResults.innerHTML = "<strong>Resultate:</strong> " + hits.length + (num < hits.length ? ", " + num + " angezeigt" : "");
        lastHits = hits;
    };

    let timeoutId;
    searchInput.addEventListener("input", (event) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            const query = searchInput.value.trim();
            if (query == 0) {
                minPrice.value = 0;
                maxPrice.value = 100;
            }
            if (query?.charAt(0) == "!") {
                parentElement.querySelectorAll(".filters").forEach((f) => f.classList.add("hidden"));
            } else {
                parentElement.querySelectorAll(".filters").forEach((f) => f.classList.remove("hidden"));
            }
            setQuery();
            search(searchInput.value);
        }, 50);
    });
    budgetBrands.addEventListener("change", () => search(searchInput.value));
    bio.addEventListener("change", () => search(searchInput.value));
    allCheckbox.addEventListener("change", () => {
        storeCheckboxes.forEach((store) => (store.checked = allCheckbox.checked));
        search(searchInput.value);
    });
    storeCheckboxes.map((store) => store.addEventListener("change", () => search(searchInput.value)));
    sort.addEventListener("change", () => search(searchInput.value));
    minPrice.addEventListener("change", () => search(searchInput.value));
    maxPrice.addEventListener("change", () => search(searchInput.value));
    exact.addEventListener("change", () => search(searchInput.value));

    return {
        searchInput,
        links,
        queryLink,
        jsonLink,
        chart,
        exact,
        table,
        budgetBrands,
        bio,
        allCheckbox,
        storeCheckboxes,
        minPrice,
        maxPrice,
        numResults,
        sort,
    };
}

function showChart(canvasDom, items, chartType) {
    if (items.length === 0) {
        canvasDom.classList.add("hidden");
        return;
    } else {
        canvasDom.classList.remove("hidden");
    }

    const allDates = items.flatMap((product) => product.priceHistory.map((item) => item.date));
    const uniqueDates = [...new Set(allDates)];
    uniqueDates.sort();

    const datasets = items.map((product) => {
        let price = null;
        const prices = uniqueDates.map((date) => {
            const priceObj = product.priceHistory.find((item) => item.date === date);
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

    const ctx = canvasDom.getContext("2d");
    let scrollTop = -1;
    if (canvasDom.lastChart) {
        scrollTop = document.documentElement.scrollTop;
        canvasDom.lastChart.destroy();
    }
    canvasDom.lastChart = new Chart(ctx, {
        type: chartType ? chartType : "line",
        data: {
            labels: uniqueDates,
            datasets: datasets,
        },
        options: {
            responsive: true,
            aspectRation: 16 / 9,
            scales: {
                y: {
                    title: {
                        display: true,
                        text: "EURO",
                    },
                },
            },
        },
    });
    if (scrollTop != -1) document.documentElement.scrollTop = scrollTop;
}

function getOldestDate(items) {
    let oldestDate = "9999-01-01";
    for (item of items) {
        if (oldestDate > item.dateOldest) oldestDate = item.dateOldest;
    }
    return oldestDate;
}

function showCharts(canvasDom, items, sum, sumStores, todayOnly, startDate, endDate) {
    let itemsToShow = [];

    if (sum && items.length > 0) {
        itemsToShow.push({
            name: "Preissumme Warenkorb",
            priceHistory: calculateOverallPriceChanges(items, todayOnly, startDate, endDate),
        });
    }

    if (sumStores && items.length > 0) {
        STORE_KEYS.forEach((store) => {
            const storeItems = items.filter((item) => item.store === store);
            if (storeItems.length > 0) {
                itemsToShow.push({
                    name: "Preissumme " + store,
                    priceHistory: calculateOverallPriceChanges(storeItems, todayOnly, startDate, endDate),
                });
            }
        });
    }

    items.forEach((item) => {
        if (item.chart) {
            itemsToShow.push({
                name: item.store + " " + item.name,
                priceHistory: todayOnly
                    ? [{ date: currentDate(), price: item.price }]
                    : item.priceHistory.filter((price) => price.date >= startDate && price.date <= endDate),
            });
        }
    });

    showChart(canvasDom, itemsToShow, todayOnly ? "bar" : "line");
}

function calculateOverallPriceChanges(items, todayOnly, startDate, endDate) {
    if (items.length == 0) return { dates: [], changes: [] };

    if (todayOnly) {
        let sum = 0;
        for (item of items) sum += item.price;
        return [{ date: currentDate(), price: sum }];
    }

    const allDates = items.flatMap((product) => product.priceHistory.map((item) => item.date));
    let uniqueDates = [...new Set(allDates)];
    uniqueDates.sort();

    const allPrices = items.map((product) => {
        let price = null;
        const prices = uniqueDates.map((date) => {
            const priceObj = product.priceHistory.find((item) => item.date === date);
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
        if (uniqueDates[i] < startDate || uniqueDates[i] > endDate) continue;
        let price = 0;
        for (let j = 0; j < allPrices.length; j++) {
            price += allPrices[j][i];
        }
        priceChanges.push({ date: uniqueDates[i], price });
    }

    return priceChanges;
}

function downloadFile(filename, content) {
    const blob = new Blob([content], { type: "text/plain" });
    const element = document.createElement("a");
    element.href = URL.createObjectURL(blob);
    element.download = filename;
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(element.href);
}

/* by Joder Illi, Snowball mailing list */
function stem(word) {
    /*
    Put u and y between vowels into upper case
    */
    word = word.replace(/([aeiouyäöü])u([aeiouyäöü])/g, "$1U$2");
    word = word.replace(/([aeiouyäöü])y([aeiouyäöü])/g, "$1Y$2");

    /*
    and then do the following mappings,
    (a) replace ß with ss,
    (a) replace ae with ä, Not doing these,
    have trouble with diphtongs
    (a) replace oe with ö, Not doing these,
    have trouble with diphtongs
    (a) replace ue with ü unless preceded by q. Not doing these,
    have trouble with diphtongs
    So in quelle, ue is not mapped to ü because it follows q, and in
    feuer it is not mapped because the first part of the rule changes it to
    feUer, so the u is not found.
    */
    word = word.replace(/ß/g, "ss");
    //word = word.replace(/ae/g, 'ä');
    //word = word.replace(/oe/g, 'ö');
    //word = word.replace(/([^q])ue/g, '$1ü');

    /*
    R1 and R2 are first set up in the standard way (see the note on R1
    and R2), but then R1 is adjusted so that the region before it contains at
    least 3 letters.
    R1 is the region after the first non-vowel following a vowel, or is
    the null region at the end of the word if there is no such non-vowel.
    R2 is the region after the first non-vowel following a vowel in R1,
    or is the null region at the end of the word if there is no such non-vowel.
    */

    var r1Index = word.search(/[aeiouyäöü][^aeiouyäöü]/);
    var r1 = "";
    if (r1Index != -1) {
        r1Index += 2;
        r1 = word.substring(r1Index);
    }

    var r2Index = -1;
    var r2 = "";

    if (r1Index != -1) {
        var r2Index = r1.search(/[aeiouyäöü][^aeiouyäöü]/);
        if (r2Index != -1) {
            r2Index += 2;
            r2 = r1.substring(r2Index);
            r2Index += r1Index;
        } else {
            r2 = "";
        }
    }

    if (r1Index != -1 && r1Index < 3) {
        r1Index = 3;
        r1 = word.substring(r1Index);
    }

    /*
    Define a valid s-ending as one of b, d, f, g, h, k, l, m, n, r or t.
    Define a valid st-ending as the same list, excluding letter r.
    */

    /*
    Do each of steps 1, 2 and 3.
    */

    /*
    Step 1:
    Search for the longest among the following suffixes,
    (a) em ern er
    (b) e en es
    (c) s (preceded by a valid s-ending)
    */
    var a1Index = word.search(/(em|ern|er)$/g);
    var b1Index = word.search(/(e|en|es)$/g);
    var c1Index = word.search(/([bdfghklmnrt]s)$/g);
    if (c1Index != -1) {
        c1Index++;
    }
    var index1 = 10000;
    var optionUsed1 = "";
    if (a1Index != -1 && a1Index < index1) {
        optionUsed1 = "a";
        index1 = a1Index;
    }
    if (b1Index != -1 && b1Index < index1) {
        optionUsed1 = "b";
        index1 = b1Index;
    }
    if (c1Index != -1 && c1Index < index1) {
        optionUsed1 = "c";
        index1 = c1Index;
    }

    /*
    and delete if in R1. (Of course the letter of the valid s-ending is
    not necessarily in R1.) If an ending of group (b) is deleted, and the ending
    is preceded by niss, delete the final s.
    (For example, äckern -> äck, ackers -> acker, armes -> arm,
    bedürfnissen -> bedürfnis)
    */

    if (index1 != 10000 && r1Index != -1) {
        if (index1 >= r1Index) {
            word = word.substring(0, index1);
            if (optionUsed1 == "b") {
                if (word.search(/niss$/) != -1) {
                    word = word.substring(0, word.length - 1);
                }
            }
        }
    }
    /*
    Step 2:
    Search for the longest among the following suffixes,
    (a) en er est
    (b) st (preceded by a valid st-ending, itself preceded by at least 3
    letters)
    */

    var a2Index = word.search(/(en|er|est)$/g);
    var b2Index = word.search(/(.{3}[bdfghklmnt]st)$/g);
    if (b2Index != -1) {
        b2Index += 4;
    }

    var index2 = 10000;
    var optionUsed2 = "";
    if (a2Index != -1 && a2Index < index2) {
        optionUsed2 = "a";
        index2 = a2Index;
    }
    if (b2Index != -1 && b2Index < index2) {
        optionUsed2 = "b";
        index2 = b2Index;
    }

    /*
    and delete if in R1.
    (For example, derbsten -> derbst by step 1, and derbst -> derb by
    step 2, since b is a valid st-ending, and is preceded by just 3 letters)
    */

    if (index2 != 10000 && r1Index != -1) {
        if (index2 >= r1Index) {
            word = word.substring(0, index2);
        }
    }

    /*
    Step 3: d-suffixes (*)
    Search for the longest among the following suffixes, and perform the
    action indicated.
    end ung
    delete if in R2
    if preceded by ig, delete if in R2 and not preceded by e
    ig ik isch
    delete if in R2 and not preceded by e
    lich heit
    delete if in R2
    if preceded by er or en, delete if in R1
    keit
    delete if in R2
    if preceded by lich or ig, delete if in R2
    */

    var a3Index = word.search(/(end|ung)$/g);
    var b3Index = word.search(/[^e](ig|ik|isch)$/g);
    var c3Index = word.search(/(lich|heit)$/g);
    var d3Index = word.search(/(keit)$/g);
    if (b3Index != -1) {
        b3Index++;
    }

    var index3 = 10000;
    var optionUsed3 = "";
    if (a3Index != -1 && a3Index < index3) {
        optionUsed3 = "a";
        index3 = a3Index;
    }
    if (b3Index != -1 && b3Index < index3) {
        optionUsed3 = "b";
        index3 = b3Index;
    }
    if (c3Index != -1 && c3Index < index3) {
        optionUsed3 = "c";
        index3 = c3Index;
    }
    if (d3Index != -1 && d3Index < index3) {
        optionUsed3 = "d";
        index3 = d3Index;
    }

    if (index3 != 10000 && r2Index != -1) {
        if (index3 >= r2Index) {
            word = word.substring(0, index3);
            var optionIndex = -1;
            var optionSubsrt = "";
            if (optionUsed3 == "a") {
                optionIndex = word.search(/[^e](ig)$/);
                if (optionIndex != -1) {
                    optionIndex++;
                    if (optionIndex >= r2Index) {
                        word = word.substring(0, optionIndex);
                    }
                }
            } else if (optionUsed3 == "c") {
                optionIndex = word.search(/(er|en)$/);
                if (optionIndex != -1) {
                    if (optionIndex >= r1Index) {
                        word = word.substring(0, optionIndex);
                    }
                }
            } else if (optionUsed3 == "d") {
                optionIndex = word.search(/(lich|ig)$/);
                if (optionIndex != -1) {
                    if (optionIndex >= r2Index) {
                        word = word.substring(0, optionIndex);
                    }
                }
            }
        }
    }

    /*
    Finally,
    turn U and Y back into lower case, and remove the umlaut accent from
    a, o and u.
    */
    word = word.replace(/U/g, "u");
    word = word.replace(/Y/g, "y");
    word = word.replace(/ä/g, "a");
    word = word.replace(/ö/g, "o");
    word = word.replace(/ü/g, "u");

    return word;
}

function dotProduct(vector1, vector2) {
    let product = 0;
    for (const key in vector1) {
        if (vector2.hasOwnProperty(key)) {
            product += vector1[key] * vector2[key];
        }
    }
    return product;
}

function addVector(vector1, vector2) {
    for (const key in vector2) {
        vector1[key] = (vector1[key] || 0) + vector2[key];
    }
}

function scaleVector(vector, scalar) {
    for (const key in vector) {
        vector[key] *= scalar;
    }
}

function normalizeVector(vector) {
    const len = magnitude(vector);
    for (const key in vector) {
        vector[key] /= len;
    }
}

function magnitude(vector) {
    let sumOfSquares = 0;
    for (const key in vector) {
        sumOfSquares += vector[key] ** 2;
    }
    return Math.sqrt(sumOfSquares);
}

function findMostSimilarItem(refItem, items) {
    let maxSimilarity = -1;
    let similarItem = null;
    let similarItemIdx = -1;
    items.forEach((item, idx) => {
        let similarity = dotProduct(refItem.vector, item.vector);
        if (similarity > maxSimilarity) {
            maxSimilarity = similarity;
            similarItem = item;
            similarItemIdx = idx;
        }
    });
    return {
        similarity: maxSimilarity,
        item: similarItem,
        index: similarItemIdx,
    };
}

function findMostSimilarItems(refItem, items, k = 5, accept = (ref, item) => true) {
    let topSimilarItems = [];
    let topSimilarities = [];

    items.forEach((item, idx) => {
        if (!accept(refItem, item)) return;
        let similarity = dotProduct(refItem.vector, item.vector);

        if (topSimilarItems.length < k) {
            topSimilarItems.push(item);
            topSimilarities.push(similarity);
        } else {
            let minSimilarity = Math.min(...topSimilarities);
            let minIndex = topSimilarities.indexOf(minSimilarity);

            if (similarity > minSimilarity) {
                topSimilarItems[minIndex] = item;
                topSimilarities[minIndex] = similarity;
            }
        }
    });

    let similarItemsWithIndices = topSimilarItems.map((item, index) => {
        return {
            similarity: topSimilarities[index],
            item: item,
            index: items.indexOf(item),
        };
    });

    return similarItemsWithIndices;
}

function similaritySortItems(items) {
    if (items.length == 0) return items;
    sortedItems = [items.shift()];
    let refItem = sortedItems[0];
    while (items.length > 0) {
        const similarItem = findMostSimilarItem(refItem, items);
        sortedItems.push(similarItem.item);
        items.splice(similarItem.index, 1);
        refItem = similarItem.item;
    }
    return sortedItems;
}

const NGRAM = 4;
function vector(tokens) {
    const vector = {};
    for (token of tokens) {
        if (token.length > NGRAM) {
            for (let i = 0; i < token.length - NGRAM; i++) {
                let trigram = token.substring(i, i + NGRAM);
                vector[trigram] = (vector[trigram] || 0) + 1;
            }
        } else {
            vector[token] = (vector[token] || 0) + 1;
        }
    }
    normalizeVector(vector);
    return vector;
}

function vectorizeItem(item, useUnit = true, useStem = true) {
    const isNumber = /^\d+\.\d+$/;
    let name = item.name
        .toLowerCase()
        .replace(/[^\w\s]|_/g, "")
        .replace("-", " ")
        .replace(",", " ");
    item.tokens = name
        .split(/\s+/)
        .filter((token) => !globalStopwords.includes(token))
        .filter((token) => !isNumber.test(token))
        .map((token) => (useStem ? stem(token) : token));
    if (useUnit) {
        if (item.quantity) item.tokens.push("" + item.quantity);
        if (item.unit) item.tokens.push(item.unit);
    }
    item.vector = vector(item.tokens);
}

function vectorizeItems(items, useUnit = true, accept = () => {}) {
    items.forEach((item) => vectorizeItem(item, useUnit));
}

function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

try {
    exports.decompress = decompress;
    exports.vector = vector;
    exports.dotProduct = dotProduct;
    exports.addVector = addVector;
    exports.scaleVector = scaleVector;
    exports.normalizeVector = normalizeVector;
    exports.stem = stem;
    exports.vectorizeItem = vectorizeItem;
    exports.vectorizeItems = vectorizeItems;
    exports.findMostSimilarItem = findMostSimilarItem;
    exports.findMostSimilarItems = findMostSimilarItems;
    exports.similaritySortItems = similaritySortItems;
} catch (e) {
    // hax
}

if (typeof window !== "undefined") {
    function setupLiveEdit() {
        if (window.location.host.indexOf("localhost") < 0 && window.location.host.indexOf("127.0.0.1") < 0) return;
        var script = document.createElement("script");
        script.type = "text/javascript";
        script.onload = () => {
            let lastChangeTimestamp = null;
            let socket = io({ transports: ["websocket"] });
            socket.on("connect", () => console.log("Connected"));
            socket.on("disconnect", () => console.log("Disconnected"));
            socket.on("message", (timestamp) => {
                if (lastChangeTimestamp != timestamp) {
                    setTimeout(() => location.reload(), 100);
                    lastChangeTimestamp = timestamp;
                }
            });
        };
        script.src = "js/socket.io.js";
        document.body.appendChild(script);
    }
    setupLiveEdit();
}

const globalStopwords = [
    "ab",
    "aber",
    "alle",
    "allein",
    "allem",
    "allen",
    "aller",
    "allerdings",
    "allerlei",
    "alles",
    "allmählich",
    "allzu",
    "als",
    "alsbald",
    "also",
    "am",
    "an",
    "and",
    "ander",
    "andere",
    "anderem",
    "anderen",
    "anderer",
    "andererseits",
    "anderes",
    "anderm",
    "andern",
    "andernfalls",
    "anders",
    "anstatt",
    "auch",
    "auf",
    "aus",
    "ausgenommen",
    "ausser",
    "ausserdem",
    "außer",
    "außerdem",
    "außerhalb",
    "bald",
    "bei",
    "beide",
    "beiden",
    "beiderlei",
    "beides",
    "beim",
    "beinahe",
    "bereits",
    "besonders",
    "besser",
    "beträchtlich",
    "bevor",
    "bezüglich",
    "bin",
    "bis",
    "bisher",
    "bislang",
    "bist",
    "bloß",
    "bsp.",
    "bzw",
    "ca",
    "ca.",
    "content",
    "da",
    "dabei",
    "dadurch",
    "dafür",
    "dagegen",
    "daher",
    "dahin",
    "damals",
    "damit",
    "danach",
    "daneben",
    "dann",
    "daran",
    "darauf",
    "daraus",
    "darin",
    "darum",
    "darunter",
    "darüber",
    "darüberhinaus",
    "das",
    "dass",
    "dasselbe",
    "davon",
    "davor",
    "dazu",
    "daß",
    "dein",
    "deine",
    "deinem",
    "deinen",
    "deiner",
    "deines",
    "dem",
    "demnach",
    "demselben",
    "den",
    "denen",
    "denn",
    "dennoch",
    "denselben",
    "der",
    "derart",
    "derartig",
    "derem",
    "deren",
    "derer",
    "derjenige",
    "derjenigen",
    "derselbe",
    "derselben",
    "derzeit",
    "des",
    "deshalb",
    "desselben",
    "dessen",
    "desto",
    "deswegen",
    "dich",
    "die",
    "diejenige",
    "dies",
    "diese",
    "dieselbe",
    "dieselben",
    "diesem",
    "diesen",
    "dieser",
    "dieses",
    "diesseits",
    "dir",
    "direkt",
    "direkte",
    "direkten",
    "direkter",
    "doch",
    "dort",
    "dorther",
    "dorthin",
    "drauf",
    "drin",
    "drunter",
    "drüber",
    "du",
    "dunklen",
    "durch",
    "durchaus",
    "eben",
    "ebenfalls",
    "ebenso",
    "eher",
    "eigenen",
    "eigenes",
    "eigentlich",
    "ein",
    "eine",
    "einem",
    "einen",
    "einer",
    "einerseits",
    "eines",
    "einfach",
    "einführen",
    "einführte",
    "einführten",
    "eingesetzt",
    "einig",
    "einige",
    "einigem",
    "einigen",
    "einiger",
    "einigermaßen",
    "einiges",
    "einmal",
    "eins",
    "einseitig",
    "einseitige",
    "einseitigen",
    "einseitiger",
    "einst",
    "einstmals",
    "einzig",
    "entsprechend",
    "entweder",
    "er",
    "erst",
    "es",
    "etc",
    "etliche",
    "etwa",
    "etwas",
    "euch",
    "euer",
    "eure",
    "eurem",
    "euren",
    "eurer",
    "eures",
    "falls",
    "fast",
    "ferner",
    "folgende",
    "folgenden",
    "folgender",
    "folgendes",
    "folglich",
    "fuer",
    "für",
    "gab",
    "ganze",
    "ganzem",
    "ganzen",
    "ganzer",
    "ganzes",
    "gar",
    "gegen",
    "gemäss",
    "ggf",
    "gleich",
    "gleichwohl",
    "gleichzeitig",
    "glücklicherweise",
    "gänzlich",
    "hab",
    "habe",
    "haben",
    "haette",
    "hast",
    "hat",
    "hatte",
    "hatten",
    "hattest",
    "hattet",
    "heraus",
    "herein",
    "hier",
    "hier",
    "hinter",
    "hiermit",
    "hiesige",
    "hin",
    "hinein",
    "hinten",
    "hinter",
    "hinterher",
    "http",
    "hätt",
    "hätte",
    "hätten",
    "höchstens",
    "ich",
    "igitt",
    "ihm",
    "ihn",
    "ihnen",
    "ihr",
    "ihre",
    "ihrem",
    "ihren",
    "ihrer",
    "ihres",
    "im",
    "immer",
    "immerhin",
    "in",
    "indem",
    "indessen",
    "infolge",
    "innen",
    "innerhalb",
    "ins",
    "insofern",
    "inzwischen",
    "irgend",
    "irgendeine",
    "irgendwas",
    "irgendwen",
    "irgendwer",
    "irgendwie",
    "irgendwo",
    "ist",
    "ja",
    "je",
    "jed",
    "jede",
    "jedem",
    "jeden",
    "jedenfalls",
    "jeder",
    "jederlei",
    "jedes",
    "jedoch",
    "jemand",
    "jene",
    "jenem",
    "jenen",
    "jener",
    "jenes",
    "jenseits",
    "jetzt",
    "jährig",
    "jährige",
    "jährigen",
    "jähriges",
    "kam",
    "kann",
    "kannst",
    "kaum",
    "kein",
    "keine",
    "keinem",
    "keinen",
    "keiner",
    "keinerlei",
    "keines",
    "keineswegs",
    "klar",
    "klare",
    "klaren",
    "klares",
    "klein",
    "kleinen",
    "kleiner",
    "kleines",
    "koennen",
    "koennt",
    "koennte",
    "koennten",
    "komme",
    "kommen",
    "kommt",
    "konkret",
    "konkrete",
    "konkreten",
    "konkreter",
    "konkretes",
    "können",
    "könnt",
    "künftig",
    "leider",
    "machen",
    "man",
    "manche",
    "manchem",
    "manchen",
    "mancher",
    "mancherorts",
    "manches",
    "manchmal",
    "mehr",
    "mehrere",
    "mein",
    "meine",
    "meinem",
    "meinen",
    "meiner",
    "meines",
    "mich",
    "mir",
    "mit",
    "mithin",
    "muessen",
    "muesst",
    "muesste",
    "muss",
    "musst",
    "musste",
    "mussten",
    "muß",
    "mußt",
    "müssen",
    "müsste",
    "müssten",
    "müßt",
    "müßte",
    "nach",
    "nachdem",
    "nachher",
    "nachhinein",
    "nahm",
    "natürlich",
    "neben",
    "nebenan",
    "nehmen",
    "nein",
    "nicht",
    "nichts",
    "nie",
    "niemals",
    "niemand",
    "nirgends",
    "nirgendwo",
    "noch",
    "nun",
    "nur",
    "nächste",
    "nämlich",
    "nötigenfalls",
    "ob",
    "oben",
    "oberhalb",
    "obgleich",
    "obschon",
    "obwohl",
    "oder",
    "oft",
    "per",
    "plötzlich",
    "schließlich",
    "schon",
    "sehr",
    "sehrwohl",
    "seid",
    "sein",
    "seine",
    "seinem",
    "seinen",
    "seiner",
    "seines",
    "seit",
    "seitdem",
    "seither",
    "selber",
    "selbst",
    "sich",
    "sicher",
    "sicherlich",
    "sie",
    "sind",
    "so",
    "sobald",
    "sodass",
    "sofort",
    "sofern",
    "sog",
    "sogar",
    "solange",
    "solch",
    "solche",
    "solchem",
    "solchen",
    "solcher",
    "solches",
    "soll",
    "sollen",
    "sollst",
    "sollt",
    "sollte",
    "sollten",
    "somit",
    "sondern",
    "sonst",
    "sonstige",
    "sonstigen",
    "sonstiger",
    "sonstiges",
    "sooft",
    "soviel",
    "soweit",
    "sowie",
    "sowieso",
    "sowohl",
    "später",
    "statt",
    "stattfinden",
    "stattfand",
    "stattgefunden",
    "steht",
    "stets",
    "such",
    "suche",
    "suchen",
    "tatsächlich",
    "tatsächlichen",
    "tatsächlicher",
    "tatsächliches",
    "tatsächlich",
    "tatsächlichen",
    "tatsächlicher",
    "tatsächliches",
    "tief",
    "tiefer",
    "trotz",
    "trotzdem",
    "tun",
    "über",
    "überall",
    "überallhin",
    "überdies",
    "überhaupt",
    "übrig",
    "übrigens",
    "um",
    "umso",
    "umsoweniger",
    "unbedingt",
    "und",
    "unmöglich",
    "unnötig",
    "unser",
    "unsere",
    "unserem",
    "unseren",
    "unserer",
    "unseres",
    "unserseits",
    "unter",
    "unterhalb",
    "unterhalb",
    "untereinander",
    "untergebracht",
    "unterhalb",
    "unterhalb",
    "unterhalb",
    "unterhalb",
    "unterhalb",
    "unterhalb",
    "unterschiedlich",
    "unterschiedliche",
    "unterschiedlichen",
    "unterschiedlicher",
    "unterschiedliches",
    "unterschiedlich",
    "unterschiedliche",
    "unterschiedlichen",
    "unterschiedlicher",
    "unterschiedliches",
    "unzwar",
    "usw",
    "usw.",
    "vermag",
    "vermögen",
    "vermutlich",
    "verrate",
    "verraten",
    "verrätst",
    "verschieden",
    "verschiedene",
    "verschiedenen",
    "verschiedener",
    "verschiedenes",
    "versorgen",
    "versorgt",
    "versorgte",
    "versorgten",
    "viel",
    "viele",
    "vielem",
    "vielen",
    "vieler",
    "vieles",
    "vielleicht",
    "vielmals",
    "vier",
    "vierte",
    "viertel",
    "vierten",
    "vierter",
    "viertes",
    "vom",
    "von",
    "vor",
    "vorbei",
    "vorgestern",
    "vorher",
    "vorüber",
    "wach",
    "wachen",
    "wahrend",
    "wann",
    "war",
    "warauf",
    "ward",
    "waren",
    "warst",
    "wart",
    "warum",
    "was",
    "weder",
    "weil",
    "weiter",
    "weitere",
    "weiterem",
    "weiteren",
    "weiterer",
    "weiteres",
    "weiterhin",
    "weitgehend",
    "welche",
    "welchem",
    "welchen",
    "welcher",
    "welches",
    "wem",
    "wen",
    "wenig",
    "wenige",
    "wenigem",
    "wenigen",
    "weniger",
    "wenigstens",
    "wenn",
    "wenngleich",
    "wer",
    "werde",
    "werden",
    "werdet",
    "weshalb",
    "wessen",
    "wichtig",
    "wie",
    "wieder",
    "wiederum",
    "wieso",
    "will",
    "willst",
    "wir",
    "wird",
    "wirklich",
    "wirst",
    "wissen",
    "wo",
    "woanders",
    "wohl",
    "woher",
    "wohin",
    "wohingegen",
    "wohl",
    "wohlweislich",
    "wollen",
    "wollt",
    "wollte",
    "wollten",
    "womit",
    "woraufhin",
    "woraus",
    "woraussichtlich",
    "worauf",
    "woraus",
    "worin",
    "worüber",
    "wovon",
    "wovor",
    "wozu",
    "während",
    "währenddessen",
    "wär",
    "wäre",
    "wären",
    "wärst",
    "wäre",
    "wären",
    "wärst",
    "würde",
    "würden",
    "würdest",
    "würdet",
    "zB",
    "z.b.",
    "zehn",
    "zeigen",
    "zeitweise",
    "zu",
    "zufolge",
    "zugleich",
    "zuletzt",
    "zum",
    "zumal",
    "zumeist",
    "zunächst",
    "zur",
    "zurück",
    "zurückgehend",
    "zurückgehen",
    "zurückgegangen",
    "zurückgekommen",
    "zurückgekommen",
    "zurückgekommen",
    "zurückgekommen",
    "zurückgezogen",
    "zusammen",
    "zusätzlich",
    "zusammen",
    "zuvor",
    "zuviel",
    "zuweilen",
    "zwanzig",
    "zwar",
    "zwei",
    "zweite",
    "zweiten",
    "zweiter",
    "zweites",
    "zwischen",
    "zwischendurch",
    "zwölf",
    "überall",
    "überallhin",
    "überdies",
    "überhaupt",
    "übrig",
    "übrigens",
];
