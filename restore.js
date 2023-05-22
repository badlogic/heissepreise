const fs = require("fs");
const analysis = require("./analysis.js");

(async function () {
    fs.copyFileSync("docker/data/latest-canonical.json", "docker/data/latest-canonical-old.json");
    await analysis.updateData("docker/data");
    fs.writeFileSync("docker/data/latest-canonical.json", JSON.stringify(analysis.replay("docker/data"), null, 2));
})();
