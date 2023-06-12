const { today, parseNumber, dom, getBooleanAttribute, queryItems, log, deltaTime } = require("../misc");
const { stores, STORE_KEYS, BUDGET_BRANDS } = require("../model/stores");
const { View } = require("./view");

class ItemsFilter extends View {
    constructor() {
        super();

        this._emptyQuery = getBooleanAttribute(this, "emptyquery");
        this._filterByPriceChanges = getBooleanAttribute(this, "pricechanges");
        this._filterByPriceDirection = getBooleanAttribute(this, "pricedirection");
        this._filterByStores = getBooleanAttribute(this, "stores");
        this._filterByMisc = getBooleanAttribute(this, "misc");
        this._noChartClear = getBooleanAttribute(this, "nochartclear");

        const hidePriceChanges = this._filterByPriceChanges ? "" : "hidden";
        const hidePriceDirection = this._filterByPriceDirection ? "" : "hidden";
        const hideStores = this._filterByStores ? "" : "hidden";
        const hideMisc = this._filterByMisc ? "" : "hidden";
        const placeholder = this.hasAttribute("placeholder") ? this.getAttribute("placeholder") : "Produkte suchen...";

        this.innerHTML = /*html*/ `
            <input x-id="query" x-state x-input-debounce class="rounded-lg px-2 py-1 w-full" type="text" placeholder="${placeholder}" />

            <div x-id="stores" class="flex justify-center gap-2 flex-wrap mt-4 ${hideStores}">
                <custom-checkbox x-id="allStores" label="Alle" checked></custom-checkbox>
                ${STORE_KEYS.map(
                    (store) => /*html*/ `
                        <custom-checkbox
                            x-id="${store}" x-state x-change
                            label="${stores[store].name}"
                            class="${stores[store].color}"
                            ${stores[store].defaultChecked ? "checked" : ""}
                        ></custom-checkbox>`
                ).join("")}
            </div>

            <div x-id="priceChanges" class="text-sm flex justify-center gap-4 mt-4 ${hidePriceChanges}">
                <label>
                    <input x-id="priceChangesToday" x-state type="radio" name="type" checked /> Datum
                    <select x-id="priceChangesDate" x-state x-change class="bg-white rounded-full">
                        <option>${today()}</option>
                    </select>
                </label>
                <label>
                    <input x-id="priceChangesCheaper" x-state type="radio" name="type" /> Billiger seit letzter Änderung
                </label>
            </div>

            <div x-id="misc" class="flex items-center justify-center flex-wrap gap-2 mt-4 ${hideMisc}">
                <custom-checkbox
                    x-id="budgetBrands" x-state x-change
                    label="Nur Diskont-Eigenmarken"
                    abbr="${BUDGET_BRANDS.map((budgetBrand) => budgetBrand.toUpperCase()).join(", ")}"
                ></custom-checkbox>
                <custom-checkbox x-id="bio" x-state x-change label="Nur Bio"></custom-checkbox>
                <custom-checkbox x-id="exact" x-state x-change label="Exaktes Wort"></custom-checkbox>
                <label class="cursor-pointer inline-flex items-center gap-x-1 rounded-full bg-white border border-gray-400 px-2 py-1 text-xs font-medium text-gray-600">
                    Preis € <input x-id="minPrice" x-state x-input class="w-12" type="number" min="0" value="0">
                    -
                    <input x-id="maxPrice" x-state x-input-debounce class="w-12" type="number" min="0" value="100">
                </label>
            </div>

            <div x-id="priceDirection" class="flex justify-center gap-2 mt-4 ${this._hideMisc ? "" : "mb-4"} ${hidePriceDirection}">
                <custom-checkbox x-id="priceIncreased" x-state x-change label="Teurer" checked class="gray"></custom-checkbox>
                <custom-checkbox x-id="priceDecreased" x-state x-change label="Billiger" checked class="gray"></custom-checkbox>
            </div>
        `;
        this.classList.add("items-filter");

        const elements = this.elements;

        elements.query.addEventListener("input", () => {
            let query = elements.query.value.trim();
            if (query.length > 0 && query.charAt(0) == "!") {
                elements.stores.classList.add("hidden");
                elements.misc.classList.add("hidden");
            } else {
                if (!hideStores) elements.stores.classList.remove("hidden");
                if (!hideMisc) elements.misc.classList.remove("hidden");
            }
        });

        elements.allStores.addEventListener("change", () => {
            const checked = elements.allStores.checked;
            STORE_KEYS.forEach((store) => (elements[store].checked = checked));
            this.fireChangeEvent();
        });

        elements.priceChangesToday.addEventListener("change", () => {
            if (elements.priceChangesToday.checked) elements.priceDirection.classList.remove("hidden");
            else elements.priceDirection.classList.add("hidden");
            this.fireChangeEvent();
        });

        elements.priceChangesCheaper.addEventListener("change", () => {
            if (elements.priceChangesCheaper.checked) elements.priceDirection.classList.add("hidden");
            else elements.priceDirection.classList.remove("hidden");
            this.fireChangeEvent();
        });

        this.setupEventHandlers();

        this.addEventListener("x-change", () => {
            this.filter();
        });
    }

