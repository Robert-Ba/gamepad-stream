const electron = require('electron');
const url = require('url');
const path = require('path');

const {app, BrowserWindow, Menu} = electron;

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

const mainMenuTemplate = [
    {
        label: 'File',
        submenu: [
            {
                label: 'Connect'
            },
            {
                label: 'Quit',
                accelerator: process.platform === "darwin" ? 'Command+Q' : 'Ctrl+Q',
                click() {
                    app.quit();
                }
            },
            {
                label: 'Dev Tools',
                accelerator: process.platform === "darwin" ? 'Command+D' : 'Ctrl+D',
                click() {
                    startWindow.webContents.openDevTools()
                }
            }
        ]
    }
];