const { dom, getDynamicElements } = require("../misc");
const { View } = require("./view");

class ItemsFilter extends View {
    constructor() {
        super();

        this.innerHTML = /*html*/ `
            <div class="filters mb-4 text-sm flex justify-center gap-4">
                <label>
                    <input type="radio" id="date" name="type" value="date" checked /> Datum
                    <select id="dates" class="bg-white rounded-full"></select>
                </label>
                <label><input type="radio" id="cheaper" name="type" value="cheaper" /> Billiger seit letzter Änderung</label>
            </div>
            <input id="filter" class="search rounded-lg px-2 py-1 w-full mb-4" type="text" placeholder="Filtern... (mind. 3 Zeichen)" />
            <div class="filters flex justify-center gap-2 flex-wrap" id="filters-store"></div>
            <div class="filters flex justify-center gap-2 mt-4" id="filters-changes"></div>
        `;
    }
}

customElements.define("items-filter", ItemsFilter);
