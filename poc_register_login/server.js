const mysql = require("mysql");
const express = require("express");
const bcrypt = require("bcrypt");
const path = require("path");
const bodyParser = require("body-parser");

const port = process.env.PORT || 3000;

const app = express()
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

// Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.urlencoded());
// Parse JSON bodies (as sent by API clients)
app.use(express.json());

var db = mysql.createConnection({
    host: "",
    user: "",
    password: "",
    database: "",
    port: 3306
});

db.connect(function(err) {
    if (err) throw err;
    console.log("DB Connected!");
});



// Routes
app.get('', function(req, res) {
    res.render("index");
});

app.post('/login', function(req, res) {

    // Parse post body data
    const {email, password} = req.body;

    // Get Login Data from mysql db
    db.query("SELECT id, email, password FROM User WHERE email = '" + email + "'", function (err, rows) {

        if (rows.length == 0) {
            res.render("index");
        }
        else {
            // Compare encrypted password with plaintext password
            bcrypt.compare(req.body.password, rows[0].password).then(function(same, err) {

                // It is the same password
                if (same) {

                    // Show login success screen
                    res.render("success", {
                        username: email,
                        text1: "logged in",
                    });
                } else { // Password is not valid
                    console.log(err);
                    res.redirect("http://localhost:3000"); // Redirecting to homepage
                }

            });

        }
    });

});

app.post('/register', function(req, res) {

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
                    res.render("success", {
                        username: email,
                        text1: "registered",
                    });
                });
            });
        }
    });

});


/*
db.query('SELECT b.*, JSON_ARRAYAGG(a.keyword) as keywords FROM (SELECT a.setnr, b.keyword FROM Card a, CardKeyword b WHERE a.setnr = b.setnr) a, Card b WHERE a.setnr = b.setnr GROUP BY setnr LIMIT 3', function (err, result) {
    if (err) throw err;
    var json = JSON.stringify(result);
    console.log("Result: " + json);
});
*/

app.listen(port, () => console.log("Listening on port "+port+"..."));
