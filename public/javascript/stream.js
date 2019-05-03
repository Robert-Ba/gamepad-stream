/* Setting up WebRTC connection following tutorialspoint */

const electron = require('electron');
const { ipcRenderer } = electron;
const Peer = require('simple-peer');
const wrtc = require('electron-webrtc');

// We are requesting to view the stream.
var viewerPeer = undefined;
// offerOptions: {
//     offerToReceiveVideo: true,
//     offerToReceiveAudio: true
// } 

var socket = undefined;
var video = undefined;

var dataStream = undefined;

var receiverStatsDiv = undefined;
var bitrateDiv = undefined;
var peerDiv = undefined;
var receiverVideoStatsDiv = undefined;

$(document).ready(function() {
    video = document.querySelector('video');

    document.onkeydown = checkKey;

        
    receiverStatsDiv = document.getElementById('receiverStatsDiv');
    bitrateDiv = document.getElementById('bitrateDiv');
    peerDiv = document.getElementById('peerDiv');
    receiverVideoStatsDiv = document.getElementById('receiverVideoStatsDiv');
});

function checkKey(e) {
    e = e || window.event;

    if (e.keyCode === 192) {
        $('#stat-console').toggle();
    }
}

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


// Display statistics
setInterval(function () {
    if (viewerPeer && viewerPeer._remoteStreams[0]) { // .getRemoteStreams
        viewerPeer.getStats(function (err, results) {
            if(err) {
                console.log(err);
                return;
            }

            var statsString = dumpStats(results);
            receiverStatsDiv.innerHTML = '<h2>Receiver stats</h2>' + statsString;
            // calculate video bitrate
            Object.keys(results).forEach(function (result) {
                var report = results[result];
                var now = report.timestamp;

                var bitrate;
                if (report.type === 'inboundrtp' && report.mediaType === 'video') {
                    // firefox calculates the bitrate for us
                    // https://bugzilla.mozilla.org/show_bug.cgi?id=951496
                    bitrate = Math.floor(report.bitrateMean / 1024);
                } else if (report.type === 'ssrc' && report.bytesReceived &&
                    report.googFrameHeightReceived) {
                    // chrome does not so we need to do it ourselves
                    var bytes = report.bytesReceived;
                    if (timestampPrev) {
                        bitrate = 8 * (bytes - bytesPrev) / (now - timestampPrev);
                        bitrate = Math.floor(bitrate);
                    }
                    bytesPrev = bytes;
                    timestampPrev = now;
                }
                if (bitrate) {
                    bitrate += ' kbits/sec';
                    bitrateDiv.innerHTML = '<strong>Bitrate:</strong> ' + bitrate;
                }
            });

            // figure out the peer's ip
            var activeCandidatePair = null;
            var remoteCandidate = null;

            // search for the candidate pair
            Object.keys(results).forEach(function (result) {
                var report = results[result];
                if (report.type === 'candidatepair' && report.selected ||
                    report.type === 'googCandidatePair' &&
                    report.googActiveConnection === 'true') {
                    activeCandidatePair = report;
                }
            });
            if (activeCandidatePair && activeCandidatePair.remoteCandidateId) {
                Object.keys(results).forEach(function (result) {
                    var report = results[result];
                    if (report.type === 'remotecandidate' &&
                        report.id === activeCandidatePair.remoteCandidateId) {
                        remoteCandidate = report;
                    }
                });
            }
            if (remoteCandidate && remoteCandidate.ipAddress &&
                remoteCandidate.portNumber) {
                peerDiv.innerHTML = '<strong>Connected to:</strong> ' +
                    remoteCandidate.ipAddress +
                    ':' + remoteCandidate.portNumber;
            }
        });
    } else {
        console.log('Not connected yet');
    }
    // Collect some stats from the video tag.
    if (video.videoWidth) {
        receiverVideoStatsDiv.innerHTML = '<strong>Video dimensions:</strong> ' +
            video.videoWidth + 'x' + video.videoHeight + 'px';
    }
}, 1000);

// Dumping a stats variable as a string.
// might be named toString?
function dumpStats(results) {
    var statsString = '';
    Object.keys(results).forEach(function (key, index) {
        var res = results[key];
        statsString += '<h3>Report ';
        statsString += index;
        statsString += '</h3>\n';
        statsString += 'time ' + res.timestamp + '<br>\n';
        statsString += 'type ' + res.type + '<br>\n';
        Object.keys(res).forEach(function (k) {
            if (k !== 'timestamp' && k !== 'type') {
                statsString += k + ': ' + res[k] + '<br>\n';
            }
        });
    });
    return statsString;
}