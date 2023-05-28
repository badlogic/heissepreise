const fs = require("fs");
const https = require("https");
const analysis = require("./analysis.js");

const downloadFile = async (fileUrl, destinationPath) => {
    const file = fs.createWriteStream(destinationPath);

    return new Promise((resolve, reject) => {
        https.get(fileUrl, response => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve('File downloaded successfully.');
            });
            file.on('error', err => {
                fs.unlink(destinationPath, () => {
                    reject(`Error downloading file: ${err.message}`);
                });
            });
        }).on('error', err => {
            reject(`Error downloading file: ${err.message}`);
        });
    });
};

if (process.argv.length < 4) {
    console.log("Usage: node pages.js <data-dir> <pages-url>");
    console.log()
    console.log("e.g. node pages.js data/ https://badlogic.github.io");
    console.log()
    process.exit(1);
}
const dataDir = process.argv[2];
const repoUrl = process.argv[3];

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

(async function () {
    try {
        try {
            await downloadFile(repoUrl + "/latest-canonical.json", dataDir + "/latest-canonical.json");
            try {
                JSON.parse(fs.readFileSync(dataDir + "/latest-canonical.json"))
                console.log("Downloaded previous latest-canonical.json")
            } catch(e) {
                console.log("No previous latest-canonical.json found.");
                fs.rmSync(dataDir + "/latest-canonical.json");
            }
        } catch(e) {
            console.log(JSON.stringify(e, null, 2));
            console.log("No previous latest-canonical.json found.");
        }
        await analysis.updateData(dataDir);
        console.log(`Wrote ${JSON.parse(fs.readFileSync(`${dataDir}/latest-canonical.json`)).length} to ${dataDir}/latest-canonical.json`);
    } catch(e) {
        process.exit(1);
    }
})();
