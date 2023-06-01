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
    dmDe: {
        name: "DM DE",
        budgetBrands: ["balea"],
        color: "rgb(236 254 253)",
    },
    unimarkt: {
        name: "Unimarkt",
        budgetBrands: ["jeden tag", "unipur"],
        color: "rgb(179, 217, 255)",
    },
    reweDe: {
        name: "REWE DE",
        budgetBrands: ["ja!"],
        color: "rgb(236 231 225)"
    },
    penny: {
        name: "Penny",
        budgetBrands: ["bravo", "echt bio!", "san fabio", "federike", "blik", "berida", "today", "ich bin österreich"],
        color: "rgb(255, 180, 180)",
    }
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
            case "dmDe":
                url = `https://www.dm.de/product-p${id}.html`;
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
            case "reweDe":
                url = "https://shop.rewe.de/p/" + name.toLowerCase().replace(/ /g, "-") + "/" + id;
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
        item.search = item.name + " " + item.quantity + " " + item.unit;
        item.search = item.search.toLowerCase().replace(",", ".");

        item.numPrices = item.priceHistory.length;
        item.priceOldest =
            item.priceHistory[item.priceHistory.length - 1].price;
        item.dateOldest = item.priceHistory[item.priceHistory.length - 1].date;
        item.date = item.priceHistory[0].date;
        let highestPriceBefore = -1;
        for (let i = 1; i < item.priceHistory.length; i++) {
            const price = item.priceHistory[i];
            if (i < 10) {
                item["price" + i] = price.price;
                item["date" + i] = price.date;
            }
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
    if (quantity >= 1000 && (unit == 'g' || unit == 'ml')) {
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
                !stores[item.store].budgetBrands.some(budgetBrand => name.indexOf(budgetBrand) >= 0)
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
        <div style="margin-bottom: 1em">
            <a id="querylink-${id}" class="hide querylink">Abfrage teilen</a>
            <a id="json-${id}" href="" class="hide">JSON</a>
        </div>
        <div class="filters filters--store">
            ${STORE_KEYS.map(store => `<label><input id="${store}-${id}" type="checkbox" checked="true">${stores[store].name}</label>`).join(" ")}
        </div>
        <div class="filters">
            <label><input id="budgetBrands-${id}" type="checkbox"> Nur Billigeigenmarken (Clever, S-Budget, Milfina, Milboa, etc.)</label>
            <label><input id="bio-${id}" type="checkbox"> Nur Bio</label>
        </div>
        <div class="filters">
            <label>Min € <input id="minprice-${id}" type="number" min="0" value="0"></label>
            <label>Max € <input id="maxprice-${id}" type="number" min="0" value="100"></label>
            <label><input id="exact-${id}" type="checkbox"> Exaktes Wort</label>
        </div>
        <label style="margin-bottom: 1em">Sortieren <select id="sort-${id}">
            <option value="priceasc">Preis aufsteigend</option>
            <option value="pricedesc">Preis absteigend</option>
            <option value="namesim">Namensähnlichkeit</option>
        </select></label>
        <div id="numresults-${id}"></div>
        <table id="result-${id}" class="searchresults"></table>
    `;

    const searchInput = parentElement.querySelector(`#search-${id}`);
    const queryLink = parentElement.querySelector(`#querylink-${id}`);
    const jsonLink = parentElement.querySelector(`#json-${id}`);
    const exact = parentElement.querySelector(`#exact-${id}`);
    const table = parentElement.querySelector(`#result-${id}`);
    const budgetBrands = parentElement.querySelector(`#budgetBrands-${id}`);
    const bio = parentElement.querySelector(`#bio-${id}`);
    const storeCheckboxes = STORE_KEYS.map(store => parentElement.querySelector(`#${store}-${id}`));
    const minPrice = parentElement.querySelector(`#minprice-${id}`);
    const maxPrice = parentElement.querySelector(`#maxprice-${id}`);
    const numResults = parentElement.querySelector(`#numresults-${id}`);
    const sort = parentElement.querySelector(`#sort-${id}`);

    let lastHits = [];
    jsonLink.addEventListener("click", (event) => {
        event.preventDefault();
        downloadFile("items.json", JSON.stringify(lastHits, null, 2));
    })

    const setQuery = () => {
        const query = searchInput.value.trim();
        if (query.length === 0) {
            queryLink.classList.add("hide");
            jsonLink.classList.add("hide");
            return;
        }
        queryLink.classList.remove("hide");
        jsonLink.classList.remove("hide");
        const inputs = [...table.querySelectorAll("input:checked")];
        const checked = inputs.length ? inputs.map(item => item.dataset.id) : getQueryParameter("c");
        queryLink.setAttribute("href", `/?q=${encodeURIComponent(query)}${checked?.length ? `&c=${checked.join("&c=")}` : ""}`)
    };

    let search = (query) => {
        let hits = [];
        let now = performance.now();
        try {
            hits = searchItems(items, query,
                STORE_KEYS.filter((store, i) => storeCheckboxes[i].checked),
                budgetBrands.checked, toNumber(minPrice.value, 0), toNumber(maxPrice.value, 100), exact.checked, bio.checked, sort.value
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
        if (query.trim().charAt(0) != "!" || (query.trim().toLowerCase().indexOf("order by") == -1)) {
            if (sort.value == "priceasc") {
                hits.sort((a, b) => a.price - b.price);
            } else if (sort.value == "pricedesc") {
                hits.sort((a, b) => b.price - a.price);
            } else {
                vectorizeItems(hits);
                hits = similaritySortItems(hits);
            }
        }

        let header = dom("tr", `<th>Kette</th><th>Name</th><th>Menge</th><th>Preis</th>`);
        if (headerModifier) header = headerModifier(header);
        const thead = dom("thead", ``);
        thead.appendChild(header);
        table.appendChild(thead);

        now = performance.now();
        let num = 0;
        let limit = isMobile() ? 500 : 2000;
        hits.every(hit => {
            let itemDom = itemToDOM(hit);
            if (itemDomModifier) itemDom = itemDomModifier(hit, itemDom, hits, setQuery);
            table.appendChild(itemDom);
            num++;
            return num < limit;
        });
        console.log("Building DOM took: " + (performance.now() - now) / 1000.0 + " secs");
        numResults.innerHTML = "Resultate: " + hits.length + (num < hits.length ? ", " + num + " angezeigt" : "");
        lastHits = hits;
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
    sort.addEventListener("change", () => search(searchInput.value));
    minPrice.addEventListener("change", () => search(searchInput.value));
    maxPrice.addEventListener("change", () => search(searchInput.value));
    exact.addEventListener("change", () => search(searchInput.value))

    return () => search(searchInput.value);
}

function showChart(canvasDom, items, chartType) {
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
    let scrollTop = -1;
    if (canvasDom.lastChart) {
        scrollTop = document.documentElement.scrollTop;
        canvasDom.lastChart.destroy();
    }
    canvasDom.lastChart = new Chart(ctx, {
        type: chartType ? chartType : 'line',
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
    if (scrollTop != -1)
        document.documentElement.scrollTop = scrollTop;
}

function calculateOverallPriceChanges(items, todayOnly) {
    if (items.length == 0) return { dates: [], changes: [] };

    if (todayOnly) {
        let sum = 0;
        for (item of items) sum += item.price;
        return [{ date: currentDate(), price: sum }];
    }

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

function downloadFile(filename, content) {
    const blob = new Blob([content], { type: 'text/plain' });
    const element = document.createElement('a');
    element.href = URL.createObjectURL(blob);
    element.download = filename;
    element.style.display = 'none';
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
    word = word.replace(/([aeiouyäöü])u([aeiouyäöü])/g, '$1U$2');
    word = word.replace(/([aeiouyäöü])y([aeiouyäöü])/g, '$1Y$2');

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
    word = word.replace(/ß/g, 'ss');
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
    var r1 = '';
    if (r1Index != -1) {
        r1Index += 2;
        r1 = word.substring(r1Index);
    }

    var r2Index = -1;
    var r2 = '';

    if (r1Index != -1) {
        var r2Index = r1.search(/[aeiouyäöü][^aeiouyäöü]/);
        if (r2Index != -1) {
            r2Index += 2;
            r2 = r1.substring(r2Index);
            r2Index += r1Index;
        } else {
            r2 = '';
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
    var optionUsed1 = '';
    if (a1Index != -1 && a1Index < index1) {
        optionUsed1 = 'a';
        index1 = a1Index;
    }
    if (b1Index != -1 && b1Index < index1) {
        optionUsed1 = 'b';
        index1 = b1Index;
    }
    if (c1Index != -1 && c1Index < index1) {
        optionUsed1 = 'c';
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
            if (optionUsed1 == 'b') {
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
    var optionUsed2 = '';
    if (a2Index != -1 && a2Index < index2) {
        optionUsed2 = 'a';
        index2 = a2Index;
    }
    if (b2Index != -1 && b2Index < index2) {
        optionUsed2 = 'b';
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
    var optionUsed3 = '';
    if (a3Index != -1 && a3Index < index3) {
        optionUsed3 = 'a';
        index3 = a3Index;
    }
    if (b3Index != -1 && b3Index < index3) {
        optionUsed3 = 'b';
        index3 = b3Index;
    }
    if (c3Index != -1 && c3Index < index3) {
        optionUsed3 = 'c';
        index3 = c3Index;
    }
    if (d3Index != -1 && d3Index < index3) {
        optionUsed3 = 'd';
        index3 = d3Index;
    }

    if (index3 != 10000 && r2Index != -1) {
        if (index3 >= r2Index) {
            word = word.substring(0, index3);
            var optionIndex = -1;
            var optionSubsrt = '';
            if (optionUsed3 == 'a') {
                optionIndex = word.search(/[^e](ig)$/);
                if (optionIndex != -1) {
                    optionIndex++;
                    if (optionIndex >= r2Index) {
                        word = word.substring(0, optionIndex);
                    }
                }
            } else if (optionUsed3 == 'c') {
                optionIndex = word.search(/(er|en)$/);
                if (optionIndex != -1) {
                    if (optionIndex >= r1Index) {
                        word = word.substring(0, optionIndex);
                    }
                }
            } else if (optionUsed3 == 'd') {
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
    word = word.replace(/U/g, 'u');
    word = word.replace(/Y/g, 'y');
    word = word.replace(/ä/g, 'a');
    word = word.replace(/ö/g, 'o');
    word = word.replace(/ü/g, 'u');

    return word;
}

function vector(tokens) {
    const vector = {};
    /*for (const token of tokens) {
        vector[token] = (vector[token] || 0) + 1;
    }*/
    for (token of tokens) {
        if (token.length > 3) {
            for (let i = 0; i < token.length - 3; i++) {
                let trigram = token.substring(i, i + 3);
                vector[trigram] = (vector[trigram] || 0) + 1;
            }
        } else {
            vector[token] = (vector[token] || 0) + 1;
        }
    }
    normalizeVector(vector);
    return vector;
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

function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function similaritySortItems(items) {
    if (items.length == 0) return items;
    sortedItems = [items.shift()];
    let refItem = sortedItems[0];
    while (items.length > 0) {
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
        sortedItems.push(similarItem);
        items.splice(similarItemIdx, 1);
        refItem = similarItem;
    }
    return sortedItems;
}

function vectorizeItems(items) {
    items.forEach(item => {
        let name = item.name.toLowerCase().replace(/[^\w\s]|_/g, "").replace("-", " ");
        item.tokens = name.split(/\s+/).map(token => stem(token));
        if (item.quantity) item.tokens.push("" + item.quantity);
        if (item.unit) item.tokens.push(item.unit);
        item.vector = vector(item.tokens);
    });
}

function cluster(items, maxTime) {
    if (!maxTime) maxTime = 0.250;

    // Tokenize, stem, and vectorize item names
    vectorizeItems(items);

    // Split by store and sort by number of items in descending order
    const itemsPerStore = [];
    for (const store of STORE_KEYS) {
        const storeItems = items.filter(item => item.store === store);
        if (storeItems.length > 0) itemsPerStore.push(storeItems);
    }
    itemsPerStore.sort((a, b) => b.length - a.length);
    itemsPerStore.forEach(items => console.log(items[0].store + ", " + items.length));

    // Take the store with the most items, then try to find the best match
    // from each of the other stores
    const baseStore = itemsPerStore.shift()
    itemsPerStore.push(baseStore);
    const otherItems = itemsPerStore.flat();

    let clusters = [];
    for (item of baseStore) {
        clusters.push({ centroid: deepCopy(item.vector), item, items: [] });
    }

    const now = performance.now();
    let maxIterations = 100;
    while (maxIterations-- > 0) {
        for (item of otherItems) {
            let maxSimilarity = -1;
            let nearestCluster = null;
            for (cluster of clusters) {
                const similarity = dotProduct(cluster.centroid, item.vector);
                if (similarity > maxSimilarity) {
                    maxSimilarity = similarity;
                    nearestCluster = cluster;
                    item.similarity = similarity;
                }
            }
            nearestCluster.items.push(item);
        }

        const newClusters = [];
        for (cluster of clusters) {
            const newCluster = { centroid: {}, item: cluster.item, items: [] }
            for (item of cluster.items) {
                addVector(newCluster.centroid, item.vector);
            }
            if (cluster.items.length > 0) {
                scaleVector(newCluster.centroid, 1 / cluster.items.length);
                normalizeVector(newCluster.centroid);
            }
            newClusters.push(newCluster);
        }

        const time = (performance.now() - now) / 1000
        console.log(maxIterations + ", time " + time);
        if (JSON.stringify(clusters) == JSON.stringify(newClusters) || maxIterations == 1 || time > maxTime) {
            break;
        }

        clusters = newClusters;
    }

    const finalClusters = [];
    for (cluster of clusters) {
        cluster.items = similaritySortItems(cluster.items);
        finalClusters.push(cluster);
    }

    return finalClusters;
}

function flattenClusters(clusters) {
    const items = []
    for (cluster of clusters) {
        for (item of cluster.items) {
            items.push(item);
        }
    }
    return items;
}

function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

try {
    exports.vector = vector;
    exports.dotProduct = dotProduct;
    exports.addVector = addVector;
    exports.scaleVector = scaleVector;
    exports.normalizeVector = normalizeVector;
    exports.stem = stem;
    exports.cluster = cluster;
    exports.flattenClusters = flattenClusters;
    exports.vectorizeItems = vectorizeItems;
    exports.similaritySortItems = similaritySortItems;
} catch (e) {
    // hax
}