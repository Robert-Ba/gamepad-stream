const videoTag = $('#stream-video');
const streamMediaSource = new MediaSource();
const url = URL.createObjectURL(streamMediaSource);
streamMediaSource.addEventListener('sourceopen', sourceOpen);
videoTag.src = url;

var playStream = true;

function sourceOpen() {
    const audioSourceBuffer = streamMediaSource
        .addSourceBuffer('audio/mp4; codecs="mp4a.40.2"');
    const videoSourceBuffer = streamMediaSource
        .addSourceBuffer('video/mp4; codecs="avc1.64001e"');

    //callFetchAudioSegment(callFetchAudioSegment);
    //callFetchVideoSegment(callFetchVideoSegment);

    function fetchSegment(url) {
        return fetch(url).then(function (response) {
            return response.arrayBuffer();
        });
    }

    function callFetchAudioSegment(cb) {
        fetchSegement("http://localhost:4000/audio")
            .then(function (audioSegment) {
                audioSourceBuffer.appendBuffer(audioSegment)
            })
            .then(function () {
                if (playStream) {
                    return cb(callFetchAudioSegment);
                } else {
                    return;
                }
            })
    }

    function callFetchVideoSegment(cb) {
        fetchSegement("http://localhost:4000/video")
            .then(function (videoSegment) {
                videoSourceBuffer.appendBuffer(videoSegment)
            })
            .then(function () {
                if (playStream) {
                    return cb(callFetchVideoSegment);
                } else {
                    return;
                }
            })
    }
}