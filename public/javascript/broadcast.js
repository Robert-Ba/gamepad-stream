const electron = require('electron');
const { ipcRenderer, desktopCapturer } = electron;
const Peer = require('simple-peer');

// We are sending stream to viewers.
var broadcastingPeer = undefined;

var activeStream = undefined;
var axesVisual = [];

var edge = require('electron-edge-js');
var startController = edge.func('./ViGEmControl.dll');
var updateController = undefined;

$(document).ready(function () {
    axesVisual = [document.getElementById('stick-one-visual'), document.getElementById('stick-two-visual')];
    $('#stop-stream').click(stopStream);

    startController(null, function (err, updt) {
        updateController = updt;
    });
});

function stopStream(e) {
    e.preventDefault();

    if (broadcastingPeer) {
        broadcastingPeer.destroy();
    }
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
                            maxHeight: 720,
                            minFrameRate: 30,
                            maxFrameRate: 30
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
        broadcastingPeer = new Peer({ initiator: false, stream: stream, trickle: true });

        // On signal: handle answer or candidates
        broadcastingPeer.on('signal', function(data) {
            ipcRenderer.send('WebRTCChannel', data);
        });

        broadcastingPeer.on('connect', function () {
            $('#connectedClient').text('Viewer is connected').addClass('connected-text');
        });

        broadcastingPeer.on('data', function (data) {
            // Receive control input from data channel.
            data = JSON.parse(data);

            if (data.type === 'gamepad') {
                // Only using left/right thumb sticks, triggers, A, B, X, Y
                sendControlsToDriver(data.inputValues);

                // Display input in UI
                displayControls(data.inputValues);
            }

            if(data.type === 'message') {
                if(data.message === 'end') {
                    console.log('Viewer has left.')
                    resetStream();
                }
            }
        });

        broadcastingPeer.on('error', function (err) {
            $('#connectedClient').text('Viewer is disconnected').removeClass('connected-text');
            console.log(err);
            resetStream();
        });

        broadcastingPeer.on('close', function (err) {
            broadcastingPeer.destroy();
            resetStream();
        });
    }
}

function resetStream() {
    readStream(activeStream);
    ipcRenderer.send('stream:disconnect');
    $('#connectedClient').text('Viewer is disconnected').removeClass('connected-text');
}

function displayControls(inputValues) {
    axesVisual[0].style.left = normalizeAxisValue(inputValues.axes[0]) + "px";
    axesVisual[0].style.top = normalizeAxisValue(inputValues.axes[1]) + "px";

    axesVisual[1].style.left = normalizeAxisValue(inputValues.axes[2]) + "px";
    axesVisual[1].style.top = normalizeAxisValue(inputValues.axes[3]) + "px";
}

function normalizeAxisValue(value) {
    value = value < -1 ? -1.0 : (value > 1 ? 1.0 : value);
    value = (((value + 1.0) / 2.0) * 100.0);
    return value - 5.0;
}

function sendControlsToDriver(inputValues) {
    // TODO: Validate inputValues
    var payload = {
        buttons: [...inputValues.buttons],
        triggers: [inputValues.buttons[6], inputValues.buttons[7]],
        axes: [inputValues.axes[0], inputValues.axes[1], inputValues.axes[2], inputValues.axes[3],]
    }

    updateController(payload);
}

ipcRenderer.on("WebRTCChannel", function (event, message) {
    broadcastingPeer.signal(message);
});

ipcRenderer.on("ServerClosed", function (event) {
    if (broadcastingPeer) {
        broadcastingPeer.destroy();
    }
});

// answerOptions: {
//     stream: [activeStream],
//     offerToReceiveVideo: false,
//     offerToReceiveAudio: false
// }

function handleError(e) {
    console.log(e)
}
