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
      if ("string" === typeof source) source = JSON.parse(source);
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
      if ("string" === typeof source) source = JSON.parse(source);
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
      if ("string" === typeof source) source = JSON.parse(source);
      this.args = source["args"];
      this.outputPath = source["outputPath"];
      this.duration = source["duration"];
    }
  }
  export class ProgressEvent {
    percent: number;
    timeSec: number;
    speed: string;
    frame: number;
    status: string;
    message: string;
    outputPath: string;

    static createFrom(source: any = {}) {
      return new ProgressEvent(source);
    }

    constructor(source: any = {}) {
      if ("string" === typeof source) source = JSON.parse(source);
      this.percent = source["percent"];
      this.timeSec = source["timeSec"];
      this.speed = source["speed"];
      this.frame = source["frame"];
      this.status = source["status"];
      this.message = source["message"];
      this.outputPath = source["outputPath"];
    }
  }
  export class ProbeStream {
    index: number;
    codec_type: string;
    codec_name: string;
    codec_long_name: string;
    profile: string;
    width: number;
    height: number;
    pix_fmt: string;
    level: number;
    color_range: string;
    color_space: string;
    color_transfer: string;
    color_primaries: string;
    field_order: string;
    chroma_subsampling: string;
    bits_per_raw_sample: number;
    bits_per_sample: number;
    sample_fmt: string;
    sample_rate: string;
    channels: number;
    channel_layout: string;
    duration: string;
    bit_rate: string;
    start_time: string;
    nb_frames: string;
    r_frame_rate: string;
    time_base: string;
    tags: any;
    side_data_list: any[];
    language: string;

    static createFrom(source: any = {}) {
      return new ProbeStream(source);
    }

    constructor(source: any = {}) {
      if ("string" === typeof source) source = JSON.parse(source);
      this.index = source["index"];
      this.codec_type = source["codec_type"];
      this.codec_name = source["codec_name"];
      this.codec_long_name = source["codec_long_name"];
      this.profile = source["profile"];
      this.width = source["width"];
      this.height = source["height"];
      this.pix_fmt = source["pix_fmt"];
      this.level = source["level"];
      this.color_range = source["color_range"];
      this.color_space = source["color_space"];
      this.color_transfer = source["color_transfer"];
      this.color_primaries = source["color_primaries"];
      this.field_order = source["field_order"];
      this.chroma_subsampling = source["chroma_subsampling"];
      this.bits_per_raw_sample = source["bits_per_raw_sample"];
      this.bits_per_sample = source["bits_per_sample"];
      this.sample_fmt = source["sample_fmt"];
      this.sample_rate = source["sample_rate"];
      this.channels = source["channels"];
      this.channel_layout = source["channel_layout"];
      this.duration = source["duration"];
      this.bit_rate = source["bit_rate"];
      this.start_time = source["start_time"];
      this.nb_frames = source["nb_frames"];
      this.r_frame_rate = source["r_frame_rate"];
      this.time_base = source["time_base"];
      this.tags = source["tags"];
      this.side_data_list = source["side_data_list"];
      this.language = source["language"];
    }
  }
  export class ProbeChapter {
    id: number;
    time_base: string;
    start: number;
    start_time: string;
    end: number;
    end_time: string;
    tags: any;

    static createFrom(source: any = {}) {
      return new ProbeChapter(source);
    }

    constructor(source: any = {}) {
      if ("string" === typeof source) source = JSON.parse(source);
      this.id = source["id"];
      this.time_base = source["time_base"];
      this.start = source["start"];
      this.start_time = source["start_time"];
      this.end = source["end"];
      this.end_time = source["end_time"];
      this.tags = source["tags"];
    }
  }
  export class ExtendedMediaInfo {
    path: string;
    filename: string;
    format: any;
    streams: main.ProbeStream[];
    chapters: main.ProbeChapter[];
    tags: any;
    rawJson: string;
    sizeHuman: string;

    static createFrom(source: any = {}) {
      return new ExtendedMediaInfo(source);
    }

    constructor(source: any = {}) {
      if ("string" === typeof source) source = JSON.parse(source);
      this.path = source["path"];
      this.filename = source["filename"];
      this.format = source["format"];
      this.streams = source["streams"];
      this.chapters = source["chapters"];
      this.tags = source["tags"];
      this.rawJson = source["rawJson"];
      this.sizeHuman = source["sizeHuman"];
    }
  }
  export class InputDevice {
    kind: string;
    name: string;
    desc: string;
    default: boolean;

    static createFrom(source: any = {}) {
      return new InputDevice(source);
    }

    constructor(source: any = {}) {
      if ("string" === typeof source) source = JSON.parse(source);
      this.kind = source["kind"];
      this.name = source["name"];
      this.desc = source["desc"];
      this.default = source["default"];
    }
  }
}
