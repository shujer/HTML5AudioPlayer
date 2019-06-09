// https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Using_Web_Audio_API

interface Params {
    playButton: string;
    volControl: string;
    panControl: string;
    visualCanvas: string;
    playList: PlayList[];
}

interface PlayList {
    src: string;
    type: string;
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
    private analyser: AnalyserNode;
    private playList: PlayList[];
    private playState: boolean;
    private playListener: EventListenerObject;
    // 构造函数
    public constructor (params: Params) {
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
    }

    public resetPlayList (playList: PlayList[]): void {
        this.track && this.track.disconnect();
        this.gainNode && this.gainNode.disconnect();
        this.panner && this.panner.disconnect();
        this.analyser && this.analyser.disconnect();
        this.playList = playList;
        this.audioElement.src = "";
    }

    public changeAudio (index: number): boolean {
        let idx = index || 0;
        if (this.playList.length <= 0 || idx > this.playList.length) return false;
        this.track && this.track.disconnect();
        this.gainNode && this.gainNode.disconnect();
        this.panner && this.panner.disconnect();
        this.analyser && this.analyser.disconnect();
        this.audioElement.src = this.playList[idx].src;
        this.audioElement.load();
        this._enableControls();
        return true;
    }

    private _enableControls () {
        this.enableVolume();
        this.enablePanner();
        this.enableAnalyse();
        this.enablePlay();
    }

    // connect to audio track
    private setTrack () {
        this.track.connect(this.gainNode)
            .connect(this.panner)
            .connect(this.analyser)
            .connect(this.audioContext.destination);
    }

    private playHandler () {
        if (this.playState === false) {
            this.audioElement.play();
            this.playState = true;
            this.playButton.dataset.playing = 'true';
        } else {
            this.audioElement.pause();
            this.playState = false;
            this.playButton.dataset.playing = 'false';
        }
    }
    // control play
    private enablePlay (): void {
        let slef = this;
        if (!this.audioElement || !this.playButton || !this.audioContext) return;
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
    // control volume
    private enableVolume (): void {
        let self = this;
        if (!this.volControl || !this.track || !this.audioContext) {
            return;
        }
        this.gainNode && this.gainNode.disconnect();
        this.gainNode = this.audioContext.createGain();
        this.volControl.addEventListener('input', function () {
            self.gainNode.gain.value = Number(this.value);
            self.setTrack();
        }, false);
    }
    // control panner
    private enablePanner (): void {
        let self = this;
        if (!this.volControl || !this.panControl || !this.track || !this.audioContext) {
            return;
        }
        this.panner = this.audioContext.createStereoPanner();
        this.panner.pan.value = 0.0;
        this.panControl.addEventListener('input', function () {
            self.panner.pan.value = Number(this.value);
            self.setTrack();
        }, false);
    }

    // drw canvas
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
    // controls visualize
    public enableAnalyse (): void {
        if (!this.audioContext || !this.visualCanvas) return;
        if (this.visualCanvas.getContext('2d')) {
            let canvasCtx = this.visualCanvas.getContext('2d'),
                WIDTH = this.visualCanvas.width,
                HEIGHT = this.visualCanvas.height;
            this.analyser = this.audioContext.createAnalyser();
            this.setTrack();
            let dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            let count = Math.min(70, dataArray.length)
            // draw an oscilloscope of the current audio source
            this.draw(this.analyser, dataArray, canvasCtx, WIDTH, HEIGHT, count);
        }
    }
}