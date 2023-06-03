const fs = require("fs");
const analysis = require("./analysis.js");
const template = require("./template.js");

if (process.argv.length < 3) {
    console.log("Usage: node pages.js <output-dir>");
    console.log();
    console.log("e.g. node pages.js docs/");
    console.log();
    process.exit(1);
}

(async function () {
    try {
        const outputDir = process.argv[2];
        const dataDir = outputDir + "/data";
        template.generateSite("site", outputDir, false);

        analysis.migrateCompression(dataDir, ".json", ".json.br");
        analysis.migrateCompression(dataDir, ".json.gz", ".json.br");
        await analysis.updateData(dataDir);

        const items = analysis.readJSON(`${dataDir}/latest-canonical.json.${analysis.FILE_COMPRESSOR}`);
        for (const store of analysis.STORE_KEYS) {
            const storeItems = items.filter((item) => item.store === store);
            analysis.writeJSON(`${dataDir}/latest-canonical.${store}.compressed.json`, false, storeItems, 0, true);
        }
    } catch (e) {
        process.exit(1);
    }
})();
