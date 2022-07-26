const mysql = require("mysql");
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");

const server = express();
server.set("view engine", "ejs");
server.use(express.static(path.join(__dirname, "public")));

const port = process.env.PORT || 3000;

// Parse URL-encoded bodies (as sent by HTML forms)
server.use(express.urlencoded());
// Parse JSON bodies (as sent by API clients)
server.use(express.json());

// DB Connection Data
const db = mysql.createPool({
    connectionLimit : 1000,
    connectTimeout  : 60 * 60 * 1000,
    acquireTimeout  : 60 * 60 * 1000,
    timeout         : 6,
    host            : ".kasserver.com",
    user            : "",
    password        : "",
    database        : "",
    port            : 3306
})



// Routes
server.get("", function(req, res) {
    res.render("index");
});

server.get("/allcards", function(req, res) {

    console.log("/allcards");
    db.getConnection((err, connection) => {
        if (err) throw err;

        connection.query('SELECT b.*, JSON_ARRAYAGG(a.keyword) as keywords FROM (SELECT a.setnr, b.keyword FROM Card a, CardKeyword b WHERE a.setnr = b.setnr) a, Card b WHERE a.setnr = b.setnr AND b.life = -1 AND b.intellect = -1 GROUP BY setnr ORDER BY setnr LIMIT 250', function (err, result) {
            if (err) throw err;
            var json = JSON.stringify(result);
            res.write(json);
            res.end();
        });
        connection.release();
    });

});

server.get("/json", function(req, res) {
    getCards().then((message) => {
        res.write(message);
        res.end();
    });
});

server.get("/versions", function(req, res) {

    // Get all deck versions
    db.getConnection((err, connection) => {
        if (err) throw err;

        connection.query('SELECT * FROM DeckVersion WHERE deckid = 0;', function (err, result) {
            if (err) throw err;
            var json = JSON.stringify(result);

            res.render("versions", {data: result});

        });
        connection.release();
    });
});

server.get("/deck", function(req, res) {
// Get all deck versions
    db.getConnection((err, connection) => {
        if (err) throw err;

        connection.query('SELECT COUNT(a.setnr) as count, c.setnr as HeroSetNr, a.*, b.*, c.*, d.* FROM DeckCard a, Deck b, Hero c, Card d WHERE a.deckid = b.id AND d.setnr = a.setnr AND b.heroid = c.id GROUP BY a.sideboardid, a.setnr', function (err, result) {
            if (err) throw err;
            //var json = JSON.stringify(result);

            var hero = result[0].HeroSetNr;
            var equipment = [];
            var maindeck = [];
            var sideboard = [];

            //maindeck
            for (var i = 0; i < result.length; i++) {
                console.log(result[i].setnr);
                if (result[i].sideboardid > 0) {
                    sideboard.push({id: result[i].setnr, count: result[i].count});
                }
                //else if (result[i].keywords.includes("equipment")) {
                else if (result[i].cost == -1) {
                    equipment.push({id: result[i].setnr, count: result[i].count});
                }
                else {
                    maindeck.push({id: result[i].setnr, count: result[i].count});
                }
            }

            console.log(maindeck);

            var final = {hero: hero,
                         hero_id: hero,
                         weapons: [],
                         equipment: equipment,
                         maindeck: maindeck,
                         sideboard: sideboard}

            res.write(JSON.stringify(final));
            res.end();

        });
        connection.release();
    });
});

server.listen(port, () => console.log("Listening on port "+port+"..."));




// Websocket Server
const WebSocket = require("ws");

const PORT = 5000;

const wsServer = new WebSocket.Server({
    port: PORT
});


var deckVersion = 0;
db.getConnection((err, connection) => {
    if (err) throw(err);

    var sql = 'SELECT versionnr FROM DeckVersion WHERE deckid = 0 ORDER BY versionnr DESC LIMIT 1';
    connection.query(sql, function (err, result) {
        if (err) throw(err);
        deckVersion = result[0].versionnr;
    });
    connection.release();
});

