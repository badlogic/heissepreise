const { getQueryParameter } = require("./misc");
const model = require("./model");
require("./views");

(async () => {
    await model.load();
    const itemsFilter = document.querySelector("items-filter");
    const itemsList = document.querySelector("items-list");
    const itemsChart = document.querySelector("items-chart");
    itemsFilter.model = itemsList.model = model.items;

    const stateToUrl = (event) => {
        const filterState = JSON.stringify(itemsFilter.state);
        const listState = JSON.stringify(itemsList.state);
        const chartState = JSON.stringify(itemsChart.state);
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
    if (f) itemsFilter.state = JSON.parse(f);
    if (l) itemsList.state = JSON.parse(l);
    if (c) itemsChart.state = JSON.parse(c);
    if (d) {
        for (const id of d.split(";")) {
            model.items.lookup[id].chart = true;
        }
    }
    itemsFilter.filter();
})();
