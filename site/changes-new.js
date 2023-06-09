const model = require("./model");
require("./views");

(async () => {
    await model.load();
    document.querySelector("items-filter").model(model.items);
})();
