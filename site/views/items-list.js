const { downloadJSON, dom, getDynamicElements } = require("../misc");
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
                    <th class="text-center">Kette</th>
                    <th>Name</th>
                    <th>Preis <span x-id="expandPrices">+</span></th>
                    <th></th>
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
                <table class="priceinfo hidden" aria-hidden="true">
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

    render() {
        const items = model.items;
    }
}

customElements.define("items-list", ItemsList);
