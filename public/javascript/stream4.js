/* Setting up WebRTC connection following tutorialspoint */

const electron = require('electron');
const { ipcRenderer } = electron;
const Peer = require('simple-peer');

// We are requesting to view the stream.
const viewerPeer = new Peer({ initiator: true });

// offerOptions: {
//     offerToReceiveVideo: true,
//     offerToReceiveAudio: true
// } 

var video = undefined;

$(document).ready(function() {
    video = document.querySelector('video');

    // With simple-peer: this event could provide a webrtc offer OR ice candidate.
    viewerPeer.on('signal', function(data) {
        if(data.candidate) {
            data = data.candidate;
        }

        ipcRenderer.send('WebRTCChannel', JSON.stringify(data));
    });

    viewerPeer.on('stream', function(stream) {
        video.src = URL.createObjectURL(stream);
        video.play();
    });

    viewerPeer.on('connect', function() {
        // TODO: Send controls over datastream
    });
});

ipcRenderer.on("RTCMessage", function(event, message) {
    viewerPeer.signal(message);
});