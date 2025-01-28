document.addEventListener('DOMContentLoaded', () => {
    const videoUrlInput = document.getElementById('video-url');
    const progressBar = document.getElementById('progress');
});

async function fetchVideo() {
    const videoUrlInput = document.getElementById('video-url');
    const progressBar = document.getElementById('progress');

    const videoUrl = videoUrlInput.value;
    if (!videoUrl) {
        alert('Please enter a YouTube video URL.');
        return;
    }

    try {
        const videoId = getVideoIdFromUrl(videoUrl);
        const audioUrl = await getAudioUrl(videoId);
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await fetchAudioBuffer(audioContext, audioUrl);
        const panner = audioContext.createPanner();
        panner.panningModel = 'HRTF';
        panner.distanceModel = 'inverse';
        panner.refDistance = 1;
        panner.maxDistance = 10000;
        panner.rolloffFactor = 1;
        panner.coneInnerAngle = 360;
        panner.coneOuterAngle = 0;
        panner.coneOuterGain = 0;

        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(panner);
        panner.connect(audioContext.destination);

        source.start();

        const duration = audioBuffer.duration;
        const interval = 5; // 5 seconds per rotation
        let angle = 0;

        const rotateSound = () => {
            angle += (360 / (duration / interval)) % 360;
            const x = Math.sin(angle * (Math.PI / 180));
            const z = Math.cos(angle * (Math.PI / 180));
            panner.setPosition(x, 0, z);
        };

        const updateProgress = () => {
            const currentTime = audioContext.currentTime;
            const progress = (currentTime / duration) * 100;
            progressBar.style.width = `${progress}%`;
        };

        const intervalId = setInterval(rotateSound, interval * 1000);
        const progressIntervalId = setInterval(updateProgress, 100);

        source.onended = () => {
            clearInterval(intervalId);
            clearInterval(progressIntervalId);
            progressBar.style.width = '100%';
        };
    } catch (error) {
        console.error('Error fetching video:', error);
        alert('Failed to fetch video. Please try again.');
    }
}

function getVideoIdFromUrl(url) {
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

async function getAudioUrl(videoId) {
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
    const text = await response.text();
    const regex = /"url_encoded_fmt_stream_map":\s*"([^"]+)"/;
    const match = text.match(regex);
    if (!match) {
        throw new Error('Failed to find audio URL.');
    }
    const urlEncodedFmtStreamMap = decodeURIComponent(match[1]);
    const streams = urlEncodedFmtStreamMap.split(',');
    for (const stream of streams) {
        const params = new URLSearchParams(stream);
        if (params.get('type').includes('audio')) {
            return params.get('url');
        }
    }
    throw new Error('Failed to find audio URL.');
}

async function fetchAudioBuffer(audioContext, audioUrl) {
    const response = await fetch(audioUrl);
    const arrayBuffer = await response.arrayBuffer();
    return await audioContext.decodeAudioData(arrayBuffer);
}
