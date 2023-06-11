const { getBooleanAttribute } = require("../misc");

class View extends HTMLElement {
    constructor() {
        super();
        this._model = null;
        this._listener = () => this.render();
        this._disableChangeEvent = false;
    }

    static traverse(element, parents, filter, childrenProcessed) {
        if (!element) return;

        if (element.getAttribute("x-id")) {
            if (filter(parents, element)) parents.push(element);
            else return;
        }

        const childNodes = element.childNodes;
        for (let i = 0; i < childNodes.length; i++) {
            const child = childNodes[i];
            if (child.nodeType === Node.ELEMENT_NODE) {
                View.traverse(child, parents, filter, childrenProcessed);
            }
        }
        if (parents.length > 0) parents.pop();
        childrenProcessed(parents, element);
    }

    static elements(view) {
        let elements = [...view.querySelectorAll("[x-id]")];
        elements = elements.filter((el) => {
            let parent = el.parentElement;
            while (parent != view) {
                if (parent instanceof View) return false;
                if (getBooleanAttribute(parent, "x-notraverse")) return false;
                parent = parent.parentElement;
            }
            return true;
        });
        const result = {};
        elements.forEach((element) => {
            if (result[element.getAttribute("x-id")]) {
                console.log(`Duplicate element x-id ${element.getAttribute("x-id")} in ${view.localName}`);
            }
            result[element.getAttribute("x-id")] = element;
        });
        return result;
    }

    get elements() {
        return View.elements(this);
    }

    set model(model) {
        if (this._model) this._model.removeListener(this._listener);
        this._model = model;
        this._model.addListener(this._listener);
        this.render();
    }

    get model() {
        return this._model;
    }

    get state() {
        const elements = this.elements;
        const properties = ["checked", "value"];
        const state = {};
        for (const key of Object.keys(elements)) {
            const element = elements[key];
            if (!element.hasAttribute("x-state")) continue;
            const elementState = {};
            for (const property of properties) {
                if (property in element) {
                    elementState[property] = element[property];
                }
            }
            state[key] = elementState;
        }
        return state;
    }

    set state(state) {
        const elements = this.elements;
        this._disableChangeEvent = true;
        for (const key of Object.keys(elements)) {
            const elementState = state[key];
            if (elementState) {
                const element = elements[key];
                for (const property in elementState) {
                    element[property] = elementState[property];
                    if (element.localName === "input" && element.getAttribute("type") === "radio") {
                        const changeEvent = new CustomEvent("change", {
                            bubbles: true,
                            cancelable: true,
                        });
                        element.dispatchEvent(changeEvent);
                    }
                }
            }
        }
        this._disableChangeEvent = false;
        this.fireChangeEvent();
    }

    render() {}

    setupEventHandlers() {
        const handler = (event) => {
            event.stopPropagation();
            this.fireChangeEvent();
        };

        const elements = this.elements;
        for (const key of Object.keys(elements)) {
            const element = elements[key];
            if (element._handlerSet) continue;
            if (element.hasAttribute("x-change")) {
                element.addEventListener("change", handler);
                element._handlerSet = true;
            }
            if (element.hasAttribute("x-click")) {
                element.addEventListener("click", handler);
                element._handlerSet = true;
            }
            if (element.hasAttribute("x-input")) {
                element.addEventListener("input", handler);
                element._handlerSet = true;
            }
            if (element.hasAttribute("x-input-debounce")) {
                const DEBOUNCE_MS = 50;
                let timeoutId = 0;
                const debounceHandler = (event) => {
                    event.stopPropagation();
                    clearTimeout(timeoutId);
                    timeoutId = setTimeout(() => {
                        this.fireChangeEvent();
                    }, DEBOUNCE_MS);
                };
                element.addEventListener("input", debounceHandler);
                element._handlerSet = true;
            }
        }
    }

    fireChangeEvent() {
        if (this._disableChangeEvent) return;
        const event = new CustomEvent("change", {
            bubbles: true,
            cancelable: true,
        });
        this.dispatchEvent(event);
    }
}

exports.View = View;
