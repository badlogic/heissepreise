const model = require("./model");
require("./views");

(async () => {
    await model.load();
    const itemsFilter = document.querySelector("items-filter");
    itemsFilter.model = model.items;
    itemsFilter.addEventListener("change", (event) => {
        console.log("Filter changed: " + event.target.getAttribute("x-id"));
    });
})();
