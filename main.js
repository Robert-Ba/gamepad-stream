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

let startWindow;

// Server socket connection:
var openSockets = [];
var currentStreamSegment = 000;
var streamActive = false;
var textChunk = '';

// Client socket connection:
var client = undefined;

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

        streamMedia();
    }
    
});
server.maxConnections = 1;

// Send continuous video and audio stream.
function streamMedia() {
    // TODO:
    // Make continuous loop that will write video and audio to socket
    
}

app.on('ready', function() {
    startWindow = new BrowserWindow({
        width: 1350,
        height: 800
    });
    
    startWindow.loadFile('./windows/views/startWindow.html');
    startWindow.on('closed', function () {
        startWindow = null;
        server.close();
    })

    const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
    Menu.setApplicationMenu(mainMenu);


});

// Start streaming
function createStreamViewerWindow() {
    startWindow.loadFile('./windows/views/streamWindow.html');
}

function createBroadcastStreamWindow() {
    startWindow.loadFile('./windows/views/broadcastWindow.html');
}

function createMainWindow() {
    startWindow.loadFile('./windows/views/startWindow.html');
}

ipcMain.on('stream:join', function (e, ip) {
    //mainWindow.webContents.send('item:add', item);

    if (client) {
        client.end();
    }

    // Connect to server
    client = new net.Socket();
    client.connect(4000, ip, function () {
        // TODO:
    });

    createStreamViewerWindow();
});

ipcMain.on('stream:start', function (e, windowId) {
    //mainWindow.webContents.send('item:add', item);
    createBroadcastStreamWindow();
    console.log(windowId);
    startWindow.webContents.once("did-finish-load", function () {
        // Init event listeners
        //  - Listen for stream
        
        startServer();

        // Start stream after starting server.
        startWindow.webContents.send("captureWindow", windowId);

        // var http = require("http");
        // var crypto = require("crypto");
        // var server = http.createServer(function (req, res) {
        //     var port = crypto.randomBytes(16).toString("hex");
        //     ipcMain.once(port, function (ev, status, head, body) {
        //         res.writeHead(status, head);
        //         res.end(body);
        //     });
        //     window.webContents.send("request", req, port);
        // });
        // server.listen(8000);
        // console.log("http://localhost:8000/");
    });
});

ipcMain.on('stream:stop', function (e) {
    //mainWindow.webContents.send('item:add', item);

    // Stop listening on port.
    stopServer();
    createMainWindow();
});

function startServer() {
    console.log('Listening on port 4000');
    server.listen(4000, '127.0.0.1');
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