const { downloadJSON, dom, onVisibleOnce, isMobile, getBooleanAttribute, deltaTime, log } = require("../js/misc");
const { vectorizeItems, similaritySortItems } = require("../js/knn");
const { stores } = require("../model/stores");
const { View } = require("./view");
const { ItemsChart } = require("./items-chart");

class ItemsList extends View {
    constructor() {
        super();

        this._json = getBooleanAttribute(this, "json");
        this._chart = getBooleanAttribute(this, "chart");
        this._remove = getBooleanAttribute(this, "remove");
        this._add = getBooleanAttribute(this, "add");
        this._updown = getBooleanAttribute(this, "updown");
        this._noSort = getBooleanAttribute(this, "nosort");
        const hideSort = this._noSort ? "hidden" : "";

        this.innerHTML = /*html*/ `
            <div x-id="options" class="hidden flex flex-col md:flex-row gap-4 px-4 py-2 my-4 justify-between items-center text-sm border rounded-xl md:mt-8 md:rounded-b-none md:mb-0 bg-gray-100 ">
                <div>
                    <div class="flex flex-col md:flex-row gap-2 items-center">
                        <span x-id="numItemsLabel">Resultate</span><span x-id="numItems"></span>
                        <span>
                            <a x-id="json" class="hidden text-primary font-medium hover:underline" href="">JSON</a>
                        </span>
                        <custom-checkbox x-id="enableChart" x-change x-state label="Diagramm" class="${
                            this._chart ? "" : "hidden"
                        }"></custom-checkbox>
                    </div>
                </div>
                <label class="${hideSort}">
                    Sortieren
                    <select x-id="sort" x-change x-state>
                        <option value="price-asc">Preis aufsteigend</option>
                        <option value="price-desc">Preis absteigend</option>
                        <option value="quantity-asc">Menge aufsteigend</option>
                        <option value="quantity-desc">Menge absteigend</option>
                        <option value="store-and-name">Kette &amp; Name</option>
                        <option value="name-similarity" x-id="nameSimilarity" disabled>Namensähnlichkeit</option>
                    </select>
                </label>
            </div>
            <items-chart x-id="chart" class="hidden"></items-chart>
            <table x-id="itemsTable" class="hidden rounded-b-xl overflow-hidden w-full text-left">
                <thead>
                    <tr class="bg-primary text-white md:table-row uppercase text-sm">
                        <th class="text-center">Kette</th>
                        <th>Name</th>
                        <th x-id="expandPriceHistories" class="cursor-pointer">Preis +</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody x-id="tableBody" >
                </tbody>
            </table>
        `;

        const elements = this.elements;

        if (this._share) elements.shareLink.classList.remove("hidden");
        if (this._json) elements.json.classList.remove("hidden");
        if (this._chart) elements.enableChart.classList.remove("hidden");

        elements.json.addEventListener("click", (event) => {
            event.preventDefault();
            if (!this.model) return;
            this.download(this.model.filteredItems);
        });

        elements.enableChart.addEventListener("change", () => {
            if (elements.enableChart.checked) elements.chart.classList.remove("hidden");
            else elements.chart.classList.add("hidden");
        });

        // Cache in a field, so we don't have to call this.elements in each renderItem() call.
        this._showAllPriceHistories = false;
        elements.expandPriceHistories.addEventListener("click", () => {
            const showAll = (this._showAllPriceHistories = !this._showAllPriceHistories);
            elements.expandPriceHistories.innerText = showAll ? "Preis -" : "Preis +";
            elements.tableBody.querySelectorAll(".priceinfo").forEach((el) => (showAll ? el.classList.remove("hidden") : el.classList.add("hidden")));
        });

        this.setupEventHandlers();

        this.addEventListener("x-change", (event) => {
            if (this._ignoreChange) {
                this._ignoreChange = false;
                return;
            }
            this.render();
        });
    }

    set model(model) {
        super.model = model;
        this.elements.chart.model = model;
    }

    get model() {
        return super.model;
    }

    download(items) {
        const cleanedItems = [];
        items.forEach((item) => {
            cleanedItems.push({
                store: item.store,
                id: item.id,
                name: item.name,
                price: item.price,
                priceHistory: item.priceHistory,
                isWeighted: item.isWeighted,
                unit: item.unit,
                quantity: item.quantity,
                bio: item.bio,
                url: item.url,
            });
        });
        downloadJSON("items.json", cleanedItems);
    }

