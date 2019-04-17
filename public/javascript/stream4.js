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

var socket = undefined;
var video = undefined;

$(document).ready(function() {
    video = document.querySelector('video');

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

ipcRenderer.on("ip", function(event, ip){
    socket = io('http://'+ip+':4000');

    socket.on('ready', function() {
        viewerPeer.on('signal', function(data) {
            socket.emit('WebRTCChannel', data);
        });
    });

    socket.on('RTCMessage', function(event, message) {
        viewerPeer.signal(message);
    });

    viewerPeer.on('connect', function() {
        // TODO: Send controls over datastream
    });
});