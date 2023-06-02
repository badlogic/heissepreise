const analysis = require("./analysis.js");
const dataDir = process?.argv?.[2] ?? "docker/data";
console.log("Restoring data from raw data.");
(async function () {
    /*console.log("Items: " + JSON.parse(fs.readFileSync("docker/data/latest-canonical.json")).length);
    await analysis.updateData(dataDir);
    fs.copyFileSync(`${dataDir}/latest-canonical.json`, `${dataDir}/latest-canonical-old.json`);*/
    const items = analysis.replay(dataDir);
    analysis.writeJSON(`${dataDir}/latest-canonical.json`, items, true);
    console.log(`Wrote ${analysis.readJSON(`${dataDir}/latest-canonical.json`, true).length} to ${dataDir}/latest-canonical.json`);
})();
