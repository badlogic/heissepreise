const fs = require("fs");
const path = require("path");
const analysis = require("./analysis.js");
const template = require("./template.js");
const outputDir = path.resolve("docs");
const dataDir = path.join(outputDir, "data");

function deleteFiles(folderPath) {
    const files = fs.readdirSync(folderPath);

    files.forEach((file) => {
        const filePath = path.join(folderPath, file);

        if (filePath !== dataDir) {
            if (fs.statSync(filePath).isFile()) {
                fs.unlinkSync(filePath);
            } else {
                deleteFiles(filePath);
                fs.rmdirSync(filePath);
            }
        }
    });
}

(async function () {
    try {
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
        deleteFiles(outputDir);
        template.generateSite("site", outputDir, false);

        analysis.migrateCompression(dataDir, ".json", ".json.br");
        analysis.migrateCompression(dataDir, ".json.gz", ".json.br");
        await analysis.updateData(dataDir);

        const items = analysis.readJSON(`${dataDir}/latest-canonical.json.${analysis.FILE_COMPRESSOR}`);
        for (const store of analysis.STORE_KEYS) {
            const storeItems = items.filter((item) => item.store === store);
            analysis.writeJSON(`${dataDir}/latest-canonical.${store}.compressed.json`, storeItems, false, 0, true);
        }
        fs.readdirSync(dataDir).forEach((file) => {
            const filePath = path.join(dataDir, file);
            if (fs.statSync(filePath).isFile() && !file.startsWith("latest-canonical")) fs.unlinkSync(filePath);
        });
        analysis.migrateCompression(dataDir, ".json.br", ".json");
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
