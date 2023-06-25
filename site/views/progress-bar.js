class ProgressBar {
    constructor(steps) {
        this.progress = 0;
        this.steps = steps ?? 0;
        this.step = 100 / this.steps;
        this.container = document.querySelector('[x-id="loader"]');
        this.progressBar = this.container.querySelector(".progress-bar");
    }

    setSteps(steps) {
        this.steps = steps;
        this.step = 100 / steps;
    }

    addStep() {
        this.progress += this.step;
        this.progressBar.style.transform = `scaleX(${this.progress / 100})`;
        if (this.progress >= 100) {
            this.finished();
        }
    }

    finished() {
        const element = this.container;
        setTimeout(function () {
            element.classList.add("hidden");
        }, 250);
    }
}

exports.ProgressBar = ProgressBar;
