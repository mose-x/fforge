export namespace main {
	
	export class EngineStatus {
	    ffmpegAvailable: boolean;
	    ffprobeAvailable: boolean;
	    ffmpegPath: string;
	    ffprobePath: string;
	    version: string;
	
	    static createFrom(source: any = {}) {
	        return new EngineStatus(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.ffmpegAvailable = source["ffmpegAvailable"];
	        this.ffprobeAvailable = source["ffprobeAvailable"];
	        this.ffmpegPath = source["ffmpegPath"];
	        this.ffprobePath = source["ffprobePath"];
	        this.version = source["version"];
	    }
	}
	export class MediaInfo {
	    path: string;
	    filename: string;
	    duration: number;
	    durationStr: string;
	    width: number;
	    height: number;
	    codec: string;
	    audioCodec: string;
	    container: string;
	    sizeBytes: number;
	    sizeHuman: string;
	    bitRate: number;
	    fps: number;
	
	    static createFrom(source: any = {}) {
	        return new MediaInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.filename = source["filename"];
	        this.duration = source["duration"];
	        this.durationStr = source["durationStr"];
	        this.width = source["width"];
	        this.height = source["height"];
	        this.codec = source["codec"];
	        this.audioCodec = source["audioCodec"];
	        this.container = source["container"];
	        this.sizeBytes = source["sizeBytes"];
	        this.sizeHuman = source["sizeHuman"];
	        this.bitRate = source["bitRate"];
	        this.fps = source["fps"];
	    }
	}
	export class RunRequest {
	    args: string[];
	    outputPath: string;
	    duration: number;
	
	    static createFrom(source: any = {}) {
	        return new RunRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.args = source["args"];
	        this.outputPath = source["outputPath"];
	        this.duration = source["duration"];
	    }
	}

}

