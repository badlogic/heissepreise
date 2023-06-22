const { getQueryParameter } = require("./js/misc");
const model = require("./model");
require("./views");

(async () => {
    document.querySelector('[x-id="videoTutorial"]').addEventListener("click", (event) => {
        event.preventDefault();
        const container = document.querySelector(".video-container");
        if (container.innerHTML.trim().length == 0) {
            container.innerHTML = `<iframe style="width: 100%; height: 100%" src="https://www.youtube.com/embed/2u-T85yMKGI" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
            container.classList.remove("hidden");
        } else {
            container.innerHTML = "";
            container.classList.add("hidden");
        }
    });

    await model.load();
    const itemsFilter = document.querySelector("items-filter");
    const itemsList = document.querySelector("items-list");
    const itemsChart = document.querySelector("items-chart");

    const stateToUrl = (event) => {
        const filterState = itemsFilter.shareableState;
        const listState = itemsList.shareableState;
        const chartState = itemsChart.shareableState;
        const chartedItems = model.items.filteredItems
            .filter((item) => item.chart)
            .map((item) => item.store + item.id)
            .join(";");

        history.replaceState({}, null, location.pathname + "?f=" + filterState + "&l=" + listState + "&c=" + chartState + "&d=" + chartedItems);
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
    document.querySelector('[x-id="loader"]').classList.add("hidden");
})();
