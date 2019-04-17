/* Setting up WebRTC connection following tutorialspoint */

const electron = require('electron');
const { ipcRenderer } = electron;
const Peer = require('simple-peer');

// We are requesting to view the stream.
var viewerPeer = undefined;
// offerOptions: {
//     offerToReceiveVideo: true,
//     offerToReceiveAudio: true
// } 

var socket = undefined;
var video = undefined;

$(document).ready(function() {
    video = document.querySelector('video');
});

ipcRenderer.on("RTCMessage", function(event, message) {
    viewerPeer.signal(message);
});

ipcRenderer.on("ip", function(event, ip){
    socket = io('http://'+ip+':4000');

    socket.on('ready', function() {
        console.log('Received ready message')
        startRTC();
    });
});

function startRTC() {
    viewerPeer = new Peer({ initiator: true });

    socket.on('RTCMessage', function(message) {
        console.log('Received RTC message')
        viewerPeer.signal(message);
    });

    viewerPeer.on('signal', function(data) {
        console.log('Sending data')
        console.log(data)
        socket.emit('WebRTCChannel', data);
    });

    viewerPeer.on('stream', function(stream) {
        video.src = URL.createObjectURL(stream);
        video.play();
    });

    viewerPeer.on('connect', function() {
        // TODO: Send controls over datastream
    });
}