    sort(items) {
        const sortType = this.elements.sort.value;
        if (sortType == "price-asc") {
            items.sort((a, b) => a.price - b.price);
        } else if (sortType == "price-desc") {
            items.sort((a, b) => b.price - a.price);
        } else if (sortType == "quantity-asc") {
            items.sort((a, b) => {
                if (a.unit != b.unit) return a.unit.localeCompare(b.unit);
                return a.quantity - b.quantity;
            });
        } else if (sortType == "quantity-desc") {
            items.sort((a, b) => {
                if (a.unit != b.unit) return a.unit.localeCompare(b.unit);
                return b.quantity - a.quantity;
            });
        } else if (sortType == "store-and-name") {
            items.sort((a, b) => {
                if (a.store < b.store) {
                    return -1;
                } else if (a.store > b.store) {
                    return 1;
                }

                if (a.name < b.name) {
                    return -1;
                } else if (a.name > b.name) {
                    return 1;
                }

                return 0;
            });
        } else {
            vectorizeItems(items);
            items = similaritySortItems(items);
        }
        return items;
    }

    renderItem(item) {
        if (!this._itemTemplate) {
            this._itemTemplate = dom(
                "tr",
                /*html*/ `
                <td x-id="store" data-label="Kette"></td>
                <td data-label="Name">
                    <div class="flex items-center">
                        <a x-id="name" target="_blank" class="hover:underline" rel="noopener noreferrer nofollow" href=""></a>
                        <small x-id="quantity" class="ml-auto"></small>
                    </div>
                    <table x-id="priceHistory" class="priceinfo hidden" aria-hidden="true">
                    </table>
                </td>
                <td data-label="Preis">
                    <span x-id="price"></span>
                    <span x-id="percentageChange"></span>
                    <span x-id="numPrices"></span>
                    <span class="chevron">▼</span>
                </td>
                <td class="action">
                    <label x-id="chart" class="${this._chart ? "" : "hidden"}">
                        <input x-id="chartCheckbox" type="checkbox" class="hidden peer">
                        <span class="peer-checked:bg-blue-700 btn-action">📈</span>
                    </label>
                    <input x-id="add" type="button" class="${this._add ? "" : "hidden"} btn-action" value="+">
                    <input x-id="remove" type="button" class="${this._remove ? "" : "hidden"} btn-action" value="-">
                    <input x-id="up" type="button" class="${this._updown ? "" : "hidden"} btn-action" value="▲">
                    <input x-id="down" type="button" class="${this._updown ? "" : "hidden"} btn-action" value="▼">
                </td>
            `
            );
        }

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

            priceHistory += `
                    <tr>
                        <td>${date}</td>
                        <td>
                            <div style="width: ${priceBase * currPrice}px"
                                class="price-line ${increase > 0 ? "bg-red-500" : "bg-green-500"}">
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

        let itemDom = this._itemTemplate.cloneNode(true);
        itemDom.setAttribute(
            "class",
            `item group ${stores[item.store]?.color} ${percentageChange > 0 ? "increased" : percentageChange < 0 ? "decreased" : "neutral"}`
        );
        itemDom.setAttribute("x-notraverse", "true");
        const elements = View.elements(itemDom);
        elements.store.innerText = item.store;
        elements.name.href = item.url;
        elements.name.innerText = item.name;
        elements.quantity.innerText = (item.isWeighted ? "⚖ " : "") + `${quantity} ${unit}`;
        elements.price.innerText = `€ ${Number(item.price).toFixed(2)}`;
        elements.priceHistory.innerHTML = priceHistory;
        elements.percentageChange.classList.add(percentageChange > 0 ? "text-red-500" : percentageChange < 0 ? "text-green-500" : "hidden");
        elements.percentageChange.innerText = `${percentageChange > 0 ? "+" + percentageChange : percentageChange}%`;
        elements.numPrices.innerText = item.priceHistory.length > 1 ? "(" + (item.priceHistory.length - 1) + ")" : "";
        itemDom.querySelectorAll('td[data-label="Preis"]').forEach((priceDom) => {
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

        if (this._chart) {
            elements.chartCheckbox.checked = item.chart;
            elements.chartCheckbox.addEventListener("change", (event) => {
                item.chart = elements.chartCheckbox.checked;
                if (item.chart && !this.elements.enableChart.checked) {
                    this.elements.enableChart.checked = true;
                    this.elements.chart.classList.remove("hidden");
                }
                this.elements.chart.render();
                this._ignoreChange = true;
                this.fireChangeEvent();
            });
        }

        if (this.model.items.length != this.model.filteredItems.length) {
            elements.up.classList.add("hidden");
            elements.down.classList.add("hidden");
        }

        elements.add.addEventListener("click", () => {
            if (this._addCallback) this._addCallback(item);
        });

        elements.remove.addEventListener("click", () => {
            let index = this.model.items.indexOf(item);
            if (index >= 0) this.model.items.splice(index, 1);
            index = this.model.filteredItems.indexOf(item);
            if (index >= 0) this.model.filteredItems.splice(index, 1);
            itemDom.remove();
            this.elements.chart.render();

            if (this._removeCallback) this._removeCallback(item);
        });

        elements.up.addEventListener("click", () => {
            const index = itemDom.rowIndex - 1;
            if (index == 0) return;
            let otherItem = this.model.items[index - 1];
            this.model.items[index - 1] = item;
            this.model.items[index] = otherItem;

            let rowBefore = this.elements.tableBody.rows[index - 1];
            this.elements.tableBody.insertBefore(itemDom, rowBefore);

            if (this._upCallback) this._upCallback(item);
        });

        elements.down.addEventListener("click", () => {
            const index = itemDom.rowIndex - 1;
            if (index == this.model.items.length - 1) return;
            let otherItem = this.model.items[index + 1];
            this.model.items[index + 1] = item;
            this.model.items[index] = otherItem;

            let rowAfter = this.elements.tableBody.rows[index + 1];
            this.elements.tableBody.insertBefore(rowAfter, itemDom);

            if (this._downCallback) this._downCallback(item);
        });

        if (this._showAllPriceHistories) elements.priceHistory.classList.remove("hidden");
        return itemDom;
    }

    render() {
        const start = performance.now();
        const elements = this.elements;
        if (this.model.filteredItems.length != 0 && this.model.filteredItems.length <= (isMobile() ? 200 : 1500)) {
            elements.nameSimilarity.removeAttribute("disabled");
        } else {
            elements.nameSimilarity.setAttribute("disabled", "true");
            if (this.model.filteredItems.length != 0 && elements.sort.value == "name-similarity") elements.sort.value = "price-asc";
        }

        let items = [...this.model.filteredItems];
        if (this.model.lastQuery && this.model.lastQuery.charAt(0) == "!") {
            elements.sort.parentElement.classList.add("hidden");
        } else {
            if (!this._noSort) {
                elements.sort.parentElement.classList.remove("hidden");
                items = this.sort(items);
            }
        }
        if (items.length == 0) {
            elements.chart.classList.add("hidden");
            elements.options.classList.add("hidden");
            elements.itemsTable.classList.add("hidden");
        } else {
            if (elements.enableChart.checked) elements.chart.classList.remove("hidden");
            elements.options.classList.remove("hidden");
            elements.itemsTable.classList.remove("hidden");
        }
        elements.numItems.innerHTML = items.length + (this.model.totalItems > items.length ? " / " + this.model.totalItems : "");
        const tableBody = elements.tableBody;
        tableBody.innerHTML = "";

        let i = 0;
        const batches = [];
        let batch = [];
        items.forEach((item, index) => {
            if (batch.length == 100) {
                batches.push(batch);
                batch = [];
            }
            batch.push(item);
        });
        if (batch.length > 0) batches.push(batch);

        const renderBatch = () => {
            const batch = batches.shift();
            if (!batch) return;
            let itemDom = null;
            for (const item of batch) {
                itemDom = this.renderItem(item);
                tableBody.append(itemDom);
            }
            if (itemDom) onVisibleOnce(itemDom, renderBatch);
        };

        renderBatch();

        log(`ItemsList - rendering ${items.length} items took ${deltaTime(start).toFixed(4)} secs`);
    }

    set addCallback(callback) {
        this._addCallback = callback;
    }

    set removeCallback(callback) {
        this._removeCallback = callback;
    }

    set upCallback(callback) {
        this._upCallback = callback;
    }

    set downCallback(callback) {
        this._downCallback = callback;
    }
}

customElements.define("items-list", ItemsList);
