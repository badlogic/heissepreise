// Internationalization support
// This file is used both serverside and clientside.

/**
 * Supported languages and their translations.
 * Each file contains an object with key-value pairs.
 *
 * Argument substitution is supported through named arguments: translate("Hello {{name}}", {name: "World"})
 *
 * Plurals and arrays are currently not supported.
 *
 * If the key is missing in the current localization, it falls back to default localization
 * and then to treating the key itself as the localization.
 */

const translations = {
    cs: require("./locales/cs.json"),
    de: require("./locales/de.json"),
    en: require("./locales/en.json"),
};
/**
 * @type {string[]}
 */
const locales = Object.keys(locales);
const defaultLocale = "de";

/** The currently selected locale. */
var currentLocale = defaultLocale;

/**
 * Set the globally used locale.
 * Expects a 2 character language code string, one from locales.
 */
function setLocale(locale) {
    if (Object.hasOwn(locales, locale)) {
        currentLocale = locale;
        return true;
    }
    console.error("Attempted to setLocale to unsupported language: ", locale);
    return false;
}

/**
 * @param {string} key to translate
 * @param {Object?} args arguments to substitute into the translated key
 * @returns translated string
 */
function translate(key, args) {
    let translation = locales[currentLocale][key];
    if (translation === undefined) {
        console.error("Untranslated key in ", currentLocale, ": ", key);
        if (currentLocale != defaultLocale) {
            translation = locales[defaultLocale][key] || key;
        } else {
            translation = key;
        }
    }

    if (typeof args === "object") {
        // Do argument substitution
        for (const arg in args) {
            translation = translation.replaceAll("{{" + arg + "}}", args[arg]);
        }
    }

    return translation;
}

exports.setLocale = setLocale;
exports.locales = locales;
exports.translate = translate;
