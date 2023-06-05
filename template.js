const fs = require("fs");
const path = require("path");

function deleteDirectory(directory) {
    if (fs.existsSync(directory)) {
        fs.readdirSync(directory).forEach((file) => {
            const filePath = path.join(directory, file);
            if (fs.statSync(filePath).isDirectory()) {
                deleteDirectory(filePath);
            } else {
                fs.unlinkSync(filePath);
            }
        });
        fs.rmdirSync(directory);
    }
}

function replaceFileContents(string, fileDir) {
    const pattern = /%%([^%]+)%%|\/\/\s*include\s*"([^"]+)"/g;

    return string.replace(pattern, (_, filename1, filename2) => {
        const filename = filename1 || filename2;
        const filenamePath = path.join(fileDir, filename);
        try {
            const data = fs.readFileSync(filenamePath, "utf8");
            const replacedData = replaceFileContents(data, path.dirname(filenamePath));
            return replacedData;
        } catch (error) {
            console.error(`Error reading file "${filenamePath}":`, error);
            return "";
        }
    });
}

function processFile(inputFile, outputFile) {
    console.log(`${inputFile} -> ${outputFile}`);
    const fileDir = path.dirname(inputFile);
    const data = fs.readFileSync(inputFile, "utf8");
    const replacedData = replaceFileContents(data, fileDir);
    fs.writeFileSync(outputFile, replacedData);
}

function generateSite(inputDir, outputDir, deleteOutput) {
    if (deleteOutput) {
        deleteDirectory(outputDir);
    }
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

    const files = fs.readdirSync(inputDir);
    files.forEach((file) => {
        if (file.startsWith("_")) return;

        const filePath = path.join(inputDir, file);
        if (fs.statSync(filePath).isDirectory()) {
            if (path.resolve(filePath) == path.resolve(outputDir)) return;
            const subOutputDir = path.join(outputDir, file);
            fs.mkdirSync(subOutputDir, { recursive: true });
            generateSite(filePath, subOutputDir, deleteOutput);
        } else {
            const inputFile = filePath;
            const outputFile = path.join(outputDir, file);
            processFile(inputFile, outputFile);
        }
    });
}

exports.generateSite = generateSite;

// generateSite("site", "site/output", true);
