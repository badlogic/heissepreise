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
 *
 * @type {Object.<string, Object.<string, string>>}
 */
const translations = {
    // sorted alphabetically
    cs: require("./locales/cs.json"),
    de: require("./locales/de.json"),
    en: require("./locales/en.json"),
};
/**
 * @type {string[]}
 */
const locales = Object.keys(translations);
/**
 * @type {string}
 */
const defaultLocale = "de";

/**
 * @param {!string} locale name of the language to use for translation, MUST be one of the supported languages
 * @param {!string} key to translate
 * @param {!Object.<string, string>} [args] arguments to substitute into the translated key
 * @returns {string} translated string
 */
function translateWithLocale(locale, key, args) {
    let translation = translations[locale][key];
    if (translation === undefined) {
        console.error("Untranslated key in ", locale, ": ", key);
        if (locale != defaultLocale) {
            translation = translations[defaultLocale][key] || key;
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

exports.defaultLocale = defaultLocale;
exports.locales = locales;
exports.translateWithLocale = translateWithLocale;
