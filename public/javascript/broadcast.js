const electron = require('electron');
const { ipcRenderer, desktopCapturer } = electron;
const Peer = require('simple-peer');

// We are requesting to view the stream.
var broadcastingPeer = undefined;

var activeStream = undefined;

// Handle offers to connect.
ipcRenderer.on("offer", function (event, offer) {
    broadcastingPeer.signal(offer);
});

$(document).ready(function () {
    $('#stop-stream').click(stopStream);
});

function stopStream(e) {
    e.preventDefault();
    ipcRenderer.send('stream:stop');
}

// Begin capturing a specific window.
ipcRenderer.on("captureWindow", function(event, windowId) {
    startCapture(windowId);
});

function startCapture(windowId) {
    desktopCapturer.getSources({ types: ['window', 'screen'] }, (error, sources) => {
        if (error) throw error
        for (let i = 0; i < sources.length; ++i) {
            if (sources[i].id === windowId) {
                navigator.mediaDevices.getUserMedia({
                    audio: false,
                    video: {
                        mandatory: {
                            chromeMediaSource: 'desktop',
                            chromeMediaSourceId: sources[i].id,
                            minWidth: 1280,
                            maxWidth: 1280,
                            minHeight: 720,
                            maxHeight: 720
                        }
                    }
                }).then((stream) => readStream(stream))
                    .catch((e) => handleError(e))
                return
            }
        }
    })
}

function readStream(stream) {
    const video = document.querySelector('video');
    
    video.srcObject = stream;
    activeStream = stream;

    video.onloadedmetadata = () => {
        video.play();
        broadcastingPeer = new Peer({initiator: false, stream: stream});

        broadcastingPeer.on('signal', function(data) {
            ipcRenderer.send('WebRTCChannel', data);
        });
    }
}

ipcRenderer.on("RTCMessage", function(event, message) {
    broadcastingPeer.signal(message);
});

// answerOptions: {
//     stream: [activeStream],
//     offerToReceiveVideo: false,
//     offerToReceiveAudio: false
// }

function handleError(e) {
    console.log(e)
}