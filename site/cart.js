const { getQueryParameter } = require("./misc");
const models = require("./model");
const { Model } = require("./model/model");
const { View } = require("./views/view");
const { STORE_KEYS, stores } = require("./model/stores");
require("./views");

let carts = null;

class CartModel extends Model {
    constructor(cart, linked) {
        super();
        this.cart = cart;
        this.items = cart.items;
        this._filteredItems = [...this.items];
        this.linked = linked;
    }

    get filteredItems() {
        return this._filteredItems;
    }

    set filteredItems(newItems) {
        this._filteredItems = newItems;
        this.notify();
    }
}

class CartHeader extends View {
    constructor() {
        super();
        this.innerHTML = `
            <h1 class="text-2xl font-bold pb-2 pt-8 text-center">
                <span x-id="name"></span>
            </h1>
            <a x-id="share" class="hidden cursor-pointer font-bold text-sm text-primary hover:underline block text-center mt-3">Teilen</a>
            <input x-id="save" class="hidden cursor-pointer font-bold text-sm text-primary block mx-auto mt-3" type="button" value="Speichern">
        `;

        const elements = this.elements;
        elements.save.addEventListener("click", () => {
            const cart = this.model.cart;
            let index = carts.findIndex((c) => c.name === cart.name);
            if (index != -1) {
                if (confirm("Existierenden Warenkorb '" + cart.name + " überschreiben?")) {
                    carts[index] = cart;
                }
            } else {
                carts.push(cart);
            }
            // model.carts.save();
            location.href = "/cart-new.html?name=" + encodeURIComponent(cart.name);
        });
    }

    render() {
        const cart = this.model.cart;
        const elements = this.elements;
        elements.name.innerText = `Warenkorb '${cart.name}'`;
        if (this.model.linked) {
            elements.save.classList.remove("hidden");
        } else {
            elements.share.classList.remove("hidden");
            let link = encodeURIComponent(cart.name) + ";";
            for (const cartItem of cart.items) {
                link += cartItem.store + cartItem.id + ";";
            }
            elements.share.href = "cart-new.html?cart=" + link;
        }
    }
}
customElements.define("cart-header", CartHeader);

function loadCart() {
    let cart = null;
    let linked = false;
    const cartName = getQueryParameter("name");
    if (cartName) {
        for (const c of carts) {
            if (c.name == cartName) {
                cart = c;
                break;
            }
        }
    }

    const cartDesc = getQueryParameter("cart");
    if (cartDesc) {
        let tokens = cartDesc.split(";");
        cart = {
            name: tokens[0],
            items: [],
        };
        for (let i = 1; i < tokens.length; i++) {
            const item = models.items.lookup[tokens[i]];
            if (item) cart.items.push(item);
        }
        linked = true;
    }

    if (cart == null) {
        alert("Warenkorb '" + cartName + "' existiert nicht.");
        location.href = "carts.html";
    }

    return new CartModel(cart, linked);
}

(async () => {
    await models.load();
    carts = models.carts.carts;
    const cart = loadCart();

    const elements = View.elements(document.body);
    const cartHeader = elements.cartHeader;
    cartHeader.model = cart;

    const cartFilter = elements.cartFilter;
    const cartList = cart.linked ? elements.linkedCartList : elements.cartList;
    STORE_KEYS.forEach((store) => {
        cartFilter.elements[store].checked = true;
    });
    cartList.elements.numItemsLabel.innerHTML = "<strong>Artikel:</strong>";
    cartList.model = cartFilter.model = cart;
    cartList.elements.enableChart.checked = true;
    cartList.elements.chart.elements.sumStores.checked = true;
    cartList.fireChangeEvent();
    cartList.elements.chart.fireChangeEvent();

    if (cart.items.length == 0) {
        elements.noItems.classList.remove("hidden");
    } else {
        cartFilter.classList.remove("hidden");
        cartList.classList.remove("hidden");
    }

    cartList.removeCallback = (item) => models.carts.save();
    cartList.upCallback = (item) => models.carts.save();
    cartList.downCallback = (item) => models.carts.save();

    const productsFilter = elements.productsFilter;
    const productsList = elements.productsList;
    productsList.model = productsFilter.model = models.items;
    if (!cart.linked) {
        productsFilter.classList.remove("hidden");
        productsList.classList.remove("hidden");
    }

    productsList.addCallback = (item) => {
        cart.items.push(item);
        models.carts.save();
        cartFilter.filter();
        cartFilter.classList.remove("hidden");
        cartList.classList.remove("hidden");
    };
})();
