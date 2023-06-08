const { downloadJSON, dom, getDynamicElements } = require("../misc");
const { View } = require("./view");

class CartsList extends View {
    constructor() {
        super();
        this.innerHTML = /*html*/ `
            <table class="w-full">
                <thead>
                    <tr class="bg-primary text-left hidden md:table-row uppercase text-sm text-white">
                        <th class="px-2">Name</th>
                        <th class="px-2">Produkte</th>
                        <th class="px-2">Preis</th>
                        <th class="px-2">Aktionen</th>
                    </tr>
                </thead>
                <tbody>
                </tbody>
            </table>
        `;
        this._tableBody = this.querySelector("tbody");

        this._cartsListItemTemplate = dom(
            "tr",
            /*html*/ `
            <td class="px-2 col-span-3" data-label="Name">
                <a x-id="name" class="hover:underline"></a>
            </td>
            <td class="px-2" data-label="Produkte">
                <span class="md:hidden text-sm">Produkte: </span>
                <span x-id="numProducts"></span>
            </td>
            <td class="px-2 col-span-2" data-label="Preis">
                <span class="md:hidden text-sm">Preisänderungen: </span>
                <span x-id="price"></span>
            </td>
            <td class="px-2 col-span-3">
                <div class="flex gap-4">
                    <a x-id="share" class="text-primary hover:underline text-sm font-medium">Teilen</a>
                    <a x-id="json" class="text-primary hover:underline text-sm font-medium" href="">JSON</a>
                    <input x-id="delete" class="ml-auto text-red-500 hover:underline text-sm font-medium" type="button" value="Löschen">
                </div>
            </td>
        `
        );
        this._cartsListItemTemplate.classList.add(
            "grid",
            "grid-cols-3",
            "hover:bg-gray-100",
            "border",
            "border-gray-200",
            "rounded-md",
            "p-2",
            "md:table-row"
        );
    }

    render(model) {
        this._tableBody.innerHTML = "";

        for (const cart of model.carts) {
            let oldPrice = 0;
            let currPrice = 0;
            let shareLink = "cart.html?cart=" + encodeURIComponent(cart.name) + ";";
            for (const item of cart.items) {
                oldPrice += item.priceHistory[item.priceHistory.length - 1].price;
                currPrice += item.priceHistory[0].price;
                shareLink += item.store + item.id + ";";
            }
            const increase = oldPrice != 0 ? Math.round(((currPrice - oldPrice) / oldPrice) * 100) : 0;
            const cartUrl = `cart.html?name=${encodeURIComponent(cart.name)}`;

            const cartListItem = this._cartsListItemTemplate.cloneNode(true);
            const elements = getDynamicElements(cartListItem);
            elements.name.href = cartUrl;
            elements.name.innerText = cart.name;
            elements.numProducts.innerText = cart.items.length;
            elements.price.innerText = `${currPrice.toFixed(2)} ${(increase > 0 ? "+" : "") + increase + "%"}`;
            elements.price.style.color = currPrice > oldPrice ? "red" : "green";
            elements.share.href = shareLink;
            elements.json.addEventListener("click", () => {
                event.preventDefault();
                downloadJSON(cart.name + ".json", cart);
            });
            if (cart.name === "Momentum Eigenmarken Vergleich") {
                elements.delete.classList.add("hidden");
            } else {
                elements.delete.addEventListener("click", () => model.remove(cart.name));
            }
            this._tableBody.append(cartListItem);
        }
    }
}

customElements.define("carts-list", CartsList);
