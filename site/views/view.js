class View extends HTMLElement {
    constructor() {
        super();
        this._model = null;
        this._listener = () => this.render(this._model);
    }

    set model(model) {
        if (this._model) this._model.removeListener(this._listener);
        this._model = model;
        this._model.addListener(this._listener);
        this.render(this._model);
    }

    render(model) {}
}

exports.View = View;
