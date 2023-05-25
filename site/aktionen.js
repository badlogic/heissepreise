let changeDates = [];
let items = [];

async function load() {
    const today = currentDate();
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

    document.querySelector("#date").innerText = "Preisänderungen am " + currentDate();

    showResults(items, currentDate());

    document.querySelector("#billa").addEventListener("change", () => showResults(items, currentDate()));
    document.querySelector("#hofer").addEventListener("change", () => showResults(items, currentDate()));
    document.querySelector("#spar").addEventListener("change", () => showResults(items, currentDate()));
    document.querySelector("#increases").addEventListener("change", () => showResults(items, currentDate()));
    document.querySelector("#decreases").addEventListener("change", () => showResults(items, currentDate()));
    document.querySelector("#filter").addEventListener("input", () => showResults(items, currentDate()));
}

function showResults(items, today) {
    const increases = document.querySelector("#increases").checked;
    const decreases = document.querySelector("#decreases").checked;
    const billa = document.querySelector("#billa").checked;
    const spar = document.querySelector("#spar").checked;
    const hofer = document.querySelector("#hofer").checked;
    let changedItems = [];
    for (item of items) {
        if (item.priceHistory.length < 2) continue;

        for (let i = 0; i < item.priceHistory.length; i++) {
            if (item.store == "billa" && !billa) continue;
            if (item.store == "spar" && !spar) continue;
            if (item.store == "hofer" && !hofer) continue;

            if (item.priceHistory[i].date == today && i + 1 < item.priceHistory.length) {
                if (increases && (item.priceHistory[i].price > item.priceHistory[i + 1].price)) changedItems.push(item);
                if (decreases && (item.priceHistory[i].price < item.priceHistory[i + 1].price)) changedItems.push(item);
            }
        }
    }
    const query = document.querySelector("#filter").value.trim();
    if (query.length >= 3) changedItems = searchItems(changedItems, document.querySelector("#filter").value, billa, spar, hofer, false, 0, 10000, false, false);

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
        const itemDom = itemToDOM(item);
        table.appendChild(itemDom);
    }
}

load();