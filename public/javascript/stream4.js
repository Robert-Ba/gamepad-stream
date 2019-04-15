/* Setting up WebRTC connection following tutorialspoint */

const electron = require('electron');
const { ipcRenderer } = electron;

var configuration = {
    "iceServers": [{ "url": "stun:stun.1.google.com:19302" }]
};
const myConnection = new webkitRTCPeerConnection(configuration);
var connectedUser;
var offer = undefined;

var playStream = true;
var videoTag = undefined;

$(document).ready(function() {
    videoTag = document.querySelector('video');
    //streamMediaSource.addEventListener('sourceopen', callback);

    myConnection.ontrack = function (e) {
        console.log('Stream added.');
        videoTag.srcObject = window.URL.createObjectURL(e.streams[0]);
        videoTag.play();
    };

    // Make offer object and send to connected server
    myConnection.createOffer(function (offer) {
        ipcRenderer.send('WebRTCChannel', { type: 'offer', offer: JSON.stringify(offer)});

        myConnection.setLocalDescription(offer);
    }, function (error) {
        alert("An error has occurred.");
    });
});

//setup ice handling
//when the browser finds an ice candidate we send it to another peer 
myConnection.onicecandidate = function (event) {
    if (event.candidate) {
        ipcRenderer.send("WebRTCChannel", {type: 'candidate', candidate: JSON.stringify(event.candidate)});
    }
};

// Handle any answers 
ipcRenderer.on('answer', function(e, answer) {
    console.log('Received answer ('+answer.type+'):')
    console.log(answer)
    myConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

// Receive ice candidate from another user
ipcRenderer.on("candidate", function(event, candidate){
    onCandidate(candidate);
});
//when we get ice candidate from another user 
function onCandidate(candidate) {
    myConnection.addIceCandidate(new RTCIceCandidate(candidate));
}