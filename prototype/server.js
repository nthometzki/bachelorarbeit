const mysql = require("mysql");
const express = require("express");
const useragent = require('express-useragent');
const bcrypt = require("bcrypt");
const path = require("path");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

const server = express();
server.set("view engine", "ejs");
server.use(express.static(path.join(__dirname, "public")));
server.use(cookieParser());
server.use(useragent.express())

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
    host            : "",
    user            : "",
    password        : "",
    database        : "",
    port            : 3306
})



// Routes
server.get("/", function(req, res) {
    checkLoginToken(req, res, false).then((userid) => {
        if (userid != false) {
            db.query('SELECT * FROM Hero', function (err, heroes) {
                db.query('SELECT d.id as deckid, d.userid as owner, d.name, c.userid as userid, c.access FROM Deck d, DeckContributor c WHERE c.deckid = d.id AND c.userid = ?', [userid], function (err, result) {
                    if (err) throw err;
                    res.render("deck_overview", {data: result, heroes: heroes});
                });
            });
        }
    });
});

server.post("/addDeck", function(req, res) {
    const { deckname, hero } = req.body;
    const { cookies } = req;
    const session_id = cookies.session_id
    const deck_id = getRandomToken(16);

    getUserId(session_id).then((message) => {
        db.query("INSERT INTO Deck (id, userid, heroid, name, share_code_edit, share_code_view) VALUES (?, ?, ?, ?, ?, ?)", [deck_id, message.userid, parseInt(hero), deckname, getRandomToken(16), getRandomToken(16)], (err, result) => {
            if (err) throw err;
            db.query("INSERT INTO DeckVersion (versionnr, deckid, description) VALUES (?, ?, ?)", [1, deck_id, "Start"], (err, result) => {
                if (err) throw err;
                db.query("INSERT INTO DeckContributor (userid, deckid, access) VALUES (?, ?, ?)", [message.userid, deck_id, 1], (err, result) => {
                    if (err) throw err;
                    res.redirect("/deck/"+deck_id);
                });
            });
        });
    });
});

