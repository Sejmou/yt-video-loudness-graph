const audio = document.getElementById('audio');
let ref;
const actx = new (AudioContext || webkitAudioContext)();
const ctx = initRenderContext();
const videoID = '3r_Z5AYJJd4';

async function run() {
  const audioURL = await fetchVideoAudio(videoID);
  console.log('audio URL', audioURL);
}

run();

// adapted from https://stackoverflow.com/a/45375023/13727176
async function fetchVideoAudio(videoID) {
  const audio_streams = {};

  const response = await fetch(
    'https://images' +
      ~~(Math.random() * 33) +
      '-focus-opensocial.googleusercontent.com/gadgets/proxy?container=none&url=' +
      encodeURIComponent('https://www.youtube.com/watch?hl=en&v=' + videoID)
  );

  if (response.ok) {
    let data = await response.text();

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

    let streams = [];

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
      let quality = false;
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
      if (quality) audio_streams[quality] = stream.url;
    });

    console.log(audio_streams);

    audio.src =
      audio_streams['256kbps'] ||
      audio_streams['128kbps'] ||
      audio_streams['48kbps'];
    audio.play();
    return audio.src;
  }
}

// adapted from https://stackoverflow.com/a/48033566/13727176
function initRenderContext() {
  const ctx = c.getContext('2d');
  ctx.font = '20px sans-serif';
  ctx.fillText('Loading and processing...', 10, 50);
  ctx.fillStyle = '#001730';
  return ctx;
}

function renderWaves(url) {
  // Load audio
  fetch(url, { mode: 'cors' })
    .then(function (resp) {
      return resp.arrayBuffer();
    })
    .then(actx.decodeAudioData.bind(actx))
    .then(function (buffer) {
      // Get data from channel 0 (you will want to measure all/avg.)
      const channel = buffer.getChannelData(0);

      // dB per window + Plot
      const points = [0];
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.moveTo(x, c.height);
      for (let x = 1, i, v; x < c.width; x++) {
        i = ((x / c.width) * channel.length) | 0; // get index in buffer based on x
        v = Math.abs(dB(channel, i, 8820)) / 40; // 200ms window, normalize
        ctx.lineTo(x, c.height * v);
        points.push(v);
      }
      ctx.fill();

      // smooth using bins
      const bins = 40; // segments
      const range = (c.width / bins) | 0;
      let sum;
      ctx.beginPath();
      ctx.moveTo(0, c.height);
      for (x = 0, v; x < points.length; x++) {
        for (v = 0, i = 0; i < range; i++) {
          v += points[x++];
        }
        sum = v / range;
        ctx.lineTo(x - (range >> 1), sum * c.height); //-r/2 to compensate visually
      }
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#c00';
      ctx.stroke();

      // for audio / progressbar only
      c.style.backgroundImage = 'url(' + c.toDataURL() + ')';
      c.width = c.width;
      ctx.fillStyle = '#c00';
      // audio = document.querySelector('audio');
      audio.onplay = start;
      audio.onended = stop;
      audio.style.display = 'block';
    });
}

// calculates RMS per window and returns dB
function dB(buffer, pos, winSize) {
  for (let rms, sum = 0, v, i = pos - winSize; i <= pos; i++) {
    v = i < 0 ? 0 : buffer[i];
    sum += v * v;
  }
  rms = Math.sqrt(sum / winSize); // corrected!
  return 20 * Math.log10(rms);
}

// for progress bar (audio)
function start() {
  if (!ref) ref = requestAnimationFrame(progress);
}
function stop() {
  cancelAnimationFrame(ref);
  ref = null;
}
function progress() {
  const x = (audio.currentTime / audio.duration) * c.width;
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.fillRect(x - 1, 0, 2, c.height);
  ref = requestAnimationFrame(progress);
}
