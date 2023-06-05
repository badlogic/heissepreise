const analysis = require("./analysis.js");
const dataDir = process?.argv?.[2] ?? "data";
console.log("Restoring data from raw data.");
(async function () {
    analysis.migrateCompression(dataDir, ".json", ".json.br", false);
    analysis.migrateCompression(dataDir, ".json.gz", ".json.br");
    const items = analysis.replay(dataDir);
    analysis.writeJSON(`${dataDir}/latest-canonical.json`, items, analysis.FILE_COMPRESSOR);
    console.log(
        `Wrote ${
            analysis.readJSON(`${dataDir}/latest-canonical.json.${analysis.FILE_COMPRESSOR}`).length
        } items to ${dataDir}/latest-canonical.json.${analysis.FILE_COMPRESSOR}`
    );
})();
