var haveEvents = 'ongamepadconnected' in window;
var controllers = {};

function connecthandler(e) {
    addgamepad(e.gamepad);
}

function addgamepad(gamepad) {
    controllers[gamepad.index] = gamepad;
    
    requestAnimationFrame(updateStatus);
}

function disconnecthandler(e) {
    removegamepad(e.gamepad);
}

function removegamepad(gamepad) {
    document.body.removeChild(d);
    delete controllers[gamepad.index];
}

function updateStatus() {
    if (!haveEvents) {
        scangamepads();
    }

    var i = 0;
    var j;

    var inputValues = {
        buttons: [],
        axes: []
    };

    for (j in controllers) {
        var controller = controllers[j];

        for (i = 0; i < controller.buttons.length; i++) {
            var val = controller.buttons[i];
            var pressed = val == 1.0;
            if (typeof (val) == "object" && val.pressed) {
                inputValues.buttons.push(val.value);
                console.log(i + ": " + val.value);
            } else {
                inputValues.buttons.push(val.value);
            }
        }
        
        for (i = 0; i < controller.axes.length; i++) {
            inputValues.axes.push(controller.axes[i]);
            if (Math.abs(controller.axes[i]) > .1) {
                console.log(i + " " + controller.axes[i])
            }
        }
    }

    sendControllerInput(inputValues);
    requestAnimationFrame(updateStatus);
}

function sendControllerInput(inputValues) {
    if (viewerPeer) {
        viewerPeer.send(JSON.stringify({ type: 'gamepad', inputValues: inputValues }));
    }
}

function scangamepads() {
    var gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads() : []);
    for (var i = 0; i < gamepads.length; i++) {
        if (gamepads[i]) {
            if (gamepads[i].index in controllers) {
                controllers[gamepads[i].index] = gamepads[i];
            } else {
                addgamepad(gamepads[i]);
            }
        }
    }
}


$(document).ready(() => {
    window.addEventListener("gamepadconnected", connecthandler);
    window.addEventListener("gamepaddisconnected", disconnecthandler);
})


if (!haveEvents) {
    setInterval(scangamepads, 500);
}