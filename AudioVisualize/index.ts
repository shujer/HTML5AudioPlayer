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
    private playListener: EventListenerObject;
    private analyser: AnalyserNode;
    // 构造函数
    public constructor (params: Params) {
        if (!document || !window) {
            throw Error('document not loaded');
        }
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
    // connect to audio track
    private setTrack () {
        this.track.connect(this.gainNode).connect(this.panner).connect(this.analyser).connect(this.audioContext.destination); 
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
            if (this.playListener) {
                this.playButton.removeEventListener('click', this.playListener, false);
            }
            this.playListener = this.playHandler.bind(this);
            this.playButton.addEventListener('click', this.playListener, false);
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
        let pannerOptions = { pan: 0 };
        this.gainNode = this.audioContext.createGain();
        this.panner = this.audioContext.createStereoPanner();
        this.panner.pan.value = 0.0;
        let self = this; 
        this.volControl.addEventListener('input', function () {
            self.gainNode.gain.value = Number(this.value);
            self.setTrack();
        }, false);
        this.panControl.addEventListener('input', function () {
            self.panner.pan.value = Number(this.value);
            self.setTrack();
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
            y = HEIGHT - value * 1.5;
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
                WIDTH = this.visualCanvas.width,
                HEIGHT = this.visualCanvas.height;
            this.analyser = this.audioContext.createAnalyser();
            this.setTrack();
            let dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            let count = Math.min(50, dataArray.length)
            // draw an oscilloscope of the current audio source
            this.draw(this.analyser, dataArray, canvasCtx, WIDTH, HEIGHT, count);
        }
    }
}