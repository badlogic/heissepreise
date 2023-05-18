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
                changedItems.push(item);
            }
        }
    }

    const table = document.querySelector("#result");
    table.innerHTML = "";
    table.appendChild(dom("tr", `
        <th>Kette</th><th>Name</th><th>Menge</th><th>Preis</th>
    `));

    for (item of changedItems) {
        table.appendChild(itemToDOM(item));
    }
}

load();