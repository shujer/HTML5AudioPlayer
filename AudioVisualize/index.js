// https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Using_Web_Audio_API
var AudioVisualize = /** @class */ (function () {
    // 构造函数
    function AudioVisualize(params) {
        if (!document || !window) {
            throw Error('document not loaded');
        }
        if (params.audio) {
            this.playState = false;
            this.audioElement = document.querySelector(params.audio);
            this.audioElement.load();
            this.audioContext = new AudioContext();
            this.track = this.audioContext.createMediaElementSource(this.audioElement);
        }
        if (params.playButton) {
            this.playButton = document.querySelector(params.playButton);
        }
        if (params.volControl) {
            this.volControl = document.querySelector(params.volControl);
        }
        if (params.panControl) {
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
    AudioVisualize.prototype.enableControls = function () {
        this.enableVolume();
        this.enablePanner();
        this.enablePlay();
    };
    // connect to audio track
    AudioVisualize.prototype.setTrack = function () {
        this.track.connect(this.gainNode)
            .connect(this.panner)
            .connect(this.analyser)
            .connect(this.audioContext.destination);
    };
    AudioVisualize.prototype.playHandler = function () {
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
            if (_this.playListener) {
                _this.playButton.removeEventListener('click', _this.playListener, false);
            }
            _this.playListener = _this.playHandler.bind(_this);
            _this.playButton.addEventListener('click', _this.playListener, false);
            _this.audioElement.addEventListener('ended', function () {
                slef.playState === false;
            }, false);
        })["catch"](function (err) { console.log(err); });
    };
    // control volume
    AudioVisualize.prototype.enableVolume = function () {
        if (!this.volControl || !this.track || !this.audioContext) {
            return;
        }
        this.gainNode = this.audioContext.createGain();
        var self = this;
        this.volControl.addEventListener('input', function () {
            self.gainNode.gain.value = Number(this.value);
            self.setTrack();
        }, false);
    };
    // control panner
    AudioVisualize.prototype.enablePanner = function () {
        if (!this.volControl || !this.panControl || !this.track || !this.audioContext) {
            return;
        }
        this.panner = this.audioContext.createStereoPanner();
        this.panner.pan.value = 0.0;
        var self = this;
        this.panControl.addEventListener('input', function () {
            self.panner.pan.value = Number(this.value);
            self.setTrack();
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
            y = HEIGHT - value * 1.5;
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
    // controls visualize
    AudioVisualize.prototype.enableAnalyse = function () {
        if (!this.audioContext || !this.visualCanvas)
            return;
        if (this.visualCanvas.getContext('2d')) {
            var canvasCtx = this.visualCanvas.getContext('2d'), WIDTH = this.visualCanvas.width, HEIGHT = this.visualCanvas.height;
            this.analyser = this.audioContext.createAnalyser();
            this.setTrack();
            var dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            var count = Math.min(70, dataArray.length);
            // draw an oscilloscope of the current audio source
            this.draw(this.analyser, dataArray, canvasCtx, WIDTH, HEIGHT, count);
        }
    };
    return AudioVisualize;
}());
