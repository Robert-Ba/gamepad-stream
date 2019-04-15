const main = async (function* main() {
    const electron = require('electron');
    const { ipcRenderer } = electron;

    var playStream = true;
    var videoTag = undefined;
    const streamMediaSource = new MediaSource();

    const url = URL.createObjectURL(streamMediaSource);

    videoTag = document.querySelector('video');
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
            if (Object.prototype.toString.call(data) === "[object Uint8Array]") {
                // Buffer parameter is a uint8array
                var buffer = data.buffer;

                tasks = tasks.then(async(function* () {
                    try{
                        videoSourceBuffer.appendBuffer(buffer);
                        yield new Promise((resolve, reject) => {
                            videoSourceBuffer.addEventListener('updateend', () => resolve(), { once: true });
                            videoSourceBuffer.addEventListener("error", (err) => reject(err), { once: true });
                        });
                    } catch(err) {
                        console.error(err)
                        yield stop();
                        console.groupEnd("" + i); i++;
                        return Promise.reject(err);
                    }
                }));
            }
        });
    }
});

function async(generatorFunc) {
    return function (arg) {
        const generator = generatorFunc(arg);
        return next(null);
        function next(arg) {
            const result = generator.next(arg);
            if (result.done) { return result.value; }
            else if (result.value instanceof Promise) { return result.value.then(next); }
            else { return Promise.resolve(result.value); }
        }
    }
}

$(document).ready(function() {
    main().catch(console.error);
});
