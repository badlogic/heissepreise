const model = require("./model");
require("./views");

(async () => {
    await model.load();
    const itemsFilter = document.querySelector("items-filter");
    const itemsList = document.querySelector("items-list");
    itemsFilter.model = itemsList.model = model.items;
    itemsFilter.filter();
})();
