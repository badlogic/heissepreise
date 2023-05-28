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
        console.log(`Wrote ${JSON.parse(fs.readFileSync(`${dataDir}/latest-canonical.json`)).length} to ${dataDir}/latest-canonical.json`);
    } catch(e) {
        process.exit(1);
    }
})();
