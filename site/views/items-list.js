const {
    downloadJSON,
    downloadFile,
    dom,
    onVisibleOnce,
    isMobile,
    getBooleanAttribute,
    deltaTime,
    log,
    itemsToCSV,
    numberToLocale,
} = require("../js/misc");
const { vectorizeItems, similaritySortItems } = require("../js/knn");
const { stores } = require("../model/stores");
const { View } = require("./view");
const { ItemsChart } = require("./items-chart");
const { __ } = require("../browser_i18n");

class ItemsList extends View {
    static priceTypeId = 0;

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
                        <div class="flex flex-row gap-2 items-center">
                            <span x-id="numItemsLabel">${__("ItemsList_Resultate")}</span><span x-id="numItems"></span>
                            <span>
                                <a x-id="json" class="hidden text-primary font-medium hover:underline" href="">JSON</a>
                                <a x-id="csv" class="hidden text-primary font-medium hover:underline" href="">CSV</a>
                            </span>
                            <custom-checkbox x-id="enableChart" x-change x-state label="${__("ItemsList_Diagramm")}" class="${
            this._chart ? "" : "hidden"
        }"></custom-checkbox>
                        </div>
                        <div class="flex flex-row gap-2 items-center">
                            <label><input x-id="salesPrice" x-change x-state type="radio" name="priceType${ItemsList.priceTypeId}" checked> ${__(
            "ItemsList_Verkaufspreis"
        )}</label>
                            <label><input x-id="unitPrice" x-change x-state type="radio" name="priceType${ItemsList.priceTypeId++}"> ${__(
            "ItemsList_Mengenpreis"
        )}</label>
                        </div>
                    </div>
                </div>
                <label class="${hideSort}">
                ${__("ItemsList_Sortieren")}
                    <select x-id="sort" x-change x-state>
                        <option value="price-asc">${__("ItemsList_Preis aufsteigend")}</option>
                        <option value="price-desc">${__("ItemsList_Preis absteigend")}</option>
                        <option value="quantity-asc">${__("ItemsList_Menge aufsteigend")}</option>
                        <option value="quantity-desc">${__("ItemsList_Menge absteigend")}</option>
                        <option value="store-and-name">${__("ItemsList_Kette &amp; Name")}</option>
                        <option value="name-similarity" x-id="nameSimilarity" disabled>${__("ItemsList_Namensähnlichkeit")}</option>
                    </select>
                </label>
            </div>
            <items-chart x-id="chart" class="hidden"></items-chart>
            <table x-id="itemsTable" class="hidden rounded-b-xl overflow-hidden w-full text-left">
                <thead>
                    <tr class="bg-primary text-white md:table-row uppercase text-sm">
                        <th class="text-center">${__("ItemsList_Kette")}</th>
                        <th>${__("ItemsList_Name")}</th>
                        <th x-id="expandPriceHistories" class="cursor-pointer">${__("ItemsList_Preis")} ▼</th>
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
        if (this._json) elements.csv.classList.remove("hidden");
        if (this._chart) elements.enableChart.classList.remove("hidden");

        elements.json.addEventListener("click", (event) => {
            event.preventDefault();
            if (!this.model) return;
            this.download(this.model.filteredItems, true);
        });

        elements.csv.addEventListener("click", (event) => {
            event.preventDefault();
            if (!this.model) return;
            this.download(this.model.filteredItems);
        });

        elements.enableChart.addEventListener("x-change", () => {
            if (elements.enableChart.checked) elements.chart.classList.remove("hidden");
            else elements.chart.classList.add("hidden");
        });

        // Cache in a field, so we don't have to call this.elements in each renderItem() call.
        this._showAllPriceHistories = false;
        elements.expandPriceHistories.addEventListener("click", () => {
            const showAll = (this._showAllPriceHistories = !this._showAllPriceHistories);
            elements.expandPriceHistories.innerText = __("ItemsList_Preis") + (showAll ? " ▲" : " ▼");
            elements.tableBody.querySelectorAll(".priceinfo").forEach((el) => (showAll ? el.classList.remove("hidden") : el.classList.add("hidden")));
        });

        elements.chart.unitPrice = elements.unitPrice.checked;

        elements.unitPrice.addEventListener("change", () => {
            elements.chart.unitPrice = elements.unitPrice.checked;
            elements.chart.render();
        });

        elements.salesPrice.addEventListener("change", () => {
            elements.chart.unitPrice = elements.unitPrice.checked;
            elements.chart.render();
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

    download(items, json) {
        const cleanedItems = [];
        items.forEach((item) => {
            cleanedItems.push({
                store: item.store,
                id: item.id,
                name: item.name,
                category: item.category,
                price: item.price,
                priceHistory: item.priceHistory,
                isWeighted: item.isWeighted,
                unit: item.unit,
                quantity: item.quantity,
                bio: item.bio,
                available: !(item.unavailable ?? false),
                url: stores[item.store].getUrl(item),
            });
        });
        if (json) {
            downloadJSON("items.json", cleanedItems);
        } else {
            downloadFile("items.csv", itemsToCSV(cleanedItems));
        }
    }

    sort(items) {
        const sortType = this.elements.sort.value;
        if (sortType == "price-asc") {
            if (this.elements.salesPrice.checked) items.sort((a, b) => a.price - b.price);
            else items.sort((a, b) => a.unitPrice - b.unitPrice);
        } else if (sortType == "price-desc") {
            if (this.elements.salesPrice.checked) items.sort((a, b) => b.price - a.price);
            else items.sort((a, b) => b.salesPrice - a.salesPrice);
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

    highlightMatches(keywords, name) {
        let highlightedName = name;
        for (let i = 0; i < keywords.length; i++) {
            const string = keywords[i];
            // check if keyword is not preceded by a < or </
            const regex = new RegExp(string, "gi");
            highlightedName = highlightedName.replace(regex, "<strong>$&</strong>");
        }
        return `${highlightedName}`;
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
                <td data-label="Aktionen">
                    <span class="action">
                        <label x-id="chart" class="${this._chart ? "" : "hidden"}">
                            <input x-id="chartCheckbox" type="checkbox" class="hidden peer">
                            <span class="peer-checked:bg-blue-700 btn-action">📈</span>
                        </label>
                        <input x-id="add" type="button" class="${this._add ? "" : "hidden"} btn-action" value="+">
                        <input x-id="remove" type="button" class="${this._remove ? "" : "hidden"} btn-action" value="-">
                        <input x-id="up" type="button" class="${this._updown ? "" : "hidden"} btn-action" value="▲">
                        <input x-id="down" type="button" class="${this._updown ? "" : "hidden"} btn-action" value="▼">
                    </span>
                </td>
            `
            );
        }

        let price = item.priceHistory[0].price;
        let unitPrice = item.priceHistory[0].unitPrice;
        let prevPrice = item.priceHistory[1] ? item.priceHistory[1].price : -1;
        if (this.model.priceChangesToday) {
            // any item we get with this filter will have a history length >= 2
            for (let i = 0; i < item.priceHistory.length; i++) {
                if (item.priceHistory[i].date == this.model.priceChangesToday) {
                    price = item.priceHistory[i].price;
                    unitPrice = item.priceHistory[i].unitPrice;
                    prevPrice = item.priceHistory[i + 1].price;
                    break;
                }
            }
        }

        let quantity = item.quantity || "";
        let unit = item.unit || "";
        if (quantity >= 1000 && (unit === "g" || unit === "ml")) {
            quantity = parseFloat((0.001 * quantity).toFixed(2));
            unit = unit === "ml" ? "l" : "kg";
        }
        let percentageChange = "";
        if (prevPrice != -1) {
            percentageChange = Math.round(((price - prevPrice) / prevPrice) * 100);
        }

        let showUnitPrice = this.elements.unitPrice.checked;
        let priceUnit = "";
        if (showUnitPrice) {
            if (item.unit === "g") priceUnit = " / kg";
            else if (item.unit === "ml") priceUnit = " / l";
            else priceUnit = " / stk";
        }

        let priceHistory = "";
        let priceBase = 150 / (showUnitPrice ? unitPrice : price);

        for (let i = 0; i < item.priceHistory.length; i++) {
            const date = item.priceHistory[i].date;
            const textBold = this.model.priceChangesToday && this.model.priceChangesToday == date ? "bold" : "";
            const currPrice = showUnitPrice ? item.priceHistory[i].unitPrice : item.priceHistory[i].price;
            const lastPrice = item.priceHistory[i + 1]
                ? showUnitPrice
                    ? item.priceHistory[i + 1].unitPrice
                    : item.priceHistory[i + 1].price
                : currPrice;
            const increase = Math.round(((currPrice - lastPrice) / lastPrice) * 100);

            priceHistory += `
                    <tr>
                        <td class="${textBold}">${date}</td>
                        <td>
                            <div style="width: ${priceBase * currPrice}px"
                                class="${textBold} price-line ${increase > 0 ? "bg-red-500" : "bg-green-500"}">
                                € ${currPrice.toFixed(2)} ${priceUnit}
                            </div>
                        </td>
                        ${
                            increase > 0
                                ? `<td class="text-right ${textBold} text-red-500"> + ${increase}%</td>`
                                : increase < 0
                                ? `<td class="text-right ${textBold} text-green-500"> ${increase}%</td>`
                                : `<td class="text-right ${textBold}"> ${increase}%</td>`
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
        elements.name.href = stores[item.store].getUrl(item);
        elements.name.innerHTML = this.highlightMatches(this.model.lastQueryTokens ?? [], item.name) + (item.unavailable ? " 💀" : "");
        elements.quantity.innerText = (item.isWeighted ? "⚖ " : "") + `${quantity} ${unit}`;
        elements.price.innerText = `€ ${Number(showUnitPrice ? unitPrice : price).toFixed(2)} ${priceUnit}`;
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
            if (index === 0) return;
            let otherItem = this.model.items[index - 1];
            this.model.items[index - 1] = item;
            this.model.items[index] = otherItem;

            let rowBefore = this.elements.tableBody.rows[index - 1];
            this.elements.tableBody.insertBefore(itemDom, rowBefore);

            if (this._upCallback) this._upCallback(item);
        });

        elements.down.addEventListener("click", () => {
            const index = itemDom.rowIndex - 1;
            if (index === this.model.items.length - 1) return;
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
        if (!this.model) return;
        elements.chart.unitPrice = elements.unitPrice.checked;
        if (this.model.filteredItems.length != 0 && this.model.filteredItems.length <= (isMobile() ? 200 : 1500)) {
            elements.nameSimilarity.removeAttribute("disabled");
        } else {
            elements.nameSimilarity.setAttribute("disabled", "true");
            if (this.model.filteredItems.length != 0 && elements.sort.value === "name-similarity") elements.sort.value = "price-asc";
        }

        let items = [...this.model.filteredItems];
        if (this.model.lastQuery && this.model.lastQuery.charAt(0) === "!" && this.model.lastQuery.toLowerCase().indexOf("order by") >= 0) {
            elements.sort.parentElement.classList.add("hidden");
        } else {
            if (!this._noSort) {
                elements.sort.parentElement.classList.remove("hidden");
                items = this.sort(items);
            }
        }
        if (items.length === 0) {
            elements.chart.classList.add("hidden");
            elements.options.classList.add("hidden");
            elements.itemsTable.classList.add("hidden");
        } else {
            if (elements.enableChart.checked) elements.chart.classList.remove("hidden");
            elements.options.classList.remove("hidden");
            elements.itemsTable.classList.remove("hidden");
        }
        elements.numItems.innerHTML =
            numberToLocale(items.length) + (this.model.totalItems > items.length ? " / " + numberToLocale(this.model.totalItems) : "");
        const tableBody = elements.tableBody;
        tableBody.innerHTML = "";

        let i = 0;
        const batches = [];
        let batch = [];
        items.forEach((item) => {
            if (batch.length === 25) {
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
