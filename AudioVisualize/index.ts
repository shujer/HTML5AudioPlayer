// https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Using_Web_Audio_API

interface Params {
    audio?: string;
    playButton?: string;
    volControl?: string;
    panControl?: string;
    visualCanvas?: string;
}


class AudioVisualize {
    // 声明全局变量
    private audioContext: AudioContext;
    private audioElement: HTMLAudioElement;
    private track: MediaElementAudioSourceNode;
    private playButton: HTMLButtonElement;
    private volControl: HTMLInputElement;
    private panControl: HTMLInputElement;
    private visualCanvas: HTMLCanvasElement;
    private gainNode: GainNode;
    private panner: StereoPannerNode;
    private playState: boolean;
    private handler: EventListenerObject;
    // 构造函数
    public constructor (params: Params) {
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
    public setAudio (audio: string): void {
        this.playState = false;
        this.audioElement = document.querySelector(audio);
        this.audioElement.load();
        this.audioContext = new AudioContext();
        this.track = this.audioContext.createMediaElementSource(this.audioElement);
    }

    private playHandler () {
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        if (this.playState === false) {
            this.audioElement.play();
            this.playState = true;
        } else {
            this.audioElement.pause();
            this.playState = false;
        }
        this.playButton.setAttribute('data-playing', this.playState ? "true" : "false");
    }
    // control play
    public enablePlay (): void {
        if (!this.audioElement || !this.playButton || !this.audioContext) return;
        let slef = this;
        this.audioContext.resume().then(() => {
            if (this.handler) {
                this.playButton.removeEventListener('click', this.handler, false);
            }
            this.handler = this.playHandler.bind(this);
            this.playButton.addEventListener('click', this.handler, false);
            this.audioElement.addEventListener('ended', function () {
                slef.playState === false;
            }, false);
        }).catch(err => { console.log(err) });
    }
    // control volume and panner
    public enableControls (): void {

        if (!this.volControl || !this.panControl || !this.track || !this.audioContext) {
            return;
        }
        let self = this, pannerOptions = { pan: 0 };
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
    }

    private draw (analyser: AnalyserNode,
        dataArray: Uint8Array,
        canvasCtx: CanvasRenderingContext2D,
        WIDTH: number,
        HEIGHT: number,
        count: number): void {
        canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
        analyser.getByteFrequencyData(dataArray);
        let value = 0,
            step = Math.round(dataArray.length / count),
            x = 0,
            y = 0,
            lineWidth = canvasCtx.lineWidth = WIDTH / count,
            index = count;
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
        requestAnimationFrame(() => this.draw(analyser, dataArray, canvasCtx, WIDTH, HEIGHT, count));
    };
    // visualize
    public enableAnalyse (): void {
        if (!this.audioContext || !this.visualCanvas) return;
        if (this.visualCanvas.getContext('2d')) {
            let canvasCtx = this.visualCanvas.getContext('2d'),
                analyser = this.audioContext.createAnalyser(),
                WIDTH = this.visualCanvas.width,
                HEIGHT = this.visualCanvas.height;
            this.track.connect(this.gainNode).connect(this.panner).connect(analyser).connect(this.audioContext.destination);
            let dataArray = new Uint8Array(analyser.frequencyBinCount);
            let count = Math.min(50, dataArray.length)
            // draw an oscilloscope of the current audio source
            this.draw(analyser, dataArray, canvasCtx, WIDTH, HEIGHT, count);
        }
    }
}