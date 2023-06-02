const analysis = require("./analysis.js");
const dataDir = process?.argv?.[2] ?? "docker/data";
console.log("Restoring data from raw data.");
(async function () {
    analysis.migrateToGzip(dataDir);
    const items = analysis.replay(dataDir);
    analysis.writeJSON(`${dataDir}/latest-canonical.json`, items, true);
    console.log(`Wrote ${analysis.readJSON(`${dataDir}/latest-canonical.json.gz`).length} items to ${dataDir}/latest-canonical.json.gz`);
})();
