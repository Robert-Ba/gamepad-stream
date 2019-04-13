const videoTag = $('#stream-video');
const streamMediaSource = new MediaSource();
const url = URL.createObjectURL(streamMediaSource);
streamMediaSource.addEventListener('sourceopen', sourceOpen);
videoTag.src = url;

const electron = require('electron');
const { ipcRenderer } = electron;

var playStream = true;

function sourceOpen() {
    const audioSourceBuffer = streamMediaSource
        .addSourceBuffer('audio/mp4; codecs="mp4a.40.2"');
    const videoSourceBuffer = streamMediaSource
        .addSourceBuffer('video/webm; codecs="vp9, vorbis"');

    //callFetchAudioSegment(callFetchAudioSegment);
    //callFetchVideoSegment(callFetchVideoSegment);

    ipcRenderer.on('streamEnded', function() {
        console.log('Stream has ended.');
    })

    // Is it okay that the client is continously receiving the stream rather than requesting?
    ipcRenderer.on('videoStream', function(event, buffer) {
        console.log('Appending buffer')
        videoSourceBuffer.appendBuffer(buffer);
    });


    // I think I can remove all this? Unless the current situation is not working.
    function fetchSegment(url) {
        return fetch(url).then(function (response) {
            return response.arrayBuffer();
        });
    }

    function callFetchAudioSegment(cb) {
        fetchSegment("http://localhost:4000/audio")
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
        fetchSegment("http://localhost:4000/video")
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