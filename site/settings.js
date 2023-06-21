const { STORE_KEYS, stores } = require("./model/stores");
const { View } = require("./views/view");
const { Settings } = require("./model/settings");
require("./js/misc");
require("./views/custom-checkbox");

class SettingsView extends View {
    constructor() {
        super();
        this.innerHTML = /*html*/ `
            <div class="flex flex-col gap-4 p-4 rounded-xl md:mt-8 bg-gray-100">
                <div>Vorselektierte Ketten</div>
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
                    Start-Datum für Diagramme
                    <input
                        x-id="startDate"
                        x-change
                        x-state
                        type="date"
                        class="flex-grow cursor-pointer inline-flex items-center gap-x-1 rounded-full bg-white border border-gray-400 px-2 py-1 text-xs font-medium text-gray-600">
                </div>
                <div class="flex flex-row gap-2">
                    Diagramm Typ
                    <select x-id="chartType" x-change x-state class="flex-grow">
                        <option value="stepped">Stufen</option>
                        <option value="lines">Linien</option>
                    </select>
                </div>
                <custom-checkbox x-id="onlyAvailable" x-state x-change label="Nur verfügbare Produkte anzeigen" checked></custom-checkbox>
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
