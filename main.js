const electron = require('electron');
const url = require('url');
const path = require('path');

const net = require('net');

const { app, BrowserWindow, Menu, ipcMain, protocol } = electron;

let mainWindow;

// Server socket connection:
var openSockets = [];
var offerReceived = false;

// Client socket connection:
var clientSocket = undefined;

var server = net.createServer(function(socket) {
    // Only one open socket allowed
    if(openSockets.length === 0) {
        openSockets.push(socket);
        console.log('Viewer connected.')
        socket.on('data', handleServerSocketData);

        socket.on('end', function () {
            console.log('Viewer disconnected')
            //console.log(this)
            // Change this if I decide to support multiple connections
            openSockets = [];
            if(clientSocket) clientSocket.removeListener('data');
        });
    }
});
server.maxConnections = 1;

app.on('ready', function() {
    mainWindow = new BrowserWindow({
        width: 1350,
        height: 800
    });
    
    mainWindow.loadFile('./windows/views/startWindow.html');
    mainWindow.on('closed', function () {
        if(clientSocket) {
            clientSocket.end(); 
        }

        server.close();
    })

    const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
    Menu.setApplicationMenu(mainMenu);

    initStartEvents();    
});

// Open stream viewer
function createStreamViewerWindow() {
    mainWindow.loadFile('./windows/views/streamWindow.html');
    removeStartEvents();
    initStreamViewerEvents();
}

// Open broadcast window
function createBroadcastStreamWindow() {
    mainWindow.loadFile('./windows/views/broadcastWindow.html');
    removeStartEvents();
    initBroadcastEvents();
}

// msg parameter is an optional alert message.
function createMainWindow(msg) {
    mainWindow.loadFile('./windows/views/startWindow.html');
    initStartEvents();

    mainWindow.webContents.once("did-finish-load", function () {
        if(msg) {
            mainWindow.webContents.send("message", msg);
        }
    });
}

// When the server receives data on a socket
function handleServerSocketData(data) {
    console.log("New message")
    try {
        var splitData = data.toString('utf8').split('9BREAK9');
        splitData.pop();

        console.log(splitData);

        splitData.forEach((d) => {
            mainWindow.webContents.send("RTCMessage", JSON.parse(d));
        });
    } catch(err) {
        console.log('Could not read client message.')
    }
}

// This channel is used by the broadcast and stream viewer windows for anything related to WebRTC.
ipcMain.on('WebRTCChannel', function(event, data) {
    if(clientSocket) {
        // I'm sorry for this...
        clientSocket.write(data+"9BREAK9");
    } else {
        if(openSockets.length > 0) {
            openSockets[0].write(data+"9BREAK9");
        }
    }
    
});

function initStartEvents() {
    ipcMain.once('stream:start', function (e, windowId) {
        startStream(windowId);
    });

    ipcMain.once('stream:join', function (e, ip) {
        joinStream(ip);
    });
}

// Join the stream hosted by the provided ip.
// 1. Load stream viewer window
// 2. Open socket.
// 3. Receive offer object from window. Send offer when socket is ready.
function joinStream(ip) {
    if (clientSocket) {
        clientSocket.end();
    }

    
    createStreamViewerWindow();
    mainWindow.webContents.once("did-finish-load", function () {
        startStreamViewerSocket(ip);
    });
}

// Connect to the broadcast server running on the streamers pc
function startStreamViewerSocket(ip) {
    clientSocket = new net.Socket();
    clientSocket.connect(4000, ip);

    clientSocket.on('error', function (err) {
        createMainWindow('Could not connect to ' + ip);
    });

    // As the stream viewer: receive answer to offer and/or ice candidate
    clientSocket.on('data', handleClientSocketData);

    clientSocket.on('end', function() {
        clientSocket = undefined;
    });
}

// On receiving data from the server
function handleClientSocketData(data) {
    try {
        var splitData = data.toString('utf8').split('9BREAK9');
        splitData.pop();

        splitData.forEach((d) => {
            mainWindow.webContents.send("RTCMessage", JSON.parse(d));
        });
    } catch(err) {
        console.log('Could not read server response.')
    }
}

// Open broadcast window, start server, and accept offers to for WebRTC
function startStream(windowId) {
    createBroadcastStreamWindow();
    mainWindow.webContents.once("did-finish-load", function () {
        startServer();

        // Start streaming after starting server.
        // Need this to send the id of the window to capture
        mainWindow.webContents.send("captureWindow", windowId);
    });
}

function initStreamViewerEvents() {
    ipcMain.once('stream:exit', function(e) {
        clientSocket.end();
        createMainWindow();
    });
}

function initBroadcastEvents() {
    ipcMain.once('stream:stop', function (e) {
        //mainWindow.webContents.send('item:add', item);
        
        // Stop listening on port.
        stopServer();
        createMainWindow();
    });
}

function removeStartEvents() {
    ipcMain.removeAllListeners(['stream:start', 'stream:join']);
}

function startServer() {
    console.log('Listening on port 4000');
    server.listen(4000, '0.0.0.0');
}

function stopServer() {
    console.log('Closing server.')
    openSockets.forEach((socket) => {socket.end()});
    server.close();
}

const mainMenuTemplate = [
    {
        label: 'File',
        submenu: [
            {
                label: 'Quit',
                accelerator: process.platform === "darwin" ? 'Command+Q' : 'Ctrl+Q',
                click() {
                    app.quit();
                }
            }
        ]
    }
];

if (process.env.NODE_ENV !== 'production') {
    mainMenuTemplate.push({
        label: "Developer Tools",
        submenu: [
            {
                label: 'Toggle Dev Tools',
                accelerator: process.platform === "darwin" ? 'Command+D' : 'Ctrl+D',
                click(item, focusedWindow) {
                    focusedWindow.toggleDevTools();
                }
            },
            {
                role: 'reload'
            }
        ]
    })
}