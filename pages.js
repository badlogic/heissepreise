const fs = require("fs");
const path = require("path");
const analysis = require("./analysis.js");
const bundle = require("./bundle.js");
const outputDir = path.resolve("docs");
const dataDir = path.join(outputDir, "data");
const { execSync } = require("child_process");

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
        bundle.bundle("site", outputDir, false);

        if (fs.existsSync(`${dataDir}/latest-canonical.json`)) {
            const data = analysis.readJSON(`${dataDir}/latest-canonical.json`);
            analysis.writeJSON(`${dataDir}/latest-canonical.json`, data, analysis.FILE_COMPRESSOR);
        }
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
        try {
            const output = execSync(`ls -lah ${dataDir}`).toString();
            console.log(output);
        } catch (error) {
            console.error(`Error executing command: ${error}`);
        }
        analysis.migrateCompression(dataDir, `.json.${analysis.FILE_COMPRESSOR}`, ".json");
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
