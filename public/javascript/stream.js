/* Setting up WebRTC connection following tutorialspoint */

const electron = require('electron');
const { ipcRenderer } = electron;
const Peer = require('simple-peer');
const wrtc = require('wbrtc');

// We are requesting to view the stream.
var viewerPeer = undefined;
// offerOptions: {
//     offerToReceiveVideo: true,
//     offerToReceiveAudio: true
// } 

var socket = undefined;
var video = undefined;

var dataStream = undefined;

$(document).ready(function() {
    video = document.querySelector('video');
});

window.addEventListener("beforeunload", function(e) {
    if(viewerPeer) {
        viewerPeer.send(JSON.stringify({type: "message", message: "end"}));
        viewerPeer.destroy();
    }
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

    socket.on('disconnect', function () {
        alert('Stream disconnected.')
    });
});

function startRTC() {
    viewerPeer = new Peer({ initiator: true, wrtc: wrtc });

    socket.on('RTCSocketMessage', function(data) {
        console.log('Received RTC message')
        viewerPeer.signal(data.data);
    });

    viewerPeer.on('signal', function(data) {
        console.log('Sending data')
        console.log(data)
        socket.emit('RTCSocketChannel', { from: 'client', data: data});
    });

    viewerPeer.on('stream', function(stream) {
        video.src = URL.createObjectURL(stream);
        video.play();
    });

    viewerPeer.on('connect', function() {
        dataStream = viewerPeer.send;
    });

    viewerPeer.on('close', function () {
        dataStream = undefined;
        viewerPeer.destroy();
    });

    viewerPeer.on('error', function () {
        dataStream = undefined;
        viewerPeer.destroy();
    });
}