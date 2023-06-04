let changeDates = [];
let items = [];

async function load() {
    items = await loadItems();
    items.sort((a, b) => {
        if (a.store < b.store) {
            return -1;
        } else if (a.store > b.store) {
            return 1;
        }

        if (a.name < b.name) {
            return -1;
        } else if (a.name > b.name) {
            return 1;
        }

        return 0;
    });

    const dates = {};
    for (const item of items) {
        if (item.priceHistory.length == 1) continue;
        for (const price of item.priceHistory) {
            dates[price.date] = dates[price.date] ? dates[price.date] + 1 : 1;
        }
    }

    const dateNames = Object.keys(dates).sort((a, b) => b.localeCompare(a));
    const dateSelection = document.querySelector("#dates");
    for (const dateName of dateNames) {
        const option = dom("option", dateName + " (" + dates[dateName] + ")");
        option.setAttribute("value", dateName);
        dateSelection.appendChild(option);
    }

    showResults(items, dateNames[0]);

    dateSelection.addEventListener("change", () => {
        showResults(items, dateSelection.value);
    });
    document.querySelector("#increases").addEventListener("change", () => {
        showResults(items, dateSelection.value);
    });
    document.querySelector("#decreases").addEventListener("change", () => {
        showResults(items, dateSelection.value);
    });
}

function filter(items, today) {
    const increases = document.querySelector("#increases").checked;
    const decreases = document.querySelector("#decreases").checked;
    const changedItems = [];
    for (const item of items) {
        for (let i = 0; i < item.priceHistory.length; i++) {
            if (item.priceHistory[i].date == today && i + 1 < item.priceHistory.length) {
                if (increases && item.priceHistory[i].price > item.priceHistory[i + 1].price) changedItems.push(item);
                if (decreases && item.priceHistory[i].price < item.priceHistory[i + 1].price) changedItems.push(item);
            }
        }
    }
    return changedItems;
}

function showResults(items, today) {
    const fullHistory = document.querySelector("#fullhistory").checked;
    const changedItems = filter(items, today);
    const table = document.querySelector("#result");
    table.innerHTML = "";
    const header = dom(
        "thead",
        `
        <tr><th>Kette</th><th>Name</th><th>Menge</th><th>Preis <span class="expander">+</span></th></tr>
    `
    );
    const showHideAll = header.querySelectorAll("th:nth-child(4)")[0];
    showHideAll.style["cursor"] = "pointer";
    showHideAll.showAll = true;
    showHideAll.addEventListener("click", () => {
        showHideAll.querySelector(".expander").innerText = showHideAll.querySelector(".expander").innerText == "+" ? "-" : "+";
        table.querySelectorAll(".priceinfo").forEach((el) => (showHideAll.showAll ? el.classList.remove("hide") : el.classList.add("hide")));
        showHideAll.showAll = !showHideAll.showAll;
    });

    table.appendChild(header);

    for (let item of changedItems) {
        item = JSON.parse(JSON.stringify(item));
        if (!fullHistory) {
            let priceHistory = [];
            for (let i = 0; i < item.priceHistory.length; i++) {
                priceHistory.push(item.priceHistory[i]);
                if (item.priceHistory[i].date == today) break;
            }
        }
        table.appendChild(itemToDOM(item));
    }
    document.querySelector("#results").innerText = "Resultate: " + changedItems.length;
}
load();
