let player;
let audioContext;
let panner;
let source;
let intervalId;
let progressIntervalId;

function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
        height: '360',
        width: '640',
        videoId: '',
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

function onPlayerReady(event) {
    event.target.playVideo();
}

function onPlayerStateChange(event) {
    if (event.data == YT.PlayerState.PLAYING) {
        startPanning();
    } else if (event.data == YT.PlayerState.PAUSED || event.data == YT.PlayerState.ENDED) {
        stopPanning();
    }
}

function startPanning() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    panner = audioContext.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 1;
    panner.maxDistance = 10000;
    panner.rolloffFactor = 1;
    panner.coneInnerAngle = 360;
    panner.coneOuterAngle = 0;
    panner.coneOuterGain = 0;

    source = audioContext.createMediaStreamSource(player.getInternalPlayer().getAudioStream());
    source.connect(panner);
    panner.connect(audioContext.destination);

    let angle = 0;
    const interval = 5; // 5 seconds per rotation

    const rotateSound = () => {
        angle += (360 / (player.getDuration() / interval)) % 360;
        const x = Math.sin(angle * (Math.PI / 180));
        const z = Math.cos(angle * (Math.PI / 180));
        panner.setPosition(x, 0, z);
    };

    intervalId = setInterval(rotateSound, interval * 1000);
    progressIntervalId = setInterval(updateProgress, 100);
}

function stopPanning() {
    if (intervalId) clearInterval(intervalId);
    if (progressIntervalId) clearInterval(progressIntervalId);
    if (source) source.disconnect();
    if (panner) panner.disconnect();
}

function updateProgress() {
    const currentTime = player.getCurrentTime();
    const duration = player.getDuration();
    const progress = (currentTime / duration) * 100;
    document.getElementById('progress').style.width = `${progress}%`;
}

function fetchVideo() {
    const videoUrl = document.getElementById('video-url').value;
    if (!videoUrl) {
        alert('Please enter a YouTube video URL.');
        return;
    }

    const videoId = getVideoIdFromUrl(videoUrl);
    if (!videoId) {
        alert('Invalid YouTube video URL.');
        return;
    }

    player.loadVideoById(videoId);
}

function getVideoIdFromUrl(url) {
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

// Load the IFrame Player API code asynchronously.
const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
const firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
