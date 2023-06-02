const fs = require("fs");
const analysis = require("./analysis.js");

if (process.argv.length < 3) {
    console.log("Usage: node gunzipJson.js <data-dir>");
    console.log();
    console.log("e.g. node gunzipJson.js data/");
    console.log();
    process.exit(1);
}
const dataDir = process.argv[2];

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

(async function () {
    try {
        const files = fs
            .readdirSync(dataDir)
            .filter((file) => file.indexOf("canonical") == -1 && analysis.STORE_KEYS.some((store) => file.indexOf(`${store}-`) == 0 && file.endsWith(".gz")))
            .map(file => file.replace(".gz", ""));
        console.log("found", files)
        if (fs.existsSync(`${dataDir}/latest-canonical.json.gz`)) files.push(`latest-canonical.json`);
        for (const file of files) {
            const path = `${dataDir}/${file}`;
            const data = analysis.readJSON(path, true);
            analysis.writeJSON(path, data);
            fs.unlinkSync(`${path}.gz`);
            console.log(`Wrote ${file}`);
        }
    } catch (e) {
        process.exit(1);
    }
})();
