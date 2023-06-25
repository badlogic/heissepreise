const { getQueryParameter } = require("./js/misc");
const model = require("./model");
require("./views");

(async () => {
    await model.load();
    const itemsFilter = document.querySelector("items-filter");
    const itemsList = document.querySelector("items-list");
    const itemsChart = document.querySelector("items-chart");
    itemsList.elements.sort.value = "store-and-name";

    const stateToUrl = (event) => {
        const filterState = itemsFilter.shareableState;
        const listState = itemsList.shareableState;
        const chartState = itemsChart.shareableState;
        const chartedItems = model.items.filteredItems
            .filter((item) => item.chart)
            .map((item) => item.store + item.id)
            .join(";");
        history.pushState({}, null, location.pathname + "?f=" + filterState + "&l=" + listState + "&c=" + chartState + "&d=" + chartedItems);
    };

    itemsFilter.addEventListener("x-change", stateToUrl);
    itemsList.addEventListener("x-change", stateToUrl);

    const f = getQueryParameter("f");
    const l = getQueryParameter("l");
    const c = getQueryParameter("c");
    const d = getQueryParameter("d");

    if (f) itemsFilter.shareableState = f;
    if (l) itemsList.shareableState = l;
    if (c) itemsChart.shareableState = c;
    if (d) {
        for (const id of d.split(";")) {
            model.items.lookup[id].chart = true;
        }
    }
    itemsFilter.model = itemsList.model = model.items;
    itemsFilter.fireChangeEvent();
})();
