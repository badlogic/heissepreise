class View extends HTMLElement {
    constructor() {
        super();
        this._model = null;
        this._listener = () => this.render();
    }

    set model(model) {
        if (this._model) this._model.removeListener(this._listener);
        this._model = model;
        this._model.addListener(this._listener);
        this.render(model);
    }

    render() {}
}

exports.View = View;
