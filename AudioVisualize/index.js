// https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Using_Web_Audio_API
var AudioVisualize = /** @class */ (function () {
    // 构造函数
    function AudioVisualize(params) {
        if (!document || !window) {
            throw Error('document not loaded');
        }
        this.playState = false;
        if (params.playButton) {
            this.playButton = document.querySelector(params.playButton);
        }
        if (params.volControl && params.panControl) {
            this.volControl = document.querySelector(params.volControl);
            this.panControl = document.querySelector(params.panControl);
        }
        if (params.visualCanvas) {
            this.visualCanvas = document.querySelector(params.visualCanvas);
        }
    }
    // set audio source
    AudioVisualize.prototype.setAudio = function (audio) {
        this.playState = false;
        this.audioElement = document.querySelector(audio);
        this.audioElement.load();
        this.audioContext = new AudioContext();
        this.track = this.audioContext.createMediaElementSource(this.audioElement);
    };
    AudioVisualize.prototype.playHandler = function () {
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        if (this.playState === false) {
            this.audioElement.play();
            this.playState = true;
        }
        else {
            this.audioElement.pause();
            this.playState = false;
        }
        this.playButton.setAttribute('data-playing', this.playState ? "true" : "false");
    };
    // control play
    AudioVisualize.prototype.enablePlay = function () {
        var _this = this;
        if (!this.audioElement || !this.playButton || !this.audioContext)
            return;
        var slef = this;
        this.audioContext.resume().then(function () {
            if (_this.handler) {
                _this.playButton.removeEventListener('click', _this.handler, false);
            }
            _this.handler = _this.playHandler.bind(_this);
            _this.playButton.addEventListener('click', _this.handler, false);
            _this.audioElement.addEventListener('ended', function () {
                slef.playState === false;
            }, false);
        })["catch"](function (err) { console.log(err); });
    };
    // control volume and panner
    AudioVisualize.prototype.enableControls = function () {
        if (!this.volControl || !this.panControl || !this.track || !this.audioContext) {
            return;
        }
        var self = this, pannerOptions = { pan: 0 };
        this.gainNode = new GainNode(this.audioContext);
        this.panner = new StereoPannerNode(this.audioContext, pannerOptions);
        this.volControl.addEventListener('input', function () {
            self.gainNode.gain.value = Number(this.value);
            self.track.connect(self.gainNode).connect(self.panner).connect(self.audioContext.destination);
        }, false);
        this.panControl.addEventListener('input', function () {
            self.panner.pan.value = Number(this.value);
            self.track.connect(self.gainNode).connect(self.panner).connect(self.audioContext.destination);
        }, false);
    };
    AudioVisualize.prototype.draw = function (analyser, dataArray, canvasCtx, WIDTH, HEIGHT, count) {
        var _this = this;
        canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
        analyser.getByteFrequencyData(dataArray);
        var value = 0, step = Math.round(dataArray.length / count), x = 0, y = 0, lineWidth = canvasCtx.lineWidth = WIDTH / count, index = count;
        while (index) {
            value = dataArray[index * step + step];
            x = index * lineWidth;
            y = HEIGHT - value;
            canvasCtx.beginPath();
            canvasCtx.strokeStyle = "#fff";
            canvasCtx.moveTo(x, HEIGHT);
            canvasCtx.lineTo(x, y);
            canvasCtx.stroke();
            index -= 2;
        }
        requestAnimationFrame(function () { return _this.draw(analyser, dataArray, canvasCtx, WIDTH, HEIGHT, count); });
    };
    ;
    // visualize
    AudioVisualize.prototype.enableAnalyse = function () {
        if (!this.audioContext || !this.visualCanvas)
            return;
        if (this.visualCanvas.getContext('2d')) {
            var canvasCtx = this.visualCanvas.getContext('2d'), analyser = this.audioContext.createAnalyser(), WIDTH = this.visualCanvas.width, HEIGHT = this.visualCanvas.height;
            this.track.connect(this.gainNode).connect(this.panner).connect(analyser).connect(this.audioContext.destination);
            var dataArray = new Uint8Array(analyser.frequencyBinCount);
            var count = Math.min(50, dataArray.length);
            // draw an oscilloscope of the current audio source
            this.draw(analyser, dataArray, canvasCtx, WIDTH, HEIGHT, count);
        }
    };
    return AudioVisualize;
}());