wsServer.on("connection", function(socket) {

    console.log("A client just connected ");

    // Send current Decklist while connected
    getDeckCards(0).then((message) => {
        socket.send(JSON.stringify({type: "deckList", content: message}));
        socket.send(JSON.stringify({type: "deckVersion", content: deckVersion}));
    });

    // Translate messages into functions
    socket.on("message", function (msg) {
        console.log("Received message from Client: " + msg);
        msg = JSON.parse(msg);

        switch(msg.type) {

            case "addCardSideboard":
            case "addCard":

                var sideboardid = 0;
                if (msg.type == "addCardSideboard") {sideboardid = 1;}
                addCardToDeck(msg.content, sideboardid).then((message) => {
                    if (message == "suc") {
                        msg = JSON.stringify(msg);

                        wsServer.clients.forEach(function (client) {
                            client.send(msg);
                        });
                    }
                });
                break;

            case "removeCardSideboard":
            case "removeCard":

                var sideboardid = 0;
                if (msg.type == "removeCardSideboard") {sideboardid = 1;}
                removeCardFromDeck(msg.content, sideboardid).then((message) => {
                    if (message == "suc") {
                        msg = JSON.stringify(msg);

                        wsServer.clients.forEach(function (client) {
                            client.send(msg);
                        });
                    }
                });
                break;

            case "commitDeck":

                commitDeck(msg.content, 0).then((message) => {
                    if (message == "suc") {
                        wsServer.clients.forEach(function (client) {
                            client.send(JSON.stringify({type: "refresh", content: ""}));
                        });
                    }
                });

                break;

            case "gotoDeckVersion":

                gotoDeckVersion("Rolled back to version " + msg.content, 0, msg.content).then((message) => {
                    if (message == "suc") {
                        wsServer.clients.forEach(function (client) {
                            client.send(JSON.stringify({type: "refresh", content: ""}));
                        });
                    }
                });

                break;
        }
    });



    // Other
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



// Functions


function addCardToDeck(setnr, sideboard) {
    return new Promise((resolve, reject) => {
        db.getConnection((err, connection) => {
            if (err) reject(err);

            // Check if Deck is full
            var sql = 'SELECT COUNT(*) as num FROM DeckCard WHERE deckid = 0';
            connection.query(sql, function (err, result) {
                if (err) reject(err);

                if (result[0].num < 80) {
                    var sql = 'INSERT INTO DeckCard (deckid, setnr, userid, versionnr, sideboardid) VALUES (?)';
                    var values = [[0, setnr, 0, deckVersion, sideboard]];
                    connection.query(sql, values, function (err, result) {
                        if (err) reject(err);
                        resolve("suc");
                    });
                }
                else {
                    reject();
                }
            });

            connection.release();
        });
    });
}

function removeCardFromDeck(setnr, sideboard) {
    return new Promise((resolve, reject) => {
        db.getConnection((err, connection) => {
            if (err) reject(err);

            var sql = 'DELETE FROM DeckCard WHERE setnr = ? AND sideboardid = ? AND deckid = 0 AND versionnr = '+deckVersion+' LIMIT 1';
            var values = [setnr, sideboard];
            connection.query(sql, values, function (err, result) {
                if (err) reject(err);
                resolve("suc");
            });
            connection.release();
        });
    });
}

function getDeckCards(deckid) {
    return new Promise((resolve, reject) => {
        var sql = 'SELECT c.id as "id", c.sideboardid as sideboardid, b.*, JSON_ARRAYAGG(a.keyword) as keywords FROM (SELECT a.setnr, b.keyword FROM Card a, CardKeyword b WHERE a.setnr = b.setnr) a, Card b, DeckCard c WHERE a.setnr = b.setnr AND b.setnr = c.setnr AND c.deckid = '+deckid+' AND c.versionnr = '+deckVersion+' GROUP BY c.id ORDER BY setnr';

        db.getConnection((err, connection) => {
            if (err) reject(err);

            connection.query(sql, function (err, result) {
                if (err) reject(err);
                var json = JSON.stringify(result);
                resolve(json);
            });
            connection.release();
        });
    });
}

function commitDeck(message, deckid) {
    return new Promise((resolve, reject) => {
        // Increase Version
        deckVersion++;
        db.getConnection((err, connection) => {
            if (err) reject(err);

            sql = 'INSERT INTO DeckVersion (versionnr, deckid, description) VALUES ('+deckVersion+', 0, "'+message+'")';
            connection.query(sql, function (err, result) {
                if (err) reject(err);

                sql = 'INSERT INTO DeckCard (deckid, setnr, userid, versionnr, sideboardid) SELECT deckid, setnr, userid, '+deckVersion+', sideboardid FROM DeckCard WHERE deckid = 0 AND versionnr = '+(deckVersion-1);
                connection.query(sql, function (err, result) {
                    if (err) reject(err);

                    resolve("suc");
                });

            });
            connection.release();
        });
    });
}

function gotoDeckVersion(message, deckid, versionnr) {
    return new Promise((resolve, reject) => {
        // Increase Version
        deckVersion++;
        db.getConnection((err, connection) => {
            if (err) reject(err);

            sql = 'INSERT INTO DeckVersion (versionnr, deckid, description) VALUES ('+deckVersion+', 0, "'+message+'")';
            connection.query(sql, function (err, result) {
                if (err) reject(err);

                sql = 'INSERT INTO DeckCard (deckid, setnr, userid, versionnr, sideboardid) SELECT deckid, setnr, userid, '+deckVersion+', sideboardid FROM DeckCard WHERE deckid = 0 AND versionnr = '+versionnr;
                connection.query(sql, function (err, result) {
                    if (err) reject(err);

                    resolve("suc");
                });

            });
            connection.release();
        });
    });
}

function getCards() {
    return new Promise((resolve, reject) => {
        var sql = "SELECT c.name as name, JSON_ARRAYAGG(t.keywords) as keywords FROM (SELECT c.setnr as setnr, k.keyword as keywords FROM Card c, CardKeyword k WHERE c.setnr = k.setnr) t, Card c WHERE c.setnr = t.setnr GROUP BY c.setnr LIMIT 10";
        db.query(sql, function (err, result) {
            if (err) reject(err);

            var json = JSON.stringify(result);
            resolve(json);
        });
    });
}


//getDeckCards(0);
