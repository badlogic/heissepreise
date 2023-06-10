const { today, dom, getBooleanAttribute } = require("../misc");
const { stores, STORE_KEYS, BUDGET_BRANDS } = require("../model/stores");
const { View } = require("./view");

class ItemsFilter extends View {
    constructor() {
        super();

        this._hidePriceChanges = getBooleanAttribute(this, "pricechanges") ? "" : "hidden";
        this._hidePriceDirection = getBooleanAttribute(this, "pricedirection") ? "" : "hidden";
        this._hideStores = getBooleanAttribute(this, "stores") ? "" : "hidden";
        this._hideMisc = getBooleanAttribute(this, "misc") ? "" : "hidden";
        this._placeholder = this.hasAttribute("placeholder") ? this.getAttribute("placeholder") : "Produkte suchen... (mind. 3 Zeichen)";

        this.innerHTML = /*html*/ `
            <input x-id="query" x-state class="rounded-lg px-2 py-1 w-full" type="text" placeholder="${this._placeholder}" />

            <div x-id="stores" class="flex justify-center gap-2 flex-wrap mt-4 ${this._hideStores}">
                <custom-checkbox x-id="allStores" label="Alle" checked></custom-checkbox>
                ${STORE_KEYS.map(
                    (store) => /*html*/ `
                        <custom-checkbox
                            x-id="${store}" x-state x-change
                            label="${stores[store].name}"
                            class="${stores[store].color}"
                            checked
                        ></custom-checkbox>`
                ).join("")}
            </div>

            <div x-id="priceChanges" class="text-sm flex justify-center gap-4 mt-4 ${this._hidePriceChanges}">
                <label>
                    <input x-id="priceChangesToday" x-state type="radio" name="type" checked /> Datum
                    <select x-id="priceChangesDate" x-state x-change class="bg-white rounded-full">
                        <option>${today()}</option>
                    </select>
                </label>
                <label>
                    <input x-id="priceChangesSinceLast" x-state type="radio" name="type" /> Billiger seit letzter Änderung
                </label>
            </div>

            <div x-id="priceDirection" class="flex justify-center gap-2 mt-4 ${this._hideMisc ? "" : "mb-4"} ${this._hidePriceDirection}">
                <custom-checkbox x-id="priceIncreased" x-state x-change label="Teurer" checked class="gray"></custom-checkbox>
                <custom-checkbox x-id="priceDecreased" x-state x-change label="Billiger" checked class="gray"></custom-checkbox>
            </div>

            <div x-id="misc" class="flex items-center justify-center flex-wrap gap-2 mt-4 ${this._hideMisc}">
                <custom-checkbox
                    x-id="budgetBrands" x-state x-change
                    label="Nur Diskont-Eigenmarken"
                    abbr="${BUDGET_BRANDS.map((budgetBrand) => budgetBrand.toUpperCase()).join(", ")}"
                ></custom-checkbox>
                <custom-checkbox x-id="bio" x-state x-change label="Nur Bio"></custom-checkbox>
                <custom-checkbox x-id="exact" x-state x-change label="Exaktes Wort"></custom-checkbox>
                <label class="cursor-pointer inline-flex items-center gap-x-1 rounded-full bg-white border border-gray-400 px-2 py-1 text-xs font-medium text-gray-600">
                    Preis € <input x-id="minPrice" x-state x-change class="w-12" type="number" min="0" value="0">
                    -
                    <input x-id="maxPrice" x-state x-change class="w-12" type="number" min="0" value="100">
                </label>
            </div>
        `;
        this.classList.add("items-filter");

        const elements = this.elements;

        const DEBOUNCE_MS = 100;
        let timeoutId;
        elements.query.addEventListener("input", (event) => {
            event.stopPropagation();
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                this.dispatchEvent(
                    new CustomEvent("change", {
                        bubbles: true,
                        cancelable: true,
                    })
                );
            }, DEBOUNCE_MS);
        });

        elements.allStores.addEventListener("change", (event) => {
            event.stopPropagation();
            const checked = elements.allStores.checked;
            STORE_KEYS.forEach((store) => (elements[store].checked = checked));
            this.fireChangeEvent();
        });

        elements.priceChangesToday.addEventListener("change", (event) => {
            event.stopPropagation();
            if (elements.priceChangesToday.checked) elements.priceDirection.classList.remove("hidden");
            else elements.priceDirection.classList.add("hidden");
            this.fireChangeEvent();
        });

        elements.priceChangesSinceLast.addEventListener("change", (event) => {
            event.stopPropagation();
            if (elements.priceChangesSinceLast.checked) elements.priceDirection.classList.add("hidden");
            else elements.priceDirection.classList.remove("hidden");
            this.fireChangeEvent();
        });

        this.setupEventHandlers();
    }

    render() {
        const now = performance.now();
        const elements = this.elements;
        const items = this.model.items;
        const dates = {};
        for (const item of items) {
            if (item.priceHistory.length == 1) continue;
            for (let i = 0; i < item.priceHistory.length; i++) {
                const price = item.priceHistory[i];
                if (i + 1 < item.priceHistory.length) {
                    if (item.priceHistory[i].price != item.priceHistory[i + 1].price)
                        dates[price.date] = dates[price.date] ? dates[price.date] + 1 : 1;
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
        console.log("Rendering items filter took " + (performance.now() - now) / 1000);
    }

    get checkedStores() {
        return STORE_KEYS.filter((store) => elements[store].checked);
    }
}

customElements.define("items-filter", ItemsFilter);
