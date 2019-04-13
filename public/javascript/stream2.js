const main = async(function* main() {
    let tasks = Promise.resolve(void 0);

    const devices = yield navigator.mediaDevices.enumerateDevices();
    console.table(devices);

    const stream = yield navigator.mediaDevices.getUserMedia({ video: true, audio: true });

    const rec = new MediaRecorder(stream, { mimeType: 'video/webm; codecs="opus,vp8"' });

    const ms = new MediaSource();

    const video = document.querySelector("video");
    //video.srcObject = ms;
    video.src = URL.createObjectURL(ms);
    video.volume = 0;
    document.body.appendChild(video);
    

    yield new Promise((resolve, reject) => {
        ms.addEventListener('sourceopen', () => resolve(), { once: true });
    });

    const sb = ms.addSourceBuffer(rec.mimeType);

    let i = 0;
    rec.ondataavailable = ({ data }) => {
        tasks = tasks.then(async(function* () {
            console.group("" + i);

            try {
                if (data.size === 0) {
                    console.warn("empty recorder data");
                    throw new Error("empty recorder data");
                }

                const buf = yield readAsArrayBuffer(data);

                sb.appendBuffer(buf);
                yield new Promise((resolve, reject) => {
                    sb.addEventListener('updateend', () => resolve(), { once: true });
                    sb.addEventListener("error", (err) => reject(ev), { once: true });
                });


                if (video.buffered.length > 1) {
                    console.warn("MSE buffered has a gap!");
                    throw new Error("MSE buffered has a gap!");
                }
            } catch (err) {
                console.error(err);
                yield stop();
                console.groupEnd("" + i); i++;
                return Promise.reject(err);
            }

            console.groupEnd("" + i);
            i++;
        }));
    };

    $(document).ready(() => {
        rec.start(1000);
        video.play();
        console.info("start");
    })
});



function sleep(ms) {
    return new Promise(resolve =>
        setTimeout((() => resolve(ms)), ms));
}


function readAsArrayBuffer(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener("loadend", () => resolve(reader.result), { once: true });
        reader.addEventListener("error", (err) => reject(err.error), { once: true });
        reader.readAsArrayBuffer(blob);
    });
}


function async(generatorFunc) {
    return function (arg) {
        const generator = generatorFunc(arg);
        return next(null);
        function next(arg) {
            const result = generator.next(arg);
            if (result.done) { return result.value; }
            else if (result.value instanceof Promise) { return result.value.then(next); }
            else { return Promise.resolve(result.value); }
        }
    }
}

console.clear();
main().catch(console.error);