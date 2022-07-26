// Classes

/*class Card {
    constructor(name, resource, cost, attack, defense, image, text, rarity, life, intellect, keywords) {
        this.name = name;
        this.resource = resource;
        this.cost = cost;
        this.attack = attack;
        this.defense = defense;
        this.image = image;
        this.text = text;
        this.rarity = rarity;
        this.life = life;
        this.intellect = intellect;
        this.keywords = keywords;
    }
};*/

// Functions

function addCard(setnr) {
    if ($('#sideboard-check').is(':checked')) {
        ws.send(JSON.stringify({type: "addCardSideboard", content: setnr}));
    }
    else {
        ws.send(JSON.stringify({type: "addCard", content: setnr}));
    }
}

function removeCard(setnr) {
    ws.send(JSON.stringify({type: "removeCard", content: setnr}));
}

function removeCardSideboard(setnr) {
    ws.send(JSON.stringify({type: "removeCardSideboard", content: setnr}));
}

function gotoVersion(versionnr) {
    ws.send(JSON.stringify({type: "gotoDeckVersion", content: versionnr}));
}


function getContainer(sideboard, array) {
    if (sideboard > 0) {
        return "#sideboard"
    }
    else if (array.includes("equipment") || array.includes("weapon")) {
        return "#equipment"
    }
    else if (array.includes("attack")) {
        return "#attack-action"
    }
    else if (array.includes("instant")) {
        return "#instant"
    }
    else {
        return "#non-attack-action"
    }
}

function getRemoveCardFunction(sideboard) {
    if (sideboard == 0) {
        return "removeCard";
    }
    
    return "removeCardSideboard";
}

function commitDeck() {
    ws.send(JSON.stringify({type: "commitDeck", content: $("#commitMessage").val()}));
}

var cards = [];


// Get Cards
console.log("Getting data...");
$.get("http://localhost:3000/allcards", function(data) {
    //console.log(data);
    cards = JSON.parse(data);

    for (var i = 0; i < cards.length; i++) {
        $("#cards").append("<button class='card-item' onclick='addCard(\""+cards[i].setnr+"\")'>"+cards[i].name+"</button>");
    }
});

// Connect to WS Server
const serverAddress = "ws://localhost:5000";

const ws = new WebSocket(serverAddress);

ws.addEventListener("open", () => {
    console.log("We are connected.");
});

ws.addEventListener("message", function (msg) {
    console.log("Received message from Server: " + msg.data);
    msg = JSON.parse(msg.data);

    switch(msg.type) {
        case "addCardSideboard":
        case "addCard":
            // Find Card in Cardpool
            var i = 0;
            for (i = 0; i < cards.length; i++) {
                if (cards[i].setnr == msg.content) {
                    console.log(cards[i].name);
                    break;
                }
            }
            // Add found card from Cardpool
            var sideboardid = 0;
            if (msg.type == "addCardSideboard") {sideboardid = 1;}
            $(getContainer(sideboardid, cards[i].keywords)).append("<button class='card-item' id='"+cards[i].setnr+"' onclick='"+getRemoveCardFunction(sideboardid)+"(\""+cards[i].setnr+"\")'>"+cards[i].name+"</button>");
            break;

        case "removeCard":
            // Remove
            $("#"+msg.content).remove();
            break;

        case "removeCardSideboard":
            // Remove
            $("#sideboard").find("#"+msg.content)[0].remove();
            break;

        case "deckList":
        
            deckListCards = JSON.parse(msg.content);
            for (var i = 0; i < deckListCards.length; i++) {
                $(getContainer(deckListCards[i].sideboardid, deckListCards[i].keywords)).append("<button class='card-item' id='"+deckListCards[i].setnr+"' onclick='"+getRemoveCardFunction(deckListCards[i].sideboardid)+"(\""+deckListCards[i].setnr+"\")'>"+deckListCards[i].name+"</button>");
            }

            break;

        case "deckVersion":
            $("#version").html(msg.content);
            break;

        case "refresh":
            document.location.reload(true);
            break;
    }
});