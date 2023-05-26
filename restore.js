const fs = require("fs");
const analysis = require("./analysis.js");
const dataDir = process?.argv?.[2] ?? "docker/data"
console.log("Restoring data from raw data.");
(async function () {
    console.log("Items: " + JSON.parse(fs.readFileSync("docker/data/latest-canonical.json")).length);
    /*await analysis.updateData(dataDir);
    fs.copyFileSync(`${dataDir}/latest-canonical.json`, `${dataDir}/latest-canonical-old.json`);*/
    fs.writeFileSync(`${dataDir}/latest-canonical.json`, JSON.stringify(analysis.replay(dataDir), null, 2));
    console.log("Items: " + JSON.parse(fs.readFileSync(`${dataDir}/latest-canonical.json`)).length);
})();
