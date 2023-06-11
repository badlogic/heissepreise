class Model {
    constructor() {
        this._listeners = [];
    }

    addListener(listener) {
        this._listeners.push(listener);
    }

    removeListener(listener) {
        const index = this._listeners.findIndex((item) => item === listener);
        if (index != -1) this._listeners.splice(index, 1);
    }

    notify(exclude) {
        for (const listener of this._listeners) {
            if (listener != exclude) listener();
        }
    }
}

exports.Model = Model;
