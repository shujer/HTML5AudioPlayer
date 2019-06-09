// https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Using_Web_Audio_API
var AudioVisualize = /** @class */ (function () {
    // 构造函数
    function AudioVisualize(params) {
        if (!document || !window) {
            throw Error('document not loaded');
        }
        if (!params.playButton || !params.volControl || !params.panControl || !params.visualCanvas || !params.playList) {
            throw Error('params missing');
        }
        // initial player
        this.playState = false;
        this.playList = params.playList;
        // initial audio element 
        this.audioElement = new Audio();
        this.audioElement.preload = 'none';
        this.audioElement.loop = false;
        this.audioElement.controls = true;
        this.audioElement.crossOrigin = "anonymous";
        // initial audio context 
        this.audioContext = new AudioContext();
        this.track = this.audioContext.createMediaElementSource(this.audioElement);
        // initial dom selector
        this.playButton = document.querySelector(params.playButton);
        this.volControl = document.querySelector(params.volControl);
        this.panControl = document.querySelector(params.panControl);
        this.visualCanvas = document.querySelector(params.visualCanvas);
        if (!this.playButton || !this.volControl || !this.panControl || !this.visualCanvas) {
            throw ReferenceError('selector not valied');
        }
        this.enablePlay();
    }
    // reset play list
    AudioVisualize.prototype.resetPlayList = function (playList) {
        this.playState = false;
        this.track && this.track.disconnect();
        this.gainNode && this.gainNode.disconnect();
        this.panner && this.panner.disconnect();
        this.analyser && this.analyser.disconnect();
        this.playList = playList;
        this.audioElement.src = "";
    };
    // change current audio
    AudioVisualize.prototype.changeAudio = function (index) {
        var idx = index || 0;
        if (this.playList.length <= 0 || idx > this.playList.length)
            return false;
        this.playState = false;
        this.track && this.track.disconnect();
        this.gainNode && this.gainNode.disconnect();
        this.panner && this.panner.disconnect();
        this.analyser && this.analyser.disconnect();
        this.audioElement.src = this.playList[idx].src;
        this.audioElement.load();
        this._enableControls();
        return true;
    };
    AudioVisualize.prototype._enableControls = function () {
        this.enableVolume();
        this.enablePanner();
        this.enableAnalyse();
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
            this.playButton.dataset.playing = 'true';
        }
        else {
            this.audioElement.pause();
            this.playState = false;
            this.playButton.dataset.playing = 'false';
        }
    };
    // control play
    AudioVisualize.prototype.enablePlay = function () {
        var _this = this;
        if (!this.audioElement || !this.playButton || !this.audioContext)
            return;
        this.audioContext.resume().then(function () {
            _this.playButton.addEventListener('click', _this.playHandler.bind(_this), false);
            _this.audioElement.addEventListener('ended', function () {
                _this.playState = false;
                _this.playButton.dataset.playing = 'false';
            }, false);
        })["catch"](function (err) { console.log(err); });
    };
    // control volume
    AudioVisualize.prototype.enableVolume = function () {
        var self = this;
        if (!this.volControl || !this.track || !this.audioContext) {
            return;
        }
        this.gainNode = this.audioContext.createGain();
        this.volControl.addEventListener('input', function () {
            self.gainNode.gain.value = Number(this.value);
            self.setTrack();
        }, false);
    };
    // control panner
    AudioVisualize.prototype.enablePanner = function () {
        var self = this;
        if (!this.volControl || !this.panControl || !this.track || !this.audioContext) {
            return;
        }
        this.panner = this.audioContext.createStereoPanner();
        this.panner.pan.value = 0.0;
        this.panControl.addEventListener('input', function () {
            self.panner.pan.value = Number(this.value);
            self.setTrack();
        }, false);
    };
    // drw canvas
    AudioVisualize.prototype.draw = function (analyser, dataArray, canvasCtx, WIDTH, HEIGHT, count) {
        var _this = this;
        canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
        analyser.getByteFrequencyData(dataArray);
        var value = 0, step = Math.round(dataArray.length / count), x = 0, y = 0, lineWidth = canvasCtx.lineWidth = WIDTH / count, index = count;
        canvasCtx.strokeStyle = "#fff";
        while (index) {
            value = dataArray[index * step + step];
            x = index * lineWidth;
            y = HEIGHT - value * 1.5;
            canvasCtx.beginPath();
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
