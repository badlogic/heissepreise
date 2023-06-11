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
        for (let i = 0; i < item.priceHistory.length; i++) {
            const price = item.priceHistory[i];
            if (i + 1 < item.priceHistory.length) {
                if (item.priceHistory[i].price != item.priceHistory[i + 1].price) dates[price.date] = dates[price.date] ? dates[price.date] + 1 : 1;
            }
        }
    }
    const dateNames = Object.keys(dates).sort((a, b) => b.localeCompare(a));

    const dateSelection = document.querySelector("#dates");
    dateNames.forEach((dateName, index) => {
        const option = dom("option", dateName + " (" + dates[dateName] + ")");
        option.setAttribute("value", dateName);
        if (index == 0) option.selected = true;
        dateSelection.appendChild(option);
    });

    document.querySelectorAll("#type").forEach((changeType) => {
        changeType.addEventListener("change", () => showResults(items));
    });

    dateSelection.addEventListener("change", () => {
        showResults(items);
    });

    const filtersStore = document.querySelector("#filters-store");
    filtersStore.innerHTML = `
        ${customCheckbox(`all`, "<strong>Alle</strong>", true, "gray")}
        ${STORE_KEYS.map((store) =>
            customCheckbox(store, stores[store].name, stores[store].name.toLowerCase().endsWith("de") ? false : true, stores[store].color)
        ).join(" ")}
    `;
    filtersStore.querySelector("#all").addEventListener("change", () => {
        const checked = filtersStore.querySelector("#all").checked;
        STORE_KEYS.forEach((store) => (filtersStore.querySelector(`#${store}`).checked = checked));
        showResults(items);
    });

    document.querySelector("#filters-changes").innerHTML = `
        ${customCheckbox(`increases`, "Teurer", true, "gray")}
        ${customCheckbox(`decreases`, "Billiger", true, "gray")}
    `;

    document.querySelectorAll("input").forEach((input) => {
        if (input.id == "all" && input.id != "type") return;
        input.addEventListener("change", () => showResults(items));
    });

    let timeoutId;
    document.querySelector("#filter").addEventListener("input", () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            if (document.querySelector("#filter").value.trim().startsWith("!")) {
                document.querySelector("#filters-store").classList.add("hidden");
                document.querySelector("#filters-changes").classList.add("hidden");
            } else {
                document.querySelector("#filters-store").classList.remove("hidden");
                document.querySelector("#filters-changes").classList.remove("hidden");
            }
            showResults(items);
        }, 50);
    });

    showResults(items);
}

function showResults(items) {
    const query = document.querySelector("#filter").value.trim();
    let today = null;
    if (document.querySelector("#date").checked) {
        today = document.querySelector("#dates").value;
        if (!query.startsWith("!")) document.querySelector("#filters-changes").classList.remove("hidden");
    } else {
        document.querySelector("#filters-changes").classList.add("hidden");
    }
    const increases = document.querySelector("#increases").checked;
    const decreases = document.querySelector("#decreases").checked;
    const storeCheckboxes = STORE_KEYS.map((store) => document.querySelector(`#${store}`));
    const checkedStores = STORE_KEYS.filter((store, i) => storeCheckboxes[i].checked);
    let changedItems = [];
    for (const item of items) {
        if (item.priceHistory.length < 2) continue;
        if (!checkedStores.includes(item.store)) continue;

        if (today) {
            for (let i = 0; i < item.priceHistory.length; i++) {
                if (item.priceHistory[i].date == today && i + 1 < item.priceHistory.length) {
                    if (increases && item.priceHistory[i].price > item.priceHistory[i + 1].price) {
                        changedItems.push(item);
                    }
                    if (decreases && item.priceHistory[i].price < item.priceHistory[i + 1].price) {
                        changedItems.push(item);
                    }
                }
            }
        } else {
            if (item.priceHistory[0].price < item.priceHistory[1].price) changedItems.push(item);
        }
    }

    const total = changedItems.length;
    if (query.startsWith("!") || query.length >= 3)
        changedItems = searchItems(changedItems, document.querySelector("#filter").value, checkedStores, false, 0, 10000, false, false);
    document.querySelector("#numresults").innerText = "Resultate: " + changedItems.length + (total > changedItems.length ? " / " + total : "");
    const table = document.querySelector("#result");
    table.innerHTML = "";
    if (changedItems.length == 0) return;
    const header = dom(
        "thead",
        `<tr>
            <th class="text-center">Kette</th>
            <th>Name</th>
            <th class="flex text-nowrap">
                <span>Preis </span>
                <span class="expander">+</span>
            </th>
        </tr>
    `
    );
    const showHideAll = header.querySelectorAll("th:nth-child(3)")[0];
    showHideAll.style["cursor"] = "pointer";
    showHideAll.showAll = true;
    showHideAll.addEventListener("click", () => {
        showHideAll.querySelector(".expander").innerText = showHideAll.querySelector(".expander").innerText == "+" ? "-" : "+";
        table.querySelectorAll(".priceinfo").forEach((el) => (showHideAll.showAll ? el.classList.remove("hidden") : el.classList.add("hidden")));
        showHideAll.showAll = !showHideAll.showAll;
    });

    table.appendChild(header);

    for (let item of changedItems) {
        item = JSON.parse(JSON.stringify(item));
        const itemDom = itemToDOM(item);
        table.appendChild(itemDom);
    }

    table.classList.remove("hidden");
}

load();
