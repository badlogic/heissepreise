const { STORE_KEYS, stores } = require("./model/stores");
const { View } = require("./views/view");
const { Settings } = require("./model/settings");
require("./js/misc");
require("./views/custom-checkbox");
const { __ } = require("./browser_i18n");

class SettingsView extends View {
    constructor() {
        super();
        this.innerHTML = /*html*/ `
            <div class="flex flex-col gap-4 p-4 rounded-xl md:mt-8 bg-gray-100">
                <div>${__("Settings_Vorselektierte Ketten")}</div>
                <div x-id="stores" class="flex justify-center gap-2 flex-wrap">
                    ${STORE_KEYS.map(
                        (store) => /*html*/ `
                            <custom-checkbox
                                x-id="${store}" x-state x-change
                                label="${stores[store].name}"
                                class="${stores[store].color}"
                                ${stores[store].defaultChecked ? "checked" : ""}
                            ></custom-checkbox>`
                    ).join("")}
                </div>
                <div class="flex flex-row gap-2">
                    ${__("Settings_Start-Datum für Diagramme")}
                    <input
                        x-id="startDate"
                        x-change
                        x-state
                        type="date"
                        class="flex-grow cursor-pointer inline-flex items-center gap-x-1 rounded-full bg-white border border-gray-400 px-2 py-1 text-xs font-medium text-gray-600">
                </div>
                <div class="flex flex-row gap-2">
                    ${__("Settings_Diagramm Typ")}
                    <select x-id="chartType" x-change x-state class="flex-grow">
                        <option value="stepped">${__("Settings_Stufen")}</option>
                        <option value="lines">${__("Settings_Linien")}</option>
                    </select>
                </div>
                <custom-checkbox x-id="onlyAvailable" x-state x-change label="${__(
                    "Settings_Nur verfügbare Produkte anzeigen"
                )}" checked></custom-checkbox>
                <custom-checkbox x-id="stickyChart" x-state x-change label="${__(
                    "Settings_Diagramm immer anzeigen (wenn verfügbar)"
                )}" checked></custom-checkbox>
                <custom-checkbox x-id="stickySearch" x-state x-change label="${__(
                    "Settings_Suche immer anzeigen (wenn verfügbar)"
                )}"></custom-checkbox>
            </div>
        `;
        this.setupEventHandlers();
    }
}
customElements.define("settings-view", SettingsView);

(async () => {
    const settings = new Settings();
    const settingsView = document.querySelector("settings-view");
    settingsView.state = settings;

    document.body.addEventListener("x-change", () => {
        const state = settingsView.state;
        for (const prop of Object.getOwnPropertyNames(state)) {
            settings[prop] = state[prop];
        }
        settings.save();
    });
})();
