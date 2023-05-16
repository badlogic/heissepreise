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

async function load() {
    let response = await fetch("api/changes")
    items = await response.json();    

    document.querySelector("#date").innerText = "Preisänderungen " + currentDate();

    const table = document.querySelector("#result");
    table.innerHTML = "";    
    table.appendChild(dom("tr", `
        <th>Kette</th><th>Name</th><th>Menge</th><th>Preis alt</th><th>Preis neu</th>
    `));

    for (item of items) {
        table.appendChild(dom("tr", `
        <td>${item.store}</td>
        <td>${item.name}</td>
        <td>${item.unit ? item.unit : ""}</td>
        <td>${item.oldPrice.price}</td>
        <td style="color: ${item.oldPrice.price < item.newPrice.price ? "red" : "green"}">${item.newPrice.price}</td>
        `));
    }
}

load();