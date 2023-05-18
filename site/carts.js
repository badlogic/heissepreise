let items = [];

async function load() {
    const response = await fetch("api/index")
    items = await response.json();

    const newCartButton = document.querySelector("#newcart");
    newCartButton.addEventListener("click", () => {
        let name = prompt("Name für Warenkorb eingeben:");
        if (name.length == 0) return;
        for (cart of carts) {
            if (cart.name == name) {
                alert("Warenkorb mit Namen '" + name + "' existiert bereits");
                return;
            }
        }
        addCart(name);
        location.href = "/cart.html?name=" + name;
    });

    showCarts();
}

function showCarts() {
    const cartsTable = document.querySelector("#carts");
    cartsTable.innerHTML = "";
    cartsTable.appendChild(dom("tr", `
        <th>Name</th>
        <th>Produkte</th>
        <th>Gesamtpreis</th>
    `));

    for (cart of carts) {
        const row = dom("tr", ``);
        const nameDom = dom("td")
        cartsTable.appendChild(row);
    }
}

load();