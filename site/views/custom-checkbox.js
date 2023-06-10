const { dom, getDynamicElements } = require("../misc");
const { View } = require("./view");

class CustomCheckbox extends View {
    constructor() {
        super();
        const isChecked = this.hasAttribute("checked") && (this.getAttribute("checked").length == 0 || this.getAttribute("checked") === "true");
        const label = this.hasAttribute("label") ? this.getAttribute("label") : "";
        const abbr = this.hasAttribute("abbr") ? this.getAttribute("abbr") : "";
        this.innerHTML = /*html*/ `
            <label class="inline-flex items-center gap-x-1 cursor-pointer">
                <input x-id="checkbox" x-change type="checkbox" ${isChecked ? "checked" : ""} class="hidden peer">
                <svg class="h-2 w-2 stroke-gray-600 fill-gray-100 peer-checked:fill-gray-600" viewBox="0 0 6 6">
                    <circle cx="3" cy="3" r="2" />
                </svg>
                ${this.hasAttribute("abbr") ? `<abbr title="${abbr}">${label}</abbr>` : label}
            </label>
        `;
        this.classList.add("customcheckbox");
        this._checkbox = getDynamicElements(this).checkbox;
        this.setupEventHandlers();
    }

    get checkbox() {
        return this._checkbox;
    }

    get checked() {
        return this._checkbox.checked;
    }

    set checked(value) {
        this._checkbox.checked = value;
    }
}
customElements.define("custom-checkbox", CustomCheckbox);
