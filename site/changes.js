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
    document.querySelector("#increases").addEventListener("change", () => {
        showResults(items, dateSelection.value);
    })
    document.querySelector("#decreases").addEventListener("change", () => {
        showResults(items, dateSelection.value);
    })
}

function showResults(items, today) {
    const increases = document.querySelector("#increases").checked;
    const decreases = document.querySelector("#decreases").checked;
    const fullHistory = document.querySelector("#fullhistory").checked;
    const changedItems = [];
    for (item of items) {
        if (item.priceHistory.length < 2) continue;

        for (let i = 0; i < item.priceHistory.length; i++) {
            if (item.priceHistory[i].date == today && i + 1 < item.priceHistory.length) {
                if (increases && (item.priceHistory[i].price > item.priceHistory[i + 1].price)) changedItems.push(item);
                if (decreases && (item.priceHistory[i].price < item.priceHistory[i + 1].price)) changedItems.push(item);
            }
        }
    }

    const table = document.querySelector("#result");
    table.innerHTML = "";
    const header = dom("tr", `
        <th>Kette</th><th>Name</th><th>Menge</th><th>Preis 📈</th>
    `)
    const showHideAll = header.querySelectorAll('th:nth-child(4)')[0];
    showHideAll.style["cursor"] = "pointer";
    showHideAll.showAll = true;
    showHideAll.addEventListener("click", () => {
        table.querySelectorAll(".priceinfo").forEach(el => showHideAll.showAll ? el.classList.remove("hide") : el.classList.add("hide"));
        showHideAll.showAll = !showHideAll.showAll;
    })

    table.appendChild(header);

    for (item of changedItems) {
        item = JSON.parse(JSON.stringify(item));
        if (!fullHistory) {
            let priceHistory = [];
            for(let i = 0;i < item.priceHistory.length; i++) {
                priceHistory.push(item.priceHistory[i]);
                if (item.priceHistory[i].date == today) break;
            }
        }
        table.appendChild(itemToDOM(item));
    }
}

load();