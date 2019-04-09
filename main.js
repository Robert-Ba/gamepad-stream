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

var openSockets = [];
var currentStreamSegment = 000;

var textChunk = '';
var client = undefined;
var server = net.createServer(function(socket) {
    openSockets.push(socket);
    socket.write('Stream connected\r\n');
    streamMedia();
    socket.on('data', function(data){
        // Accept any controller input here.
        textChunk = data.toString('utf8');

        let control = temporaryControls[textChunk];
        if(control) {
            socket.write(control);
        } else {
            socket.write("Unknown input.");
        }
    });
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

    startWindow.loadFile('startWindow.html');
    startWindow.on('closed', function () {
        startWindow = null;
        server.close();
    })

    const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
    Menu.setApplicationMenu(mainMenu);


});

// Start streaming
function createStreamViewerWindow() {
    startWindow.loadFile('streamWindow.html');
}

function createBroadcastStreamWindow() {
    startWindow.loadFile('broadcastWindow.html');
}

function createMainWindow() {
    startWindow.loadFile('startWindow.html');
}



ipcMain.on('stream:join', function (e, ip) {
    //mainWindow.webContents.send('item:add', item);

    if (client) {
        client.end();
    }

    // Connect to server
    client = new net.Socket();
    client.connect(4000, ip, function () {

    });

    createStreamViewerWindow();
});

ipcMain.on('stream:start', function (e) {
    //mainWindow.webContents.send('item:add', item);
    createBroadcastStreamWindow();
    startWindow.webContents.once("did-finish-load", function () {
        startServer();

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
    console.log('Listening on port 4000')
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

if (process.platform == 'darwin') {
    mainMenuTemplate.unshift({});
}

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