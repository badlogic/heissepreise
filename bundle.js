const fs = require("fs");
const path = require("path");
const chokidar = require("chokidar");
const esbuild = require("esbuild");
const { exec } = require("child_process");
const { promisify } = require("util");

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

function processFile(inputFile, outputFile, filter) {
    const fileDir = path.dirname(inputFile);
    if (inputFile.includes(".mp3")) {
        const data = fs.readFileSync(inputFile);
        fs.writeFileSync(outputFile, data);
    } else {
        const data = fs.readFileSync(inputFile, "utf8");
        if (filter(inputFile, false, data)) return;
        const replacedData = replaceFileContents(data, fileDir);
        fs.writeFileSync(outputFile, replacedData);
    }
    console.log(`${inputFile} -> ${outputFile}`);
}

function generateSite(inputDir, outputDir, deleteOutput, filter) {
    if (deleteOutput) {
        deleteDirectory(outputDir);
    }
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

    const files = fs.readdirSync(inputDir);
    files.forEach((file) => {
        const filePath = path.join(inputDir, file);
        const isDir = fs.statSync(filePath).isDirectory();
        if (file.startsWith("_")) return;

        if (isDir) {
            if (filter(filePath, true, null)) return;
            if (path.resolve(filePath) == path.resolve(outputDir)) return;
            const subOutputDir = path.join(outputDir, file);
            fs.mkdirSync(subOutputDir, { recursive: true });
            generateSite(filePath, subOutputDir, deleteOutput, filter);
        } else {
            const inputFile = filePath;
            const outputFile = path.join(outputDir, file);
            processFile(inputFile, outputFile, filter);
        }
    });
}

async function bundleHTML(inputDir, outputDir, deleteDir = true, watch = false, filter) {
    generateSite(inputDir, outputDir, deleteDir, filter);
    if (!watch) return;

    const watcher = chokidar.watch(inputDir, { ignored: /(^|[\/\\])\../ });
    let initialScan = true;
    watcher.on("ready", () => (initialScan = false));
    watcher.on("all", (event, filePath) => {
        if (initialScan) return;
        if (path.resolve(filePath).startsWith(path.resolve(outputDir))) return;
        console.log(`File ${filePath} has been ${event}`);
        generateSite(inputDir, outputDir, false, filter);
    });
    console.log(`Watching directory for changes: ${inputDir}`);
}

async function bundleCSS(inputFile, outputFile, watch = false) {
    const execAsync = promisify(exec);
    if (!watch) {
        await execAsync(`npx tailwindcss -i ${inputFile} -o ${outputFile} --minify`);
        console.log("Generated CSS");
    } else {
        execAsync(`npx tailwindcss -i ${inputFile} -o ${outputFile} --watch`);
    }
}

async function bundleJS(inputDir, outputDir, watch) {
    let buildContext = await esbuild.context({
        entryPoints: {
            carts: `${inputDir}/carts.js`,
            cart: `${inputDir}/cart.js`,
            changes: `${inputDir}/changes.js`,
            settings: `${inputDir}/settings.js`,
            index: `${inputDir}/index.js`,
        },
        bundle: true,
        sourcemap: true,
        outdir: outputDir,
        logLevel: "debug",
        minify: !watch,
    });
    if (!watch) {
        await buildContext.rebuild();
        console.log("Generated JS");
    } else {
        buildContext.watch();
    }
}

async function bundle(inputDir, outputDir, watch) {
    const promises = [];

    promises.push(bundleCSS(path.join(inputDir, "style.css"), path.join(outputDir, "style.css"), watch));
    promises.push(bundleJS(inputDir, outputDir, watch));
    promises.push(
        bundleHTML(inputDir, outputDir, false, watch, (filePath, isDir, data) => {
            if (isDir) return false;
            if (filePath.endsWith("style.css")) return true;
            if (filePath.endsWith(".js") && !filePath.includes("socket.io.js")) return true;
            if (data.includes(`require("`)) return true;
            return false;
        })
    );

    if (!watch) await Promise.all(promises);
}

exports.deleteDirectory = deleteDirectory;
exports.bundle = bundle;
