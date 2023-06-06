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

    document.querySelector("#sum-container").innerHTML = customCheckbox(`sum`, "Preissumme Gesamt", false, "gray", "gray");
    document.querySelector("#sumstores-container").innerHTML = customCheckbox(`sumstores`, "Preissumme pro Kette", false, "gray", "gray");
    document.querySelector("#todayonly-container").innerHTML = customCheckbox(`todayonly`, "Nur heutige Preise", false, "gray", "gray");

    document.querySelector("#sum").addEventListener("change", () => updateCharts(canvasDom, lastHits));
    document.querySelector("#sumstores").addEventListener("change", () => updateCharts(canvasDom, lastHits));
    document.querySelector("#todayonly").addEventListener("change", () => updateCharts(canvasDom, lastHits));

    document.querySelector("#start").addEventListener("change", () => updateCharts(canvasDom, lastHits));
    document.querySelector("#end").addEventListener("change", () => updateCharts(canvasDom, lastHits));
    document.querySelector("#start").value = getOldestDate(items);
    document.querySelector("#end").value = currentDate();

    let chartEnabled = false;
    let search = newSearchComponent(
        document.querySelector("#search"),
        items,
        (hits) => {
            items.forEach((item) => (item.chart = false));
            if (!chartEnabled) {
                chartDom.classList.add("hidden");
            } else {
                if (hits.length > 0) {
                    chartDom.classList.remove("hidden");
                } else {
                    chartDom.classList.add("hidden");
                }
                updateCharts(canvasDom, hits);
            }
            lastHits = hits;
            return hits;
        },
        null,
        (header) => {
            header.innerHTML += "<th></th>";
            return header;
        },
        (item, itemDom, items, setQuery) => {
            const checked = (item.chart = (getQueryParameter("c") ?? []).includes(`${item.store}:${item.id}`));
            const dataId = item.store + ":" + item.id;
            const cell = dom(
                "td",
                `<label class="flex">
                    <input class="hidden peer" type="checkbox" ${checked ? "checked" : ""} data-id="${dataId}">
                    <span class="ml-auto peer-checked:bg-blue-700 bg-transparent rounded p-1 text-sm transform group-[.decreased]:scale-x-flip hover:scale-110 cursor-pointer">📈</span>
                </label>`
            );
            cell.classList.add("order-4", "text-right");
            itemDom.appendChild(cell);

            const handleClick = (eventShouldSetQuery = false) => {
                item.chart = cell.children[0].children[0].checked;
                if (item.chart && !search.chart.checked) {
                    search.chart.checked = true;
                    search.chart.dispatchEvent(new Event("change"));
                }
                updateCharts(canvasDom, lastHits);
                !!eventShouldSetQuery && setQuery();
            };
            cell.addEventListener("click", handleClick);
            checked && handleClick();
            return itemDom;
        },
        (checked) => {
            chartEnabled = checked;
            if (checked) {
                if (lastHits.length > 0) {
                    chartDom.classList.remove("hidden");
                    updateCharts(canvasDom, lastHits);
                } else {
                    chartDom.classList.add("hidden");
                }
            } else {
                chartDom.classList.add("hidden");
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
