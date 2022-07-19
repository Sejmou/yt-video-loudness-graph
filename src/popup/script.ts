const audio = document.getElementById('audio')! as HTMLAudioElement;
const canvas = document.getElementById('canvas')! as HTMLCanvasElement;
let reqAnimFrameRef: number | null;
const actx = new AudioContext();
const ctx = initRenderContext();
const videoID = 'YBPYlWyKn5E';
let x = 0; // TODO: figure out what exactly x is lool

async function run() {
  const audioURL = (await fetchVideoAudio(videoID)) as string; // not sure why TS thinks we might get back false or undefined!?
  console.log('audio URL', audioURL);
  await renderWaves(audioURL);
}

export default run;

// TODO: replace all the anys with something meaningful

// adapted from https://stackoverflow.com/a/45375023/13727176
async function fetchVideoAudio(videoID: string) {
  const audioStreams = new Map<string, string>();

  const response = await fetch(
    'https://images' +
      ~~(Math.random() * 33) +
      '-focus-opensocial.googleusercontent.com/gadgets/proxy?container=none&url=' +
      encodeURIComponent('https://www.youtube.com/watch?hl=en&v=' + videoID)
  );

  if (response.ok) {
    let data: any = await response.text();

    const regex =
      /(?:ytplayer\.config\s*=\s*|ytInitialPlayerResponse\s?=\s?)(.+?)(?:;var|;\(function|\)?;\s*if|;\s*if|;\s*ytplayer\.|;\s*<\/script)/gmsu;

    data = data.split('window.getPageData')[0];
    data = data.replace('ytInitialPlayerResponse = null', '');
    data = data.replace(
      'ytInitialPlayerResponse=window.ytInitialPlayerResponse',
      ''
    );
    data = data.replace(
      'ytplayer.config={args:{raw_player_response:ytInitialPlayerResponse}};',
      ''
    );

    const matches = regex.exec(data);
    data = matches && matches.length > 1 ? JSON.parse(matches[1]) : false;

    console.log(data);

    let streams: any[] = [];

    if (data.streamingData) {
      if (data.streamingData.adaptiveFormats) {
        streams = streams.concat(data.streamingData.adaptiveFormats);
      }

      if (data.streamingData.formats) {
        streams = streams.concat(data.streamingData.formats);
      }
    } else {
      return false;
    }

    streams.forEach(function (stream, n) {
      const itag = stream.itag * 1;
      let quality = '';
      console.log(stream);
      switch (itag) {
        case 139:
          quality = '48kbps';
          break;
        case 140:
          quality = '128kbps';
          break;
        case 141:
          quality = '256kbps';
          break;
        case 249:
          quality = 'webm_l';
          break;
        case 250:
          quality = 'webm_m';
          break;
        case 251:
          quality = 'webm_h';
          break;
      }
      if (quality) audioStreams.set(quality, stream.url);
    });

    console.log(audioStreams);

    audio.src =
      audioStreams.get('256kbps') ||
      audioStreams.get('128kbps') ||
      audioStreams.get('48kbps') ||
      '';

    if (!audio.src) {
      throw Error('No audio stream found!');
    }
    //audio.play();
    return audio.src;
  }
}

// adapted from https://stackoverflow.com/a/48033566/13727176
function initRenderContext() {
  const ctx = canvas.getContext('2d')!;
  ctx.font = '20px sans-serif';
  ctx.fillText('Loading and processing...', 10, 50);
  ctx.fillStyle = '#001730';
  return ctx;
}

async function renderWaves(url: string) {
  // Load audio
  fetch(url, { mode: 'cors' })
    .then(resp => {
      console.log(resp);
      return resp.arrayBuffer();
    })
    .then(arrayBuffer => {
      console.log('arraybuffer', arrayBuffer);
      return actx.decodeAudioData(arrayBuffer);
    })
    //.then(actx.decodeAudioData.bind(actx))
    .then(buffer => {
      // Get data from channel 0 (you will want to measure all/avg.)
      const channel = buffer.getChannelData(0);

      // dB per window + Plot
      const points = [0];
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.moveTo(x, canvas.height);
      for (let x = 1, i, v; x < canvas.width; x++) {
        i = ((x / canvas.width) * channel.length) | 0; // get index in buffer based on x
        v = Math.abs(dB(channel, i, 8820)) / 40; // 200ms window, normalize
        ctx.lineTo(x, canvas.height * v);
        points.push(v);
      }
      ctx.fill();

      // smooth using bins
      const bins = 40; // segments
      const range = (canvas.width / bins) | 0;
      let sum;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height);
      for (let x = 0; x < points.length; x++) {
        let v = 0;
        for (let i = 0; i < range; i++) {
          v += points[x++];
        }
        sum = v / range;
        ctx.lineTo(x - (range >> 1), sum * canvas.height); //-r/2 to compensate visually
      }
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#c00';
      ctx.stroke();

      // for audio / progressbar only
      canvas.style.backgroundImage = 'url(' + canvas.toDataURL() + ')';
      canvas.width = canvas.width;
      ctx.fillStyle = '#c00';
      // audio = document.querySelector('audio');
      audio.onplay = start;
      audio.onended = stop;
      audio.style.display = 'block';
    });
}

// calculates RMS per window and returns dB
function dB(buffer: any, pos: number, winSize: number) {
  let sum = 0;
  for (let v, i = pos - winSize; i <= pos; i++) {
    v = i < 0 ? 0 : buffer[i];
    sum += v * v;
  }
  const rms = Math.sqrt(sum / winSize); // corrected!
  return 20 * Math.log10(rms);
}

// for progress bar (audio)
function start() {
  if (!reqAnimFrameRef) reqAnimFrameRef = requestAnimationFrame(progress);
}
function stop() {
  if (reqAnimFrameRef !== null) cancelAnimationFrame(reqAnimFrameRef);
  reqAnimFrameRef = null;
}
function progress() {
  x = (audio.currentTime / audio.duration) * canvas.width;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillRect(x - 1, 0, 2, canvas.height);
  reqAnimFrameRef = requestAnimationFrame(progress);
}
