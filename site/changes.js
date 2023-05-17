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

let changeDates = [];
let items = [];

async function load() {
    const today = currentDate();
    const response = await fetch("api/index")
    items = await response.json();

    const dates = {};
    for (item of items) {
        for (price of item.priceHistory) {
            dates[price.date] = dates[price.date] ? dates[price.date] + 1 : 1;
        }
    }

    const dateNames = Object.keys(dates).sort((a, b) => b.localeCompare(a));
    const dateSelection = document.querySelector("#dates");
    for (dateName of dateNames) {
        const option = dom("option", dateName + " (" + dates[dateName] + ")");
        option.setAttribute("value", dateName);
        dateSelection.appendChild(option);
    }

    showResults(items, dateNames[0]);

    dateSelection.addEventListener("change", () => {
        showResults(items, dateSelection.value);
    })
}

function showResults(items, today) {
    const changedItems = [];
    for (item of items) {
        if (item.priceHistory.length < 2) continue;

        for (let i = 0; i < item.priceHistory.length; i++) {
            if (item.priceHistory[i].date == today && i + 1 < item.priceHistory.length) {
                changedItems.push({
                    store: item.store,
                    name: item.name,
                    unit: item.unit,
                    oldPrice: item.priceHistory[i + 1].price,
                    newPrice: item.priceHistory[i].price
                });
            }
        }
    }

    const table = document.querySelector("#result");
    table.innerHTML = "";
    table.appendChild(dom("tr", `
        <th>Kette</th><th>Name</th><th>Menge</th><th>Preis alt</th><th>Preis neu</th>
    `));

    for (item of changedItems) {
        table.appendChild(dom("tr", `
        <td>${item.store}</td>
        <td>${item.name}</td>
        <td>${item.unit ? item.unit : ""}</td>
        <td>${item.oldPrice}</td>
        <td style="color: ${item.oldPrice < item.newPrice ? "red" : "green"}">${item.newPrice}</td>
        `));
    }
}

load();