const { downloadJSON, dom, getDynamicElements, onVisibleOnce } = require("../misc");
const { stores } = require("../model/stores");
const { View } = require("./view");

class ItemsList extends View {
    constructor() {
        super();

        this.innerHTML = /*html*/ `
            <div class="flex flex-col md:flex-row gap-4 px-4 py-2 my-4 justify-between items-center text-sm border rounded-xl md:mt-8 md:rounded-b-none md:mb-0 bg-gray-100 ">
                <div>
                    <div class="flex flex-col md:flex-row gap-2 items-center">
                        <span x-id="numItems"></span>
                        <span>
                            <a x-id="shareLink" class="querylink text-primary font-medium hover:underline">Teilen</a>
                            <a x-id="json" class="text-primary font-medium hover:underline" href="">JSON</a>
                        </span>
                        <custom-checkbox x-id="chart" label="Diagramm"></custom-checkbox>
                    </div>
                </div>
                <label>
                    Sortieren
                    <select x-id="sort">
                        <option value="price-asc">Preis aufsteigend</option>
                        <option value="price-desc">Preis absteigend</option>
                        <option value="quantity-asc">Menge aufsteigend</option>
                        <option value="quantity-desc">Menge absteigend</option>
                        <option value="name-similarity">Namensähnlichkeit</option>
                    </select>
                </label>
            </div>
            <table class="rounded-b-xl overflow-hidden w-full text-left">
                <thead>
                    <tr class="bg-primary text-white hidden md:table-row uppercase text-sm">
                        <th class="text-center">Kette</th>
                        <th>Name</th>
                        <th class="cursor-pointer">Preis <span x-id="expandPrices">+</span></th>
                        <th></th>
                    </tr>
                </thead>
                <tbody x-id="tableBody" >
                </tbody>
            </table>
        `;

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
        `
        );
    }

    renderItem(item) {
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
        const elements = getDynamicElements(itemDom);
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
        return itemDom;
    }

    render() {
        const items = this.model.filteredItems;
        const elements = this.elements;
        elements.numItems.innerHTML =
            "<strong>Resultate:</strong> " + items.length + (this.model.totalItems > items.length ? " / " + this.model.totalItems : "");
        const tableBody = elements.tableBody;
        tableBody.innerHTML = "";

        const now = performance.now();
        let i = 0;
        const batches = [];
        let batch = [];
        for (const item of items) {
            if (batch.length == 100) {
                batches.push(batch);
                batch = [];
            }
            batch.push(item);
        }
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

        console.log("Rendering items list took " + ((performance.now() - now) / 1000).toFixed(4) + " secs");
    }
}

customElements.define("items-list", ItemsList);
