window.addEventListener("load", () => {
    const outputArea = document.querySelector(".data-output");

    const Canvas = class {
        constructor(controls) {
            this.controls = controls;
            this.dataFormat = "2";

            this.thickness = 16;
            this.color = "#000000";
            this.lines = [];
            this.history = [];

            this.canvas = document.querySelector(".canvas");
            this.ctx = this.canvas.getContext("2d");
            this.width = 600;
            this.height = 600;
            this.resize();
            window.addEventListener("resize", this.resize.bind(this));

            this.canvas.addEventListener("mousedown", this.onMouseDown.bind(this));
            document.addEventListener("mousemove", this.onMouseOver.bind(this));
            document.addEventListener("mouseup", this.onMouseUp.bind(this));
            this.canvas.addEventListener("touchstart", this.onTouchStart.bind(this));
            document.addEventListener("touchmove", this.onTouchMove.bind(this));
            document.addEventListener("touchend", this.onTouchEnd.bind(this));

            outputArea.addEventListener("click", () => outputArea.select());
        }

        resize() {
            const area = document.querySelector(".canvas-area");
            const padding = 20;
            this.scale = Math.max(0.2, Math.min((area.clientWidth - padding * 2) / this.width, (area.clientHeight - padding * 2) / this.height));
            this.setSize();
        }

        setSize() {
            this.canvas.width = this.width * this.scale;
            this.canvas.height = this.height * this.scale;
            this.renderCanvas();
        }

        getEventPoint(e) {
            const rect = this.canvas.getBoundingClientRect();
            return {
                x: (e.clientX - rect.left) * (1 / this.scale),
                y: (e.clientY - rect.top) * (1 / this.scale)
            };
        }

        onMouseDown(e) {
            e.preventDefault();
            this.onDown(this.getEventPoint(e));
        }

        onMouseOver(e) {
            if (this.isInteracting) this.onMove(this.getEventPoint(e));
        }

        onMouseUp(e) {
            if (this.isInteracting) {
                e.preventDefault();
                this.onUp();
            }
        }

        onTouchStart(e) {
            e.preventDefault();
            this.onDown(this.getEventPoint(e.touches[0]));
        }

        onTouchMove(e) {
            if (this.isInteracting) this.onMove(this.getEventPoint(e.touches[0]));
        }

        onTouchEnd(e) {
            this.onMouseUp(e);
        }

        onDown(e) {
            this.isInteracting = true;
            this.addLine(e);
            this.controls.disableButtons();
        }

        onMove(e) {
            if (!this.isInteracting) return;

            const last = this.lastPoint;
            if (!last) {
                this.addPoint(e);
                return;
            }

            const thickness = this.thickness * 0.5;
            const i = {
                x: e.x - last.x,
                y: e.y - last.y
            };
            const n = Math.sqrt(Math.pow(i.x, 2) + Math.pow(i.y, 2));
            if (n > thickness) {
                const b = (n - thickness) / n;
                const a = {
                    x: i.x * b,
                    y: i.y * b
                };
                const point = {
                    x: last.x + a.x,
                    y: last.y + a.y
                };
                this.addPoint(point);
            }
        }

        onUp() {
            if (this.isInteracting) {
                this.isInteracting = false;
                this.endLine();
            }
        }

        addLine(e) {
            this.lines.push({
                color: this.color,
                thickness: this.thickness,
                points: []
            });
            this.addPoint(e);
        }

        get lastLine() {
            return this.lines[this.lines.length - 1];
        }

        addPoint(e) {
            const last = this.lastLine;
            if (!last || !last.points) return;

            const point = {
                x: Math.round(Math.min(Math.max(last.thickness * 0.5, e.x), this.width - last.thickness * 0.5)),
                y: Math.round(Math.min(Math.max(last.thickness * 0.5, e.y), this.height - last.thickness * 0.5))
            };
            last.points.push(point);
            this.renderCanvas();
        }

        get lastPoint() {
            const line = this.lastLine;
            if (line && line.points) return line.points[line.points.length - 1];
        }

        endLine() {
            this.renderCanvas();
            this.history = [];
            this.controls.updateButtons();
        }

        createPointData(points) {
            switch (this.dataFormat) {
                case "1":
                    return points;
                case "2":
                    return points.map(p => `${p.x},${p.y}`).join("|");
            }
        }

        exportLines() {
            return this.lines.map(l => Object.assign(Object.assign({}, l), {
                points: this.createPointData(l.points)
            }));
        }

        renderCanvas() {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.lines.forEach(this.drawLine.bind(this));
            this.updateOutput();
        }

        updateOutput() {
            outputArea.value = this.lines.length ? JSON.stringify(this.exportLines()) : "";
        }

        drawLine(line) {
            this.ctx.strokeStyle = line.color;
            this.ctx.fillStyle = line.color;
            this.ctx.lineWidth = line.thickness * this.scale;
            this.ctx.lineCap = "round";
            this.ctx.lineJoin = "round";
            this.ctx.beginPath();
            line.points.forEach((p, i) => {
                if (!i) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(p.x * this.scale, p.y * this.scale);
                }
                this.ctx.lineTo(p.x * this.scale, p.y * this.scale);
            });
            this.ctx.stroke();
        }

        undoLine() {
            if (this.lines.length) {
                this.history.push(this.lines.pop());
                this.renderCanvas();
            }
        }

        redoLine() {
            if (this.history.length) {
                this.lines.push(this.history.pop());
                this.renderCanvas();
            }
        }

        clearAll() {
            this.lines = [];
            this.history = [];
            this.renderCanvas();
        }
    };

    const CanvasControls = class {
        constructor() {
            this.canvas = new Canvas(this);

            this.inputs = {
                width: document.querySelector("#input-width"),
                height: document.querySelector("#input-height")
            };
            this.inputs.width.addEventListener("input", () => {
                this.canvas.width = this.inputs.width.value;
                this.canvas.resize();
            });
            this.inputs.height.addEventListener("input", () => {
                this.canvas.height = this.inputs.height.value;
                this.canvas.resize();
            });

            this.inputs.width.value = this.canvas.width;
            this.inputs.height.value = this.canvas.height;

            this.buttons = {
                undo: document.querySelector(".button-undo"),
                redo: document.querySelector(".button-redo"),
                erase: document.querySelector(".button-erase")
            };

            this.buttons.undo.addEventListener("click", () => {
                this.canvas.undoLine();
                this.updateButtons();
            });
            this.buttons.redo.addEventListener("click", () => {
                this.canvas.redoLine();
                this.updateButtons();
            });
            this.buttons.erase.addEventListener("click", () => {
                if (confirm("This will erase your entire drawing. Are you sure?")) this.canvas.clearAll();
                this.updateButtons();
            });

            this.colorInput = document.querySelector("#input-color");
            this.colorInput.addEventListener("input", () => this.canvas.color = this.colorInput.value);
            this.colorInput.value = this.canvas.color;

            this.thicknessSlider = document.querySelector("#slider-thickness");
            this.thicknessInput = document.querySelector("#input-thickness");
            this.thicknessSlider.addEventListener("input", () => this.updateThickness(this.thicknessSlider.value));
            this.thicknessInput.addEventListener("input", () => this.updateThickness(this.thicknessInput.value));

            this.dataFormat = document.querySelector("#input-dataformat");
            this.dataFormat.addEventListener("input", () => {
                this.canvas.dataFormat = this.dataFormat.value;
                this.canvas.updateOutput();
            });

            this.updateButtons();
        }

        disableButtons() {
            Object.values(this.buttons).forEach(b => b.disabled = true);
        }

        updateButtons() {
            this.buttons.undo.disabled = !this.canvas.lines.length;
            this.buttons.redo.disabled = !this.canvas.history.length;
            this.buttons.erase.disabled = !this.canvas.lines.length;
        }

        updateThickness(v) {
            const val = Math.min(Math.max(v, 0), 1000);
            this.thicknessSlider.value = val;
            this.thicknessInput.value = val;
            this.canvas.thickness = Math.max(val, 1);
        }
    };

    new CanvasControls();
});