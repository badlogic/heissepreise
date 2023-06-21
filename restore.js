const fs = require("fs");
const analysis = require("./analysis.js");
const h43z = require("./h43z");
const dataDir = process?.argv?.[2] ?? "data";
const h43zFile = process?.argv?.[3] ?? null;
console.log("Restoring data from raw data.");
(async function () {
    analysis.migrateCompression(dataDir, ".json", ".json.br", false);
    analysis.migrateCompression(dataDir, ".json.gz", ".json.br");
    const items = await analysis.replay(dataDir);
    analysis.writeJSON(`${dataDir}/latest-canonical.json`, items, analysis.FILE_COMPRESSOR);
    console.log(
        `Wrote ${
            analysis.readJSON(`${dataDir}/latest-canonical.json.${analysis.FILE_COMPRESSOR}`).length
        } items to ${dataDir}/latest-canonical.json.${analysis.FILE_COMPRESSOR}`
    );
    if (h43zFile && fs.existsSync(h43zFile)) {
        h43z.mergeWithLatestCanonical(h43zFile, `${dataDir}/latest-canonical.json`);
    }
})();
