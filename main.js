const electron = require('electron');
const url = require('url');
const path = require('path');

const net = require('net');

const { app, BrowserWindow, Menu, ipcMain } = electron;

const temporaryControls = {
    w: "Up",
    a: "Left",
    s: "Down",
    d: "Right"
}

const listenerChannels = {
    joinStream: 'stream:join',
    exitStream: 'stream:exit',
    startStream: 'stream:start',
    stopStream: 'stream:stop',
    sendStream: 'stream:send'
};

let startWindow;

// Server socket connection:
var openSockets = [];
var currentStreamSegment = 000;  // Remove this?
var streamActive = false; // Remove this?
var textChunk = '';

// Client socket connection:
var clientSocket = undefined;

var server = net.createServer(function(socket) {
    // Only one open socket allowed
    if(openSockets.length === 0) {
        openSockets.push(socket);
        socket.write('Stream connected\r\n');
        socket.on('data', function (data) {
            // Accept any controller input here.
            textChunk = data.toString('utf8');

            let control = temporaryControls[textChunk];
            if (control) {
                socket.write(control);
            } else {
                socket.write("Unknown input.");
            }
        });

        socket.on('end', function() {
            //console.log(this)
            // Change this if I decide to support multiple connections
            openSockets = [];
        });
    }
    
});
server.maxConnections = 1;

app.on('ready', function() {
    startWindow = new BrowserWindow({
        width: 1350,
        height: 800
    });
    
    startWindow.loadFile('./windows/views/startWindow.html');
    startWindow.on('closed', function () {
        startWindow = null;
        if(clientSocket) {clientSocket.end(); clientSocket = undefined;}
        server.close();
    })

    const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
    Menu.setApplicationMenu(mainMenu);

    initStartEvents();
});

// Start streaming
function createStreamViewerWindow() {
    startWindow.loadFile('./windows/views/streamWindow.html');
    initStreamViewerEvents();
}

function createBroadcastStreamWindow() {
    startWindow.loadFile('./windows/views/broadcastWindow.html');
    initBroadcastEvents();
}

function createMainWindow(msg) {
    startWindow.loadFile('./windows/views/startWindow.html');
    initStartEvents();

    
    startWindow.webContents.once("did-finish-load", function () {
        if(msg) {
            startWindow.webContents.send("message", msg);
        }
    });
}

function initStartEvents() {
    ipcMain.on('stream:join', function (e, ip) {
        joinStream(ip);
    });

    ipcMain.on('stream:start', function (e, windowId) {
        startStream(windowId);
    });
}

function joinStream(ip) {
    if (clientSocket) {
        clientSocket.end();
    }

    // Connect to server
    clientSocket = new net.Socket();
    clientSocket.connect(4000, ip);
    
    clientSocket.on('error', function(err) {
        startWindow.webContents.send("message", 'Could not connect to '+ip);
    });

    clientSocket.on('ready', function() {
        createStreamViewerWindow();
    });

    clientSocket.on('data', function(data) {
        startWindow.webContents.send("videoStream", data);
    });

    clientSocket.on('end', function() {
        startWindow.webContents.send("streamEnded");
        clientSocket = undefined;
    });
}

function startStream(windowId) {
    removeAllListeners();
    createBroadcastStreamWindow();
    startWindow.webContents.once("did-finish-load", function () {
        startServer();

        // Start streaming after starting server.
        startWindow.webContents.send("captureWindow", windowId);
    });
}

function initStreamViewerEvents() {
    ipcMain.on('stream:exit', function(e) {
        removeAllListeners();
        clientSocket.end();
        createMainWindow();
    });
}

function initBroadcastEvents() {
    ipcMain.on('stream:stop', function (e) {
        //mainWindow.webContents.send('item:add', item);
    
        // Stop listening on port.
        stopServer();
        removeAllListeners();
        createMainWindow();
    });

    ipcMain.on('stream:send', function(e, buffer) {
        if(openSockets.length > 0) {
            openSockets[0].write(buffer);
        } else {
            console.log('No client');
        }
    });
}

function removeAllListeners() {
    ipcMain.removeAllListeners();
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