    filter() {
        if (!this.model) return;

        const start = performance.now();
        const elements = this.elements;
        this.model.totalItems = this.model.items.length;
        let filteredItems = [...this.model.items];
        let query = elements.query.value.trim();
        if (query.length == 0 && this._emptyQuery) {
            this.model.removeListener(this._listener);
            this.model.filteredItems = [];
            this.model.addListener(this._listener);
            return;
        }

        if (this._filterByPriceChanges) {
            if (elements.priceChangesToday.checked) {
                const today = elements.priceChangesDate.value;
                filteredItems = filteredItems.filter((item) => {
                    if (item.priceHistory.length == 1) return false;
                    for (let i = 0; i < item.priceHistory.length; i++) {
                        if (item.priceHistory[i].date === today && i + 1 < item.priceHistory.length) {
                            return true;
                        }
                    }
                    return false;
                });
            } else {
                filteredItems = filteredItems.filter((item) => {
                    if (item.priceHistory.length == 1) return false;
                    return item.priceHistory[0].price < item.priceHistory[1].price;
                });
            }
            this.model.totalItems = filteredItems.length;
        }

        if (this._filterByPriceDirection) {
            const increased = elements.priceIncreased.checked;
            const decreased = elements.priceDecreased.checked;
            filteredItems = filteredItems.filter((item) => {
                if (item.priceHistory.length == 1) return false;
                if (this._filterByPriceChanges && elements.priceChangesToday.checked) {
                    const today = elements.priceChangesDate.value;
                    for (let i = 0; i < item.priceHistory.length; i++) {
                        if (item.priceHistory[i].date == today && i + 1 < item.priceHistory.length) {
                            if (increased && item.priceHistory[i].price > item.priceHistory[i + 1].price) {
                                return true;
                            }
                            if (decreased && item.priceHistory[i].price < item.priceHistory[i + 1].price) {
                                return true;
                            }
                        }
                    }
                } else {
                    if (increased && item.priceHistory[0].price > item.priceHistory[1].price) return true;
                    if (decreased && item.priceHistory[0].price < item.priceHistory[1].price) return true;
                }
                return false;
            });
        }

        // Don't apply store and misc filters if query is an alasql query.
        if (query.charAt(0) != "!") {
            if (this._filterByStores) {
                const checkedStores = this.checkedStores;
                filteredItems = filteredItems.filter((item) => checkedStores.includes(item.store));
            }

            if (this._filterByMisc) {
                const budgetBrands = elements.budgetBrands.checked;
                const bio = elements.bio.checked;
                const minPrice = parseNumber(elements.minPrice.value, 0);
                const maxPrice = parseNumber(elements.maxPrice.value, 100);
                filteredItems = filteredItems.filter((item) => {
                    if (budgetBrands && !BUDGET_BRANDS.some((budgetBrand) => item.name.toLowerCase().indexOf(budgetBrand) >= 0)) return false;
                    if (bio && !item.bio) return false;
                    if (minPrice > item.price) return false;
                    if (maxPrice < item.price) return false;
                    return true;
                });
            }
        }

        if (query.length > 0) {
            filteredItems = queryItems(query, filteredItems, elements.exact.checked);
        }

        if (this.model.lastQuery != query && !this._noChartClear) {
            filteredItems.forEach((item) => (item.chart = false));
        }
        this.model.lastQuery = query;

        log(`ItemsFilter - Filtering ${this.model.items.length} took ${deltaTime(start).toFixed(4)} secs, ${filteredItems.length} results.`);

        this.model.removeListener(this._listener);
        this.model.filteredItems = filteredItems;
        this.model.addListener(this._listener);
    }

    render() {
        const start = performance.now();
        const elements = this.elements;
        const items = this.model.items;
        const dates = {};
        for (const item of items) {
            if (item.priceHistory.length == 1) continue;
            for (let i = 0; i < item.priceHistory.length; i++) {
                const price = item.priceHistory[i];
                if (i + 1 < item.priceHistory.length) {
                    if (item.priceHistory[i].price != item.priceHistory[i + 1].price) {
                        if (i == 0 || item.priceHistory[i].date != item.priceHistory[i - 1].date) {
                            dates[price.date] = dates[price.date] ? dates[price.date] + 1 : 1;
                        }
                    }
                }
            }
        }

        const priceChangesDates = elements.priceChangesDate;
        priceChangesDates.innerHTML = "";
        for (const date of Object.keys(dates).sort((a, b) => b.localeCompare(a))) {
            const dateDom = dom("option");
            dateDom.value = date;
            dateDom.innerText = `${date} (${dates[date]})`;
            priceChangesDates.append(dateDom);
        }

        log(`ItemsFilter - rendering items filter took ${deltaTime(start)}`);
    }

    get checkedStores() {
        return STORE_KEYS.filter((store) => this.elements[store].checked);
    }

    get shareableState() {
        const state = this.state;
        const shareableState = Object.keys(state)
            .sort()
            .filter((el) => !STORE_KEYS.includes(el))
            .map((el) => {
                let value = state[el];
                if (value === true) value = ".";
                if (value === false) value = "-";
                return value;
            })
            .join(";");
        const disabledStores = STORE_KEYS.filter((storeName) => {
            const store = state[storeName];
            if (stores[storeName].defaultChecked && !store) return true;
            if (!stores[storeName].defaultChecked && store) return true;
            return false;
        }).join(";");
        if (disabledStores.length > 0) return shareableState + ";" + disabledStores;
        else return shareableState;
    }

    set shareableState(shareableState) {
        const values = shareableState.split(";");
        const state = this.state;
        let storeIndex = -1;
        Object.keys(state)
            .sort()
            .filter((el) => !STORE_KEYS.includes(el))
            .forEach((el, index) => {
                if (values[index] === ".") state[el] = true;
                else if (values[index] === "-") state[el] = false;
                else state[el] = values[index];
                storeIndex = index + 1;
            });
        if (storeIndex < values.length) {
            for (let i = storeIndex; i < values.length; i++) {
                const storeName = values[i];
                state[storeName] = !stores[storeName].defaultChecked;
            }
        }
        this.state = state;
    }
}

customElements.define("items-filter", ItemsFilter);
