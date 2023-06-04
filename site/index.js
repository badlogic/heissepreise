function updateCharts(canvasDom, items) {
    const now = performance.now();
    const sum = document.querySelector("#sum").checked;
    const sumStores = document.querySelector("#sumstores").checked;
    const todayOnly = document.querySelector("#todayonly").checked;
    let startDate = document.querySelector("#start").value;
    let endDate = document.querySelector("#end").value;
    if (start > endDate) {
        let tmp = start;
        start = endDate;
        endDate = tmp;
    }
    showCharts(canvasDom, items, sum, sumStores, todayOnly, startDate, endDate);
    console.log("Updating charts took: " + (performance.now() - now) / 1000 + " seconds");
}
async function load() {
    const items = await loadItems();
    const chartDom = document.querySelector("#chart");
    const canvasDom = chartDom.querySelector("canvas");
    let lastHits = null;
    document.querySelector("#sum").addEventListener("change", () => updateCharts(canvasDom, lastHits));
    document.querySelector("#sumstores").addEventListener("change", () => updateCharts(canvasDom, lastHits));
    document.querySelector("#todayonly").addEventListener("change", () => updateCharts(canvasDom, lastHits));
    document.querySelector("#start").addEventListener("change", () => updateCharts(canvasDom, lastHits));
    document.querySelector("#end").addEventListener("change", () => updateCharts(canvasDom, lastHits));
    document.querySelector("#start").value = getOldestDate(items);
    document.querySelector("#end").value = currentDate();

    let chartEnabled = false;
    newSearchComponent(
        document.querySelector("#search"),
        items,
        (hits) => {
            items.forEach((item) => (item.chart = false));
            if (!chartEnabled) {
                chartDom.classList.add("hide");
            } else {
                if (hits.length > 0) {
                    chartDom.classList.remove("hide");
                } else {
                    chartDom.classList.add("hide");
                }
                updateCharts(canvasDom, hits);
            }
            lastHits = hits;
            return hits;
        },
        null,
        (header) => {
            header = dom("tr", `<th>Kette</th><th>Name</th><th>Menge</th><th>Preis 📈</th><th></th>`);
            const showHideAll = header.querySelectorAll("th:nth-child(4)")[0];
            showHideAll.style["cursor"] = "pointer";
            showHideAll.showAll = true;
            showHideAll.addEventListener("click", () => {
                document
                    .querySelectorAll(".priceinfo")
                    .forEach((el) => (showHideAll.showAll ? el.classList.remove("hide") : el.classList.add("hide")));
                showHideAll.showAll = !showHideAll.showAll;
            });
            return header;
        },
        (item, itemDom, items, setQuery) => {
            const checked = (item.chart = (getQueryParameter("c") ?? []).includes(`${item.store}:${item.id}`));
            const dataId = item.store + ":" + item.id;
            const cell = dom("td", `<input type="checkbox" ${checked ? "checked" : ""} data-id="${dataId}">`);
            itemDom.appendChild(cell);
            const handleClick = (eventShouldSetQuery = false) => {
                item.chart = cell.children[0].checked;
                updateCharts(canvasDom, lastHits);
                !!eventShouldSetQuery && setQuery();
            };
            cell.children[0].addEventListener("click", handleClick);
            checked && handleClick();
            return itemDom;
        },
        (checked) => {
            chartEnabled = checked;
            if (checked) {
                if (lastHits.length > 0) {
                    chartDom.classList.remove("hide");
                    updateCharts(canvasDom, lastHits);
                } else {
                    chartDom.classList.add("hide");
                }
            } else {
                chartDom.classList.add("hide");
            }
        }
    );
    const query = getQueryParameter("q");
    if (query) {
        document.querySelector(".search").value = query;
        const inputEvent = new Event("input", {
            bubbles: true,
            cancelable: false,
        });
        document.querySelector(".search").dispatchEvent(inputEvent);
    }
}

load();
