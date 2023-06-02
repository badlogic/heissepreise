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
        await analysis.updateData(dataDir);
        const items = JSON.parse(fs.readFileSync(`${dataDir}/latest-canonical.json`));
        for (const store of analysis.STORE_KEYS) {
            const storeItems = items.filter((item) => item.store === store);
            fs.writeFileSync(`${dataDir}/latest-canonical.${store}.compressed.json`, JSON.stringify(analysis.compress(storeItems)));
        }
        console.log(`Wrote ${items.length} items to ${dataDir}/latest-canonical(-compressed).json`);
    } catch (e) {
        process.exit(1);
    }
})();
