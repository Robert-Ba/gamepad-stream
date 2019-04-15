const electron = require('electron');
const { ipcRenderer, desktopCapturer } = electron;
var configuration = {
    "iceServers": [{ "url": "stun:stun.1.google.com:19302" }]
};

const myConnection = new webkitRTCPeerConnection(configuration);

//setup ice handling
//when the browser finds an ice candidate we send it to another peer 
myConnection.onicecandidate = function (event) {
    if (event.candidate) {
        ipcRenderer.send("WebRTCChannel", {type: 'candidate', candidate: JSON.stringify(event.candidate)});
    }
}; 

// Receive ice candidate from another user
ipcRenderer.on("candidate", function(event, candidate){
    onCandidate(candidate);
});
//when we get ice candidate from another user 
function onCandidate(candidate) {
    myConnection.addIceCandidate(new RTCIceCandidate(candidate));
}

// Handle offers to connect.
ipcRenderer.on("offer", function(event, offer) {
    myConnection.setRemoteDescription(new RTCSessionDescription(offer));

    myConnection.createAnswer(function (answer) {
        myConnection.setLocalDescription(answer);

        ipcRenderer.send("WebRTCChannel", {type: "answer", answer: JSON.stringify(answer)});

    }, function (error) {
        alert("error");
    });
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

    // This could be too slow. Need to test.
    video.onloadedmetadata = () => {
        video.play();
        //var mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs="opus,vp8"'});
        
        //mediaRecorder.ondataavailable = function (e) {
            // TODO: Use WebRTC

            myConnection.addStream(stream);

            //console.log(e.data)
            //let newBlob = new Blob([e.data]);
            // toBuffer(e.data, function(err, buffer) {
            //     ipcRenderer.send('stream:send', buffer);
            // });
        //}

        //mediaRecorder.start(40);
    }
}

function toBuffer(blob, cb) {
    var reader = new FileReader()

    function onLoadEnd(e) {
        reader.removeEventListener('loadend', onLoadEnd, false)
        if (e.error) cb(e.error)
        else cb(null, Buffer.from(reader.result))
    }

    reader.addEventListener('loadend', onLoadEnd, false)
    reader.readAsArrayBuffer(blob)
}

function handleError(e) {
    console.log(e)
}