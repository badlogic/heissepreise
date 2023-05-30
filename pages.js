const fs = require("fs");
const analysis = require("./analysis.js");

if (process.argv.length < 3) {
    console.log("Usage: node pages.js <data-dir>");
    console.log()
    console.log("e.g. node pages.js data/");
    console.log()
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
        const compressedItems = analysis.compress(items);
        fs.writeFileSync(`${dataDir}/latest-canonical-compressed.json`, JSON.stringify(compressedItems));
        console.log(`Wrote ${items.length} items to ${dataDir}/latest-canonical(-compressed).json`);
    } catch(e) {
        process.exit(1);
    }
})();
