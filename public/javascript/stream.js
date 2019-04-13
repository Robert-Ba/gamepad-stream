const electron = require('electron');
const { ipcRenderer } = electron;

var playStream = true;
const videoTag = document.querySelector('video');
const streamMediaSource = new MediaSource();

const url = URL.createObjectURL(streamMediaSource);
videoTag.src = url;
streamMediaSource.addEventListener('sourceopen', callback);
videoTag.play();

let tasks = Promise.resolve(void 0);

function callback(e) {
    console.log('source opened')
    const audioSourceBuffer = streamMediaSource
        .addSourceBuffer('audio/mp4; codecs="mp4a.40.2"');
    const videoSourceBuffer = streamMediaSource
        .addSourceBuffer('video/webm; codecs="opus,vp8"'); //  codecs="vp8"

    //callFetchAudioSegment(callFetchAudioSegment);
    //callFetchVideoSegment(callFetchVideoSegment);

    ipcRenderer.on('streamEnded', function () {
        console.log('Stream has ended.');
    })

    // Is it okay that the client is continously receiving the stream rather than requesting?
    ipcRenderer.on('videoStream', function (event, data) {
        console.log(data)
        if (Object.prototype.toString.call(data) === "[object Uint8Array]") {
            // Buffer parameter is a uint8array
            var buffer = data.buffer;

            tasks = tasks.then(async(function* () {
                videoSourceBuffer.appendBuffer(buffer);
                yield new Promise((resolve, reject) => {
                    videoSourceBuffer.addEventListener('updateend', () => resolve(), { once: true });
                    videoSourceBuffer.addEventListener("error", (err) => reject(ev), { once: true });
                });
            }));
        }
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