const serverAddress = "ws://localhost:5000";

const ws = new WebSocket(serverAddress);

ws.addEventListener("open", () => {
    console.log("We are connected.");
});

ws.addEventListener("message", (msg) => {
    console.log(msg);
});

ws.addEventListener('close', function (event) {
    console.log('disconnected');
});

function ping() {
    ws.send(JSON.stringify({type: "ping"}));
    console.log("sent ping");
}

function drop() {
    console.log("Trying to close the connection.")
    ws.close();
}