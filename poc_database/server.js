const mysql = require("mysql");

var db = mysql.createConnection({
    host: "",
    user: "",
    password: "",
    database: "",
    port: 3306
});

/*const db = mysql.createPool({
    connectionLimit : 1000,
    connectTimeout  : 60 * 60 * 1000,
    acquireTimeout  : 60 * 60 * 1000,
    timeout         : 6,
    host            : '',
    user            : '',
    password        : '',
    database        : '',
    port            : 3306
})*/


db.connect(function(err) {
    if (err) throw err;
    console.log("Connected!");
});

db.query('SELECT b.*, JSON_ARRAYAGG(a.keyword) as keywords FROM (SELECT a.setnr, b.keyword FROM Card a, CardKeyword b WHERE a.setnr = b.setnr) a, Card b WHERE a.setnr = b.setnr GROUP BY setnr LIMIT 3', function (err, result) {
    if (err) throw err;
    var json = JSON.stringify(result);
    console.log("Result: " + json);
});
