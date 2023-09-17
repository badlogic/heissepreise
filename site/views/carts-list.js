const { downloadJSON, dom } = require("../js/misc");
const { View } = require("./view");
const { __ } = require("../browser_i18n");

class CartsList extends View {
    constructor() {
        super();
        this.innerHTML = /*html*/ `
            <table class="w-full">
                <thead>
                    <tr class="bg-primary text-left hidden md:table-row uppercase text-sm text-white">
                        <th class="px-2">${__("CartsList_Name")}</th>
                        <th class="px-2">${__("CartsList_Produkte")}</th>
                        <th class="px-2">${__("CartsList_Preis")}</th>
                        <th class="px-2"></th>
                    </tr>
                </thead>
                <tbody x-id="tableBody">
                </tbody>
            </table>
        `;

        this._cartTemplate = dom(
            "tr",
            /*html*/ `
            <td class="px-2 col-span-3">
                <a x-id="name" class="hover:underline"></a>
            </td>
            <td class="px-2">
                <span class="md:hidden text-sm">${__("CartsList_Produkte")}: </span>
                <span x-id="numProducts"></span>
            </td>
            <td class="px-2 col-span-2">
                <span class="md:hidden text-sm">${__("CartsList_Preisänderungen")}: </span>
                <span x-id="price"></span>
            </td>
            <td class="px-2 col-span-3">
                <div class="flex gap-4">
                    <a x-id="share" class="text-primary hover:underline text-sm font-medium">${__("CartsList_Teilen")}</a>
                    <a x-id="json" class="text-primary hover:underline text-sm font-medium" href="">${__("CartsList_JSON")}</a>
                    <input x-id="delete" class="ml-auto text-red-500 hover:underline text-sm font-medium" type="button" value="${__(
                        "CartsList_Löschen"
                    )}">
                </div>
            </td>
        `
        );
        this._cartTemplate.setAttribute("class", "grid grid-cols-3 hover:bg-gray-100 border border-gray-200 rounded-md p-2 md:table-row");
    }

    render() {
        const model = this._model;
        const tableBody = this.elements.tableBody;
        tableBody.innerHTML = "";

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

            const cartListItem = this._cartTemplate.cloneNode(true);
            const elements = View.elements(cartListItem);
            elements.name.href = cartUrl;
            elements.name.innerText = cart.name;
            elements.numProducts.innerText = cart.items.length;
            elements.price.innerText = `${currPrice.toFixed(2)} ${(increase > 0 ? "+" : "") + increase + "%"}`;
            elements.price.style.color = currPrice > oldPrice ? "red" : "green";
            elements.share.href = shareLink;
            elements.json.addEventListener("click", (event) => {
                event.preventDefault();
                downloadJSON(cart.name + ".json", cart);
            });
            if (cart.name === "Momentum Eigenmarken Vergleich") {
                elements.delete.classList.add("hidden");
            } else {
                elements.delete.addEventListener("click", () => model.remove(cart.name));
            }
            tableBody.append(cartListItem);
        }
    }
}

customElements.define("carts-list", CartsList);
