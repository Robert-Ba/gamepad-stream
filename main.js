const io = require('socket.io');
const electron = require('electron');
var server = undefined;

const { app, BrowserWindow, Menu, ipcMain, protocol } = electron;

let mainWindow;

// Server socket connection:
var openSockets = [];

app.on('ready', function() {
    mainWindow = new BrowserWindow({
        width: 1350,
        height: 800
    });
    
    mainWindow.loadFile('./windows/views/startWindow.html');
    mainWindow.on('closed', function () {
        if(openSockets[0]) {
            openSockets[0].disconnect(true);
            openSockets.pop();
        }

        if(server) {
            server.close(function () {
                server = undefined;
            });
        }
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
    mainWindow.webContents.send("RTCMessage", data);
}

function initStartEvents() {
    ipcMain.once('stream:start', function (e, windowId) {
        startStream(windowId);
    });

    ipcMain.once('stream:join', function (e, ip) {
        joinStream(ip);
    });
}

// Join the stream hosted by the provided ip.
// The client page window will use ip to connect with socket.io
function joinStream(ip) {
    createStreamViewerWindow();
    mainWindow.webContents.once("did-finish-load", function () {
        // Send ip for socket.io to establish
        mainWindow.webContents.send('ip', ip);
    });
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
    server = io.listen(4000)

    server.on("connection", function (socket) {
        // Only one open socket allowed
        if (openSockets.length === 0) {
    
            socket.emit('ready', 'ready');
    
            // Allow broadcaster to send RTC signals to client
            ipcMain.on('WebRTCChannel', function(event, data) {
                socket.emit(data);
            });
    
            console.log('Viewer connected.');
            openSockets.push(socket);
            socket.on('WebRTCChannel', handleServerSocketData);
        } else {
            // Close connection?
        }
    });
}

function stopServer() {
    console.log('Closing server.')
    openSockets.forEach((socket) => {socket.disconnect(true)});
    server.close(function() {
        server = undefined;
    });
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