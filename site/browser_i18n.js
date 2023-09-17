const i18n = require("../i18n");

/**
 * The currently selected locale.
 * @type {?string}
 */
var currentLocale = i18n.defaultLocale;

/**
 * Set the globally used locale.
 * Expects a 2 character language code string, one from locales.
 * @param {string} locale
 */
function setLocale(locale) {
    if (i18n.locales.includes(locale)) {
        console.log("Locale changed to " + locale);
        currentLocale = locale;
        return true;
    }
    console.error("Attempted to setLocale to unsupported language: ", locale);
    return false;
}

/**
 * Translates the key using the current global locale.
 *
 * @param {!string} key to translate
 * @param {!Object.<string, string>} [args] arguments to substitute into the translated key
 * @returns {string} translated string
 */
function translate(key, args) {
    return i18n.translateWithLocale(currentLocale, key, args);
}

// Find the most preferred supported language
for (const langCode of navigator.languages) {
    // We don't do regional codes, so take just the language code
    let lang = langCode.length >= 2 ? langCode.substring(0, 2) : null;
    if (lang == null) continue;
    if (i18n.locales.includes(lang)) {
        setLocale(lang);
        break;
    }
}

exports.__ = translate;
