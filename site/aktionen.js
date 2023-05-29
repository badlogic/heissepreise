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

    const filtersStore = document.querySelector("#filters-store");
    filtersStore.innerHTML = STORE_KEYS.map(store => `<label><input id="${store}" type="checkbox" checked="true">${stores[store].name}</label>`).join(" ");
    filtersStore.querySelectorAll("input").forEach(input => {
        input.addEventListener("change", () => showResults(items, currentDate()));
    });
    document.querySelector("#filters-changes").querySelectorAll("input").forEach(input => {
        input.addEventListener("change", () => showResults(items, currentDate()));
    });
    showResults(items, currentDate());
}

function showResults(items, today) {
    const increases = document.querySelector("#increases").checked;
    const decreases = document.querySelector("#decreases").checked;
    const storeCheckboxes = STORE_KEYS.map(store => document.querySelector(`#${store}`));
    const checkedStores = STORE_KEYS.filter((store, i) => storeCheckboxes[i].checked)
    let changedItems = [];
    for (item of items) {
        if (item.priceHistory.length < 2) continue;

        for (let i = 0; i < item.priceHistory.length; i++) {
            if (!checkedStores.includes(item.store)) continue;

            if (item.priceHistory[i].date == today && i + 1 < item.priceHistory.length) {
                if (increases && (item.priceHistory[i].price > item.priceHistory[i + 1].price)) changedItems.push(item);
                if (decreases && (item.priceHistory[i].price < item.priceHistory[i + 1].price)) changedItems.push(item);
            }
        }
    }
    const query = document.querySelector("#filter").value.trim();
    if (query.length >= 3) changedItems = searchItems(changedItems, document.querySelector("#filter").value, checkedStores, false, 0, 10000, false, false);

    const table = document.querySelector("#result");
    table.innerHTML = "";
    const header = dom("thead", `
        <tr><th>Kette</th><th>Name</th><th>Menge</th><th>Preis 📈</th></tr>
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