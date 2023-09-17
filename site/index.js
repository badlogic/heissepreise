const i18n = require("./i18n");

// Process redirects and localization before running anything else
(() => {
    if (location.href.includes("heissepreise.github.io")) {
        location.href = "https://heisse-preise.io";
        return;
    }

    // Find the most preferred supported language
    for (const langCode of navigator.languages) {
        // We don't do regional codes, so take just the language code
        let lang = langCode.length >= 2 ? langCode.substring(0, 2) : null;
        if (lang == null) continue;
        if (i18n.locales.includes(lang)) {
            i18n.setLocale(lang);
            break;
        }
    }
})();

const { getQueryParameter } = require("./js/misc");
const model = require("./model");
require("./views");

const { STORE_KEYS } = require("./model/stores");
const { ProgressBar } = require("./views/progress-bar");
const progressBar = new ProgressBar(STORE_KEYS.length);

(async () => {
    await model.load(() => progressBar.addStep());
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
})();
