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
    viewerPeer.on('signal', function(offer) {
        ipcRenderer.send('WebRTCChannel', JSON.stringify(offer));
    });

    viewerPeer.on('stream', function(stream) {
        video.src = URL.createObjectURL(stream);
        video.play();
    });

    viewerPeer.on('connect', function() {
        // TODO: Send controls over datastream
    });
});

// Handle any answers 
ipcRenderer.on('answer', function(e, answer) {
    console.log('Received answer ('+answer.type+'):')
    console.log(answer)
    viewerPeer.signal(answer);
});

// Receive ice candidate from another peer
ipcRenderer.on("candidate", function(event, candidate){
    console.log('Received candidate')
    console.log(candidate)
    viewerPeer.signal(candidate);
});

ipcRenderer.on("RTCMessage", function(event, message) {
    viewerPeer.signal(message);
});