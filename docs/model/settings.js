const { STORE_KEYS, stores } = require("./stores");
const { Model } = require("./model");

export class Settings extends Model {
    constructor() {
        super();
        this.startDate = "2017-01-01";
        this.chartType = "stepped";
        STORE_KEYS.forEach((store) => {
            this[store] = stores[store].defaultChecked;
        });

        let settings = localStorage.getItem("settings");
        if (settings) {
            settings = JSON.parse(settings);
            for (const prop of Object.getOwnPropertyNames(settings)) {
                this[prop] = settings[prop];
            }
        }
    }

    save() {
        const settings = {};

        for (const prop of Object.getOwnPropertyNames(this)) {
            if (prop.startsWith("_")) continue;
            settings[prop] = this[prop];
        }

        localStorage.setItem("settings", JSON.stringify(settings));
    }
}
