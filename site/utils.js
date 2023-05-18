function currentDate() {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function dom(el, html) {
    let element = document.createElement(el);
    element.innerHTML = html;
    return element;
}

function itemToStoreLink(item) {
    if (item.store == "spar")
        return `<a target="_blank" href="https://www.interspar.at/shop/lebensmittel/search/?q=${encodeURIComponent(item.name)}">${item.name}</a>`;
    if (item.store == "billa")
        return `<a target="_blank" href="https://shop.billa.at/search/results?category=&searchTerm=${encodeURIComponent(item.name)}">${item.name}</a>`;
    if (item.store == "hofer")
        return `<a target="_blank" href="https://www.roksh.at/hofer/angebot/suche/${encodeURIComponent(item.name)}">${item.name}</a>`;
    return item.name;
}

function itemToDOM(item) {
    let storeDom = dom("td", item.store);
    let nameDom = dom("td", itemToStoreLink(item));
    let unitDom = dom("td", item.unit ? item.unit : "");
    let priceDomText = item.price + (item.priceHistory.length > 1 ? (item.priceHistory[0].price > item.priceHistory[1].price ? " 📈" : " 📉") : "");
    let priceDom = dom("td", priceDomText);
    if (item.priceHistory.length > 1) {
        priceDom.style["cursor"] = "pointer";
        priceDom.addEventListener("click", () => {
            if (priceDom.innerHTML == priceDomText) {
                priceDom.innerHTML = priceDomText;
                let pricesText = "";
                for (let i = 0; i < item.priceHistory.length; i++) {
                    const date = item.priceHistory[i].date;
                    const currPrice = item.priceHistory[i].price;
                    const lastPrice = item.priceHistory[i + 1] ? item.priceHistory[i + 1].price : currPrice;
                    const increase = Math.round((currPrice - lastPrice) / lastPrice * 100);
                    let priceColor = "black";
                    if (increase > 0) priceColor = "red";
                    if (increase < 0) priceColor = "green";
                    pricesText += `<br><span style="color: ${priceColor}">${date} ${currPrice} ${increase > 0 ? "+" + increase : increase}%</span>`;
                }
                priceDom.innerHTML += pricesText;
            } else {
                priceDom.innerHTML = priceDomText;
            }
        });
    }
    let row = dom("tr", "");
    row.appendChild(storeDom);
    row.appendChild(nameDom);
    row.appendChild(unitDom);
    row.appendChild(priceDom);
    return row;
}

let carts = [];
loadCarts();

function loadCarts() {
    let val = localStorage.getItem("carts");
    carts = val ? JSON.parse(val) : [];
}

function saveCarts() {
    localStorage.setItem("carts", JSON.stringify(carts, null, 2));
}

function hasCart(name) {
    for (cart of carts) {
        if (cart.name = name) return true;
    }
    return false;
}

function addCart(name) {
    carts.push({
        name: name,
        items: []
    });
    saveCarts();
}

function removeCart(name) {
    carts = carts.filter(cart => cart.name == name);
    saveCarts();
}