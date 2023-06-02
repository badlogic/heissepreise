const fs = require("fs");
const analysis = require("./analysis.js");

if (process.argv.length < 3) {
    console.log("Usage: node pages.js <data-dir>");
    console.log();
    console.log("e.g. node pages.js data/");
    console.log();
    process.exit(1);
}
const dataDir = process.argv[2];

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

(async function () {
    try {
        analysis.migrateCompression(dataDir, ".json", ".json.br");
        analysis.migrateCompression(dataDir, ".json.gz", ".json.br");

        await analysis.updateData(dataDir);
        const items = analysis.readJSON(`${dataDir}/latest-canonical.json.${analysis.FILE_COMPRESSOR}`);
        for (const store of analysis.STORE_KEYS) {
            const storeItems = items.filter(item => item.store === store);
            analysis.writeJSON(`${dataDir}/latest-canonical.${store}.compressed.json`, false, storeItems, 0, true);
        }
        console.log(`Wrote ${items.length} items to ${dataDir}/latest-canonical(-compressed).json`);
    } catch (e) {
        process.exit(1);
    }
})();
