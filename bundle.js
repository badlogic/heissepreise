const fs = require("fs");
const path = require("path");
const chokidar = require("chokidar");
const esbuild = require("esbuild");
const { exec } = require("child_process");
const { promisify } = require("util");
const i18n = require("./i18n");

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

/**
 * Process file content by resolving includes and translation placeholders.
 *
 * @param {string} fileContent original file content
 * @param {string} fileDir path of the directory of the file
 * @param {string} locale language code which should be used to resolve translation placeholders
 * @returns {string}
 */
function replaceFileContents(fileContent, fileDir, locale) {
    const pattern = /%%([^%]+)%%|__(.+?)__/g;

    return fileContent.replace(pattern, (_, filename, translationKey) => {
        if (filename != undefined) {
            const filenamePath = path.join(fileDir, filename);
            try {
                const data = fs.readFileSync(filenamePath, "utf8");
                const replacedData = replaceFileContents(data, path.dirname(filenamePath), locale);
                return replacedData;
            } catch (error) {
                console.error(`Error reading file "${filenamePath}":`, error);
                return "";
            }
        } else if (translationKey != undefined) {
            return i18n.translateWithLocale(locale, translationKey);
        }
    });
}

/**
 * Copy inputFile to outputFile, possibly modifying it in the process.
 *
 * @param {string} inputFile path
 * @param {string} outputFile path
 * @param {function(string, boolean, string):boolean} filter takes path, whether it is a directory and data (or null if directory), returns true if the file should be left out
 */
function processFile(inputFile, outputFile, filter) {
    let extension = path.extname(inputFile);
    if (extension == ".html") {
        const data = fs.readFileSync(inputFile, "utf8");
        if (filter(inputFile, false, data)) return;
        for (const locale of i18n.locales) {
            const replacedData = replaceFileContents(data, path.dirname(inputFile), locale);
            if (locale == i18n.defaultLocale) {
                fs.writeFileSync(outputFile, replacedData);
                console.log(`${inputFile} -> ${outputFile}`);
            }
            let pathWithLanguageCode = outputFile.substring(0, outputFile.length - extension.length) + "." + locale + extension;
            fs.writeFileSync(pathWithLanguageCode, replacedData);
            console.log(`${inputFile} -> ${pathWithLanguageCode}`);
        }
    } else {
        const data = fs.readFileSync(inputFile);
        if (filter(inputFile, false, data)) return;
        fs.writeFileSync(outputFile, data);
        console.log(`${inputFile} -> ${outputFile}`);
    }
}

/**
 *
 * @param {string} inputDir path to the input directory, traversed recursively, outputDir and files/directories starting with _ are automatically skipped
 * @param {string} outputDir path to the output directory
 * @param {boolean} deleteOutput whether the contents of output directory should be deleted first
 * @param {function(string, boolean, string):boolean} filter takes path, whether it is a directory and data (or null if directory), returns true if the file should be left out
 */
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
            if (filePath.includes("/locales/")) return true;
            if (filePath.endsWith(".js") && !filePath.includes("socket.io.js")) return true;
            if (data.includes(`require("`)) return true;
            return false;
        })
    );

    if (!watch) await Promise.all(promises);
}

exports.deleteDirectory = deleteDirectory;
exports.bundle = bundle;