server.get("/deck/:deckid", function(req, res) {
    if (req.useragent.browser == "UnityPlayer") {
        getDeckVersion(req.params.deckid).then((deckversion) =>{
            db.getConnection((err, connection) => {
                if (err) throw err;

                connection.query('SELECT COUNT(a.setnr) as count, c.setnr as HeroSetNr, a.*, b.*, c.*, d.* FROM DeckCard a, Deck b, Hero c, Card d WHERE a.deckid = b.id AND d.setnr = a.setnr AND b.heroid = c.id AND b.id = ? AND a.versionnr = ? GROUP BY a.sideboardid, a.setnr', [req.params.deckid, deckversion], function (err, result) {
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
    }
    else {
        checkLoginToken(req, res, false).then((userid) => {
            if (userid != false) {
                //db.query('SELECT * FROM Deck d, DeckCard c, DeckContributor dc, (SELECT * FROM DeckVersion WHERE deckid = ? ORDER BY versionnr DESC LIMIT 1) v WHERE d.id = c.deckid AND d.id = dc.deckid AND d.id = v.deckid AND c.versionnr = v.versionnr AND dc.userid = ?', [req.params.deckid, userid],  function (err, result) {
                db.query('SELECT d.name as name, dc.*, h.name as heroname, c.text as text, c.intellect as intellect, c.life as life, d.share_code_edit as share_code_edit, d.share_code_view as share_code_view FROM Deck d, DeckContributor dc, Hero h, Card c WHERE d.id = dc.deckid AND c.setnr = h.setnr AND d.heroid = h.id AND dc.userid = ? AND d.id = ?', [userid, req.params.deckid],  function (err, result) {
                    res.render("index", {share_view: "localhost:3000/share-view/"+result[0].share_code_view, share_edit: "localhost:3000/share-edit/"+result[0].share_code_edit, deckname: result[0].name, deckid: req.params.deckid, rows: result});
                });
            }
        });
    }
});

server.get("/share-edit/:edit_code", function(req, res) {
    checkLoginToken(req, res, false).then((userid) => {
        if (userid != false) {
            db.query('SELECT * FROM Deck d, DeckContributor dc WHERE d.id = dc.deckid AND dc.userid = ? AND d.share_code_edit = ?', [userid, req.params.edit_code],  function (err, result) {
                if (result.length == 0) {
                    db.query('SELECT * FROM Deck WHERE share_code_edit = ?', [req.params.edit_code],  function (err, result) {
                        db.query('INSERT INTO DeckContributor (userid, deckid, access) VALUES (?, ?, ?)', [userid, result[0].id, 1], function (err, result2) {
                            res.redirect("/deck/"+result[0].id);
                        });
                    });
                }
                else {
                    res.redirect("/");
                }
            });
        }
    });
});

server.get("/allcards/:heroid", function(req, res) {
    const sql = 'SELECT * FROM'
    +' (SELECT a.setnr as snr, b.*, JSON_ARRAYAGG(a.keyword) as keywords FROM (SELECT a.setnr, b.keyword FROM Card a, CardKeyword b WHERE a.setnr = b.setnr) a, Card b WHERE a.setnr = b.setnr AND b.life = -1 AND b.intellect = -1 GROUP BY setnr ORDER BY setnr) a,'
    +' (SELECT kw.setnr as snr FROM CardKeyword kw, (SELECT h.*, JSON_ARRAYAGG(a.keyword) as keywords FROM (SELECT a.setnr, b.keyword FROM Hero h, Card a, CardKeyword b WHERE a.setnr = b.setnr AND h.setnr = a.setnr AND h.id = ?) a, Hero h, Card ca WHERE h.setnr = ca.setnr AND h.id = ?) her WHERE ((her.keywords LIKE CONCAT("%", kw.keyword, "%") AND kw.keyword != "young" AND kw.keyword != "hero") OR kw.keyword = "generic") AND kw.keyword != "token") b'
    +' WHERE a.snr = b.snr';

    db.query(sql, [req.params.heroid, req.params.heroid], function (err, result) {
        if (err) throw err;
        var json = JSON.stringify(result);
        res.write(json);
        res.end();
    });
});

server.get("/versions/:deckid", function(req, res) {
    checkLoginToken(req, res, false).then((userid) => {

        // Get all deck versions
        db.query('SELECT v.* FROM DeckVersion v, DeckContributor dc WHERE v.deckid = dc.deckid AND dc.userid = ? AND v.deckid = ?', [userid, req.params.deckid], function (err, result) {
            if (err) throw err;
            var json = JSON.stringify(result);

            res.render("versions", {data: result});

        });
    });
});

server.get("/tts/:deckid", function(req, res) {

    getDeckVersion(req.params.deckid).then((deckversion) =>{
        db.getConnection((err, connection) => {
            if (err) throw err;

            connection.query('SELECT COUNT(a.setnr) as count, c.setnr as HeroSetNr, a.*, b.*, c.*, d.* FROM DeckCard a, Deck b, Hero c, Card d WHERE a.deckid = b.id AND d.setnr = a.setnr AND b.heroid = c.id AND b.id = ? AND a.versionnr = ? GROUP BY a.sideboardid, a.setnr', [req.params.deckid, deckversion], function (err, result) {
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
});


// ----------------- Login & Register -------------------

server.get("/login", function(req, res) {
    checkLoginToken(req, res, true).then((userid) => {
        if (userid == false) {
            console.log("False");
            res.render("login");
        }
        else {
            console.log("not false");
            res.redirect("/");
        }
    });
});

server.post("/login", function(req, res) {

    // Parse post body data
    const {email, password} = req.body;

    // Get Login Data from mysql db
    db.query("SELECT id, email, password FROM User WHERE email = '" + email + "'", function (err, rows) {

        if (rows.length == 0) {
            res.render("login");
        }
        else {
            // Compare encrypted password with plaintext password
            bcrypt.compare(req.body.password, rows[0].password).then(function(same, err) {

                // It is the same password
                if (same) {
                    // Set Token
                    var loginToken = getRandomToken(32);
                    setLoginToken(rows[0].id, loginToken);

                    // Set Cookie
                    res.cookie("session_id", loginToken);

                    //
                    res.redirect("/");
                } else { // Password is not valid
                    console.log(err);
                    res.render("login");
                }
            });
        }
    });
});



server.get("/register", function(req, res) {
    res.render("register");
});

server.post('/register', function(req, res) {

    // Parse info
    const {email, password} = req.body;

    // Save data in DB
    db.query("SELECT email FROM User WHERE email = '" + email +"';", function (err, result) {
        if (err) throw err;

        if (result.length == 0) {
            // Encrypt password
            bcrypt.hash(password, 10, (err, hash) => {
                if (err) throw err; // When error occurs

                // Insert new account data into db
                db.query("INSERT INTO User (email, password) VALUES ('" + email + "', '" + hash + "')", (err, rows) => {

                    // Show Register success screen
                    /*
                    res.render("register", {
                        username: email,
                        text1: "registered",
                    });
                    */
                    res.redirect("/login");
                });
            });
        }
    });

});


server.listen(port, () => console.log("Listening on port "+port+"..."));


function checkLoginToken(req, res, loginpage) {
    return new Promise((resolve, reject) => {
        const { cookies } = req;
        //console.log(cookies.session_id);

        if (cookies.session_id == undefined) {
            if (!loginpage) {
                res.redirect("/login");
            }
            resolve(false);
        }
            else {
            db.query("SELECT userid, token FROM LoginToken WHERE token = ?", [cookies.session_id], (err, rows) => {
                if (err) throw err; // When error occurs

                if (rows.length > 0) {
                    resolve(rows[0].userid)
                }
                else {
                    res.clearCookie("session_id");
                    if (!loginpage) {
                        res.redirect("/login");
                    }
                    resolve(false);
                }
            });
        }
    });
}

function getUserId(token) {
    return new Promise((resolve, reject) => {
        if (token == "") {
            resolve(false);
        }
        else {
            db.query("SELECT t.userid, t.token, u.name FROM LoginToken t, User u WHERE t.userid = u.id AND t.token = ?", [token], (err, rows) => {
                if (err) throw err; // When error occurs

                if (rows.length > 0) {
                    resolve(rows[0]);
                }
                else {
                    resolve(false);
                }
            });
        }
    });
}


function getRandomToken(length) {
    let result = '';
    const characters ='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for ( let i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    return result;
}

function setLoginToken(userid, token) {
    return new Promise((resolve, reject) => {
        // Insert new account data into db
        db.query("INSERT INTO LoginToken (userid, token) VALUES ('" + userid + "', '" + token + "')", (err, rows) => {
            resolve("suc");
        });
    });
}





// Websocket Server
const WebSocket = require("ws");
const { cookie } = require("express/lib/response");
const { redirect } = require("express/lib/response");

const PORT = 5000;

const wsServer = new WebSocket.Server({
    port: PORT
});



wsServer.on("connection", function(socket, req) {

    console.log("A client just connected.");
    console.log(req.url);

    socket.session_id = "";
    socket.user_id = 0;
    socket.user_name = "";
    socket.deck_id = 0;
    socket.deck_version_id = 0;
    socket.access_type = 0;
    socket.hero_id = 0;


    // Parse session_id token to identify user
    const params = new URL("https://fabmeta.net/"+req.url).searchParams;
    if (params.has("session_id")) {
        // Logged in
        socket.session_id = params.get("session_id");
        getUserId(socket.session_id).then((message) => {
            if (message != false) {
                socket.user_id = message.userid;
                socket.user_name = message.name;
                console.log("User id: "+socket.user_id);
                console.log("User name: "+socket.user_name);

                if (params.has("deck")) {
                    socket.deck_id = params.get("deck");

                    // Deck Deck data
                    getDeckInformation(socket.deck_id).then((message) => {
                        socket.hero_id = message[0].heroid;
                        getAllCards(socket.hero_id).then((cards_data) => {
                            socket.send(JSON.stringify({type: "getCards", content: JSON.stringify(cards_data)}));
                        });
                    });

                    // Return Deck List to user
                    getDeckVersion(socket.deck_id).then((message) => {
                        socket.deck_version_id = message;
                        checkAccess(socket.deck_id, socket.user_id).then((access) => {
                            socket.access_type = access;
                            if (socket.access_type > 0) {
                                // Access granted
                                getDeckCards(socket.deck_id, socket.deck_version_id, socket.user_id).then((message) => {
                                    socket.send(JSON.stringify({type: "deckList", content: message}));
                                    socket.send(JSON.stringify({type: "deckVersion", content: socket.deck_version_id}));
                                    socket.hero_id

                                    console.log("Deck id: "+socket.deck_id);
                                    console.log("Deck Version id: "+socket.deck_version_id);

                                    // Spit out who is editing this deck right now
                                    /*var whoEditsDeck = [socket.user_name.charAt(0)];
                                    wsServer.clients.forEach(function (client) {
                                        if (client.deck_id == socket.deck_id && client.user_id != socket.user_id) {
                                            whoEditsDeck.push(client.user_name.charAt(0));
                                        }
                                    });

                                    wsServer.clients.forEach(function (client) {
                                        if (client.deck_id == socket.deck_id) {
                                            client.send(JSON.stringify({type: "usersEditing", content: whoEditsDeck}));
                                        }
                                    });*/
                                    whoEdits(socket, wsServer);
                                });
                            }
                            else {
                                // No access
                            }
                        });
                    });
                }
            }
        });
    }


    // Translate messages into functions
    socket.on("message", function (msg) {
        console.log("Received message from Client: " + msg);
        msg = JSON.parse(msg);

        switch(msg.type) {

            case "addCardSideboard":
            case "addCard":

                if (socket.access_type > 0) { // Only when access available
                    var sideboardid = 0;
                    if (msg.type == "addCardSideboard") {sideboardid = 1;}
                    addCardToDeck(msg.content, sideboardid, socket.deck_version_id, socket.deck_id, socket.user_id).then((message) => {
                        if (message == "suc") {
                            msg = JSON.stringify(msg);

                            wsServer.clients.forEach(function (client) {
                                if (client.deck_id == socket.deck_id) {
                                    client.send(msg);
                                }
                            });
                        }
                    });
                }
                break;

            case "removeCardSideboard":
            case "removeCard":

                if (socket.access_type > 0) { // Only when access available
                    var sideboardid = 0;
                    if (msg.type == "removeCardSideboard") {sideboardid = 1;}
                    removeCardFromDeck(msg.content, sideboardid, socket.deck_version_id, socket.deck_id).then((message) => {
                        if (message == "suc") {
                            msg = JSON.stringify(msg);

                            wsServer.clients.forEach(function (client) {
                                if (client.deck_id == socket.deck_id) {
                                    client.send(msg);
                                }
                            });
                        }
                    });
                }
                break;

            case "commitDeck":

                if (socket.access_type > 0) { // Only when access available
                    commitDeck(msg.content, socket.deck_id).then((message) => {
                        if (message == "suc") {
                            wsServer.clients.forEach(function (client) {
                                if (client.deck_id == socket.deck_id) {
                                    client.send(JSON.stringify({type: "refresh", content: ""}));
                                }
                            });
                        }
                    });
                }

                break;

            case "gotoDeckVersion":

                if (socket.access_type > 0) { // Only when access available
                    gotoDeckVersion("Rolled back to version " + msg.content, socket.deck_id, msg.content).then((message) => {
                        if (message == "suc") {
                            wsServer.clients.forEach(function (client) {
                                if (client.deck_id == socket.deck_id) {
                                    client.send(JSON.stringify({type: "refresh", content: ""}));
                                }
                            });
                        }
                    });
                }

                break;
        }
    });



    // Other
    socket.on("close", function() {
        socket.user_id = 0;
        whoEdits(socket, wsServer);
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


function addCardToDeck(setnr, sideboard, deck_version_id, deck_id, user_id) {
    return new Promise((resolve, reject) => {
        db.getConnection((err, connection) => {
            if (err) reject(err);

            // Check if Deck is full
            var sql = 'SELECT COUNT(*) as num FROM DeckCard WHERE deckid = ? AND versionnr = ?';
            connection.query(sql, [deck_id, deck_version_id], function (err, result) {
                if (err) reject(err);

                if (result[0].num < 80) {
                    var sql = 'INSERT INTO DeckCard (deckid, setnr, userid, versionnr, sideboardid) VALUES (?, ?, ?, ?, ?)';
                    var values = [deck_id, setnr, user_id, deck_version_id, sideboard];
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

function removeCardFromDeck(setnr, sideboard, deck_version_id, deck_id) {
    return new Promise((resolve, reject) => {
        db.getConnection((err, connection) => {
            if (err) reject(err);

            var sql = 'DELETE FROM DeckCard WHERE setnr = ? AND sideboardid = ? AND deckid = ? AND versionnr = '+deck_version_id+' LIMIT 1';
            var values = [setnr, sideboard, deck_id];
            connection.query(sql, values, function (err, result) {
                if (err) reject(err);
                resolve("suc");
            });
            connection.release();
        });
    });
}

function getDeckCards(deckid, deck_version_id, user_id) {
    return new Promise((resolve, reject) => {
        var sql = 'SELECT c.id as "id", c.sideboardid as sideboardid, b.*, JSON_ARRAYAGG(a.keyword) as keywords FROM (SELECT a.setnr, b.keyword FROM Card a, CardKeyword b WHERE a.setnr = b.setnr ORDER BY b.keyword) a, Card b, DeckCard c WHERE a.setnr = b.setnr AND b.setnr = c.setnr AND c.deckid = "'+deckid+'" AND c.versionnr = '+deck_version_id+' GROUP BY c.id ORDER BY resource, cost, keywords, name';

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
        getDeckVersion(deckid).then((deck_version_id) => {
            db.getConnection((err, connection) => {
                if (err) reject(err);

                sql = 'INSERT INTO DeckVersion (versionnr, deckid, description) VALUES ('+(deck_version_id+1)+', ?, "'+message+'")';
                connection.query(sql, [deckid], function (err, result) {
                    if (err) reject(err);

                    sql = 'INSERT INTO DeckCard (deckid, setnr, userid, versionnr, sideboardid) SELECT deckid, setnr, userid, '+(deck_version_id+1)+', sideboardid FROM DeckCard WHERE deckid = ? AND versionnr = '+deck_version_id;
                    connection.query(sql, [deckid], function (err, result) {
                        if (err) reject(err);

                        resolve("suc");
                    });

                });
                connection.release();
            });
        });
    });
}

function gotoDeckVersion(message, deckid, versionnr) {
    return new Promise((resolve, reject) => {
        // Increase Version
        getDeckVersion(deckid).then((deck_version_id) => {
            db.getConnection((err, connection) => {
                if (err) reject(err);

                sql = 'INSERT INTO DeckVersion (versionnr, deckid, description) VALUES ('+(deck_version_id+1)+', ?, "'+message+'")';
                connection.query(sql, [deckid], function (err, result) {
                    if (err) reject(err);

                    sql = 'INSERT INTO DeckCard (deckid, setnr, userid, versionnr, sideboardid) SELECT deckid, setnr, userid, '+(deck_version_id+1)+', sideboardid FROM DeckCard WHERE deckid = ? AND versionnr = '+versionnr;
                    connection.query(sql, [deckid], function (err, result) {
                        if (err) reject(err);

                        resolve("suc");
                    });

                });
                connection.release();
            });
        });
    });
}

function getDeckVersion(deckid) {
    return new Promise((resolve, reject) => {
        db.getConnection((err, connection) => {
            if (err) throw(err);

            var sql = 'SELECT versionnr FROM DeckVersion WHERE deckid = ? ORDER BY versionnr DESC LIMIT 1';
            connection.query(sql, [deckid], function (err, result) {
                if (err) throw(err);
                if (result.length > 0) {
                    resolve(result[0].versionnr);
                }
                else {
                    reject();
                }
            });
            connection.release();
        });
    });
}

function checkAccess(deck_id, user_id) {
    return new Promise((resolve, reject) => {
        db.getConnection((err, connection) => {
            if (err) throw(err);

            var sql = 'SELECT c.access as access FROM Deck d, DeckContributor c WHERE c.userid = ? AND d.id = ?';
            connection.query(sql, [user_id, deck_id], function (err, rows) {
                if (err) throw(err);

                if (rows.length > 0) {
                    resolve(rows[0].access);
                }
                else {
                    resolve(0);
                }
            });
            connection.release();
        });
    });
}

function getAllCards(heroid) {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT * FROM'
        +' (SELECT a.setnr as snr, b.*, JSON_ARRAYAGG(a.keyword) as keywords FROM (SELECT a.setnr, b.keyword FROM Card a, CardKeyword b WHERE a.setnr = b.setnr) a, Card b WHERE a.setnr = b.setnr AND b.life = -1 AND b.intellect = -1 GROUP BY setnr ORDER BY setnr) a,'
        +' (SELECT kw.setnr as snr FROM CardKeyword kw, (SELECT h.*, JSON_ARRAYAGG(a.keyword) as keywords FROM (SELECT a.setnr, b.keyword FROM Hero h, Card a, CardKeyword b WHERE a.setnr = b.setnr AND h.setnr = a.setnr AND h.id = ?) a, Hero h, Card ca WHERE h.setnr = ca.setnr AND h.id = ?) her WHERE ((her.keywords LIKE CONCAT("%", kw.keyword, "%") AND kw.keyword != "young" AND kw.keyword != "hero") OR kw.keyword = "generic") AND kw.keyword != "token") b'
        +' WHERE a.snr = b.snr ORDER BY keywords, name, attack, defense, setnr';

        db.query(sql, [heroid, heroid], function (err, result) {
            if (err) throw err;
            resolve(result);
        });
    });
}

function getDeckInformation(deckid) {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT * FROM Deck WHERE id = ?';

        db.query(sql, [deckid], function (err, result) {
            if (err) throw err;
            resolve(result);
        });
    });
}

function whoEdits(socket, wsServer) {
    // Spit out who is editing this deck right now

    wsServer.clients.forEach(function (mainClient) {
        var whoEditsDeck = [mainClient.user_name.charAt(0)];
        wsServer.clients.forEach(function (client) {
            if (client.deck_id == socket.deck_id && client.user_id != 0 && mainClient.user_id != client.user_id) {
                whoEditsDeck.push(client.user_name.charAt(0));
            }
        });
        if (mainClient.deck_id == socket.deck_id && mainClient.user_id != 0) {
            mainClient.send(JSON.stringify({type: "usersEditing", content: whoEditsDeck}));
        }
    });
}
