const electron = require('electron');
const url = require('url');
const path = require('path');

const net = require('net');

const { app, BrowserWindow, Menu, ipcMain } = electron;

let startWindow;
let streamWindow;
let settingsWindows;

app.on('ready', function() {
    startWindow = new BrowserWindow({
        width: 1350,
        height: 800
    });

    startWindow.loadFile('startWindow.html');

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
    createStreamViewerWindow();
});

ipcMain.on('stream:start', function (e) {
    //mainWindow.webContents.send('item:add', item);
    createBroadcastStreamWindow();
    startWindow.webContents.once("did-finish-load", function () {
        var http = require("http");
        var crypto = require("crypto");
        var server = http.createServer(function (req, res) {
            var port = crypto.randomBytes(16).toString("hex");
            ipcMain.once(port, function (ev, status, head, body) {
                res.writeHead(status, head);
                res.end(body);
            });
            window.webContents.send("request", req, port);
        });
        server.listen(8000);
        console.log("http://localhost:8000/");
    });
});

ipcMain.on('stream:stop', function (e) {
    //mainWindow.webContents.send('item:add', item);

    // Stop listening on port.

    createMainWindow();
});

startWindow.on('closed', function () {
    startWindow = null;
})

// TODO
net.createServer().listen();


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