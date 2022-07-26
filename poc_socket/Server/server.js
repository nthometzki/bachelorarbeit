const WebSocket = require("ws");

const PORT = 5000;

const wsServer = new WebSocket.Server({
    port: PORT
});

wsServer.on("connection", function(socket) {

    console.log("A client just connected");

    socket.on("message", function (msg) {
        console.log("Received message from Client: " + msg);

        wsServer.clients.forEach(function (client) {
            client.send("Someone said: " + msg);
        });
    });

    socket.on("close", function() {
        console.log("Player Disconnected");
    });

    socket.on('timeout', function() {
        console.log('Socket timed out !');
        socket.end('Timed out!');
    });

    socket.on('end', function(data) {
        console.log('Socket ended from other end!');
    });

    socket.on('error',function(error){
        console.log('Error : ' + error);
    });

    socket.on('disconnect', function(data) {
        console.log('disconnect!');
    });

});

console.log((new Date()) + " Server is listening on port " + PORT);