// Functions


// Websocket
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


// Other
function getCookie(cname) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for(let i = 0; i <ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) == ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
      }
    }
    return "";
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


// Variables
var cards = [];
var deckListCards = [];
const colors = ["#2D3047", "#419D78", "#E0A458", "#FFDBB5", "#C04ABC", "#929982", "#B7245C", "#7C3238", "#A9FDAC", "#6C464E", "#32A287"]


// Get Cards
console.log("Getting data...");
/*$.get("http://localhost:3000/allcards/27", function(data) {
    //console.log(data);
    cards = JSON.parse(data);

    for (var i = 0; i < cards.length; i++) {
        $("#cards").append("<button class='card-item' onclick='addCard(\""+cards[i].setnr+"\")'>"+cards[i].name+"</button>");
    }
});*/

// Connect to WS Server

const serverAddress = "ws://localhost:5000?session_id="+getCookie("session_id")+"&deck="+location.pathname.split("/").pop();
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
            var c = Object.assign({}, cards[i]);
            var sideboardid = 0;
            if (msg.type == "addCardSideboard") {sideboardid = 1;}
            c.sideboardid = sideboardid;

            deckListCards.push(Object.assign({},c));

           

            //$(getContainer(sideboardid, cards[i].keywords)).append("<button class='card-item' id='"+cards[i].setnr+"' onclick='"+getRemoveCardFunction(sideboardid)+"(\""+cards[i].setnr+"\")'  style='background-image: url(\""+cards[i].image+"\")'></button>");
            /*var pitch = "";
            var cost = "";
            var attack = "";
            var defense = "";

            if (cards[i].resource > 0) {
                pitch = "<div class='card-att-banner card-pitch pitch-"+cards[i].resource+"'></div>";
            }
            if (cards[i].cost > -1) {
                cost = "<div class='card-att-banner card-cost'>"+cards[i].cost+"</div>"
            }
            if (cards[i].attack > -1) {
                attack = "<div class='card-att-banner card-attack'>"+cards[i].attack+"</div>"
            }
            if (cards[i].defense > -1) {
                defense = "<div class='card-att-banner card-defense'>"+cards[i].defense+"</div>"
            }

            var container = cards[i].setnr+"-container-"+cards[i].sideboardid+"-sideboardid";
            var wrapper = "";
            var wrapperEnd = "";
            var offset = "0px";
            var appendIn = getContainer(sideboardid, cards[i].keywords);
            // Check if Card is already in the list
            if ($("#"+container).length > 0) {
                appendIn = "#"+container;
                offset = "-65px";
            }
            else {
                wrapper = "<div class='card-wrapper' id='"+container+"'>";
                wrapperEnd = "</div>";
            }

            $(appendIn).append(wrapper+"<div class='card' id='"+cards[i].setnr+"' onclick='"+getRemoveCardFunction(sideboardid)+"(\""+cards[i].setnr+"\")' style='background-image: url(\""+cards[i].image+"\"); margin-left: "+offset+"'>"
            +"<div class='card-section'>"
            +pitch
            +cost
            +"</div>"
            +"<div class='card-section'>"
            +attack
            +defense
            +"</div>"
            +"</div>"
            +wrapperEnd);*/
            // Delete HTML Objects
            $("#sideboard").empty();
            $("#equipment").empty();
            $("#attack-action").empty();
            $("#instant").empty();
            $("#non-attack-action").empty();

            // Insert Decklist again
            for (var i = 0; i < deckListCards.length; i++) {
                //$(getContainer(deckListCards[i].sideboardid, deckListCards[i].keywords)).append("<button class='card-item' id='"+deckListCards[i].setnr+"' onclick='"+getRemoveCardFunction(deckListCards[i].sideboardid)+"(\""+deckListCards[i].setnr+"\")' style='background-image: url("+deckListCards[i].image+")'></button>");
                var pitch = "";
                var cost = "";
                var attack = "";
                var defense = "";

                if (deckListCards[i].resource > 0) {
                    pitch = "<div class='card-att-banner card-pitch pitch-"+deckListCards[i].resource+"'></div>";
                }
                if (deckListCards[i].cost > -1) {
                    cost = "<div class='card-att-banner card-cost'>"+deckListCards[i].cost+"</div>"
                }
                if (deckListCards[i].attack > -1) {
                    attack = "<div class='card-att-banner card-attack'>"+deckListCards[i].attack+"</div>"
                }
                if (deckListCards[i].defense > -1) {
                    defense = "<div class='card-att-banner card-defense'>"+deckListCards[i].defense+"</div>"
                }

                var container = deckListCards[i].setnr+"-container-"+deckListCards[i].sideboardid+"-sideboardid";
                var wrapper = "";
                var wrapperEnd = "";
                var offset = "0px";
                var appendIn = getContainer(deckListCards[i].sideboardid, deckListCards[i].keywords);
                // Check if Card is already in the list
                if ($("#"+container).length > 0) {
                    appendIn = "#"+container;
                    offset = "-65px";
                }
                else {
                    wrapper = "<div class='card-wrapper' id='"+container+"'>";
                    wrapperEnd = "</div>";
                }

                $(appendIn).append(wrapper+"<div class='card' id='"+deckListCards[i].setnr+"' onclick='"+getRemoveCardFunction(deckListCards[i].sideboardid)+"(\""+deckListCards[i].setnr+"\")' style='background-image: url(\""+deckListCards[i].image+"\"); margin-left: "+offset+"'>"
                +"<div class='card-section'>"
                +pitch
                +cost
                +"</div>"
                +"<div class='card-section'>"
                +attack
                +defense
                +"</div>"
                +"</div>"
                +wrapperEnd);
            }

            countCards()
            
            break;

        case "removeCard":
            // Remove
            //$("#"+msg.content).remove();

            // Delete entry from array
            for (var i = 0; i < deckListCards.length; i++) {
                if (deckListCards[i].setnr == msg.content && deckListCards[i].sideboardid == 0) {
                    deckListCards.splice(i, 1);
                    break;
                }
            }

            // Delete HTML Objects
            $("#sideboard").empty();
            $("#equipment").empty();
            $("#attack-action").empty();
            $("#instant").empty();
            $("#non-attack-action").empty();

            // Insert Decklist again
            for (var i = 0; i < deckListCards.length; i++) {
                //$(getContainer(deckListCards[i].sideboardid, deckListCards[i].keywords)).append("<button class='card-item' id='"+deckListCards[i].setnr+"' onclick='"+getRemoveCardFunction(deckListCards[i].sideboardid)+"(\""+deckListCards[i].setnr+"\")' style='background-image: url("+deckListCards[i].image+")'></button>");
                var pitch = "";
                var cost = "";
                var attack = "";
                var defense = "";

                if (deckListCards[i].resource > 0) {
                    pitch = "<div class='card-att-banner card-pitch pitch-"+deckListCards[i].resource+"'></div>";
                }
                if (deckListCards[i].cost > -1) {
                    cost = "<div class='card-att-banner card-cost'>"+deckListCards[i].cost+"</div>"
                }
                if (deckListCards[i].attack > -1) {
                    attack = "<div class='card-att-banner card-attack'>"+deckListCards[i].attack+"</div>"
                }
                if (deckListCards[i].defense > -1) {
                    defense = "<div class='card-att-banner card-defense'>"+deckListCards[i].defense+"</div>"
                }

                var container = deckListCards[i].setnr+"-container-"+deckListCards[i].sideboardid+"-sideboardid";
                var wrapper = "";
                var wrapperEnd = "";
                var offset = "0px";
                var appendIn = getContainer(deckListCards[i].sideboardid, deckListCards[i].keywords);
                // Check if Card is already in the list
                if ($("#"+container).length > 0) {
                    appendIn = "#"+container;
                    offset = "-65px";
                }
                else {
                    wrapper = "<div class='card-wrapper' id='"+container+"'>";
                    wrapperEnd = "</div>";
                }

                $(appendIn).append(wrapper+"<div class='card' id='"+deckListCards[i].setnr+"' onclick='"+getRemoveCardFunction(deckListCards[i].sideboardid)+"(\""+deckListCards[i].setnr+"\")' style='background-image: url(\""+deckListCards[i].image+"\"); margin-left: "+offset+"'>"
                +"<div class='card-section'>"
                +pitch
                +cost
                +"</div>"
                +"<div class='card-section'>"
                +attack
                +defense
                +"</div>"
                +"</div>"
                +wrapperEnd);
            }

            countCards()

            break;

        case "removeCardSideboard":
            // Remove
            //$("#sideboard").find("#"+msg.content)[0].remove();
            // Delete entry from array
            for (var i = 0; i < deckListCards.length; i++) {
                if (deckListCards[i].setnr == msg.content && deckListCards[i].sideboardid == 1) {
                    deckListCards.splice(i, 1);
                    break;
                }
            }

            // Delete HTML Objects
            $("#sideboard").empty();
            $("#equipment").empty();
            $("#attack-action").empty();
            $("#instant").empty();
            $("#non-attack-action").empty();

            // Insert Decklist again
            for (var i = 0; i < deckListCards.length; i++) {
                //$(getContainer(deckListCards[i].sideboardid, deckListCards[i].keywords)).append("<button class='card-item' id='"+deckListCards[i].setnr+"' onclick='"+getRemoveCardFunction(deckListCards[i].sideboardid)+"(\""+deckListCards[i].setnr+"\")' style='background-image: url("+deckListCards[i].image+")'></button>");
                var pitch = "";
                var cost = "";
                var attack = "";
                var defense = "";

                if (deckListCards[i].resource > 0) {
                    pitch = "<div class='card-att-banner card-pitch pitch-"+deckListCards[i].resource+"'></div>";
                }
                if (deckListCards[i].cost > -1) {
                    cost = "<div class='card-att-banner card-cost'>"+deckListCards[i].cost+"</div>"
                }
                if (deckListCards[i].attack > -1) {
                    attack = "<div class='card-att-banner card-attack'>"+deckListCards[i].attack+"</div>"
                }
                if (deckListCards[i].defense > -1) {
                    defense = "<div class='card-att-banner card-defense'>"+deckListCards[i].defense+"</div>"
                }

                var container = deckListCards[i].setnr+"-container-"+deckListCards[i].sideboardid+"-sideboardid";
                var wrapper = "";
                var wrapperEnd = "";
                var offset = "0px";
                var appendIn = getContainer(deckListCards[i].sideboardid, deckListCards[i].keywords);
                // Check if Card is already in the list
                if ($("#"+container).length > 0) {
                    appendIn = "#"+container;
                    offset = "-65px";
                }
                else {
                    wrapper = "<div class='card-wrapper' id='"+container+"'>";
                    wrapperEnd = "</div>";
                }

                $(appendIn).append(wrapper+"<div class='card' id='"+deckListCards[i].setnr+"' onclick='"+getRemoveCardFunction(deckListCards[i].sideboardid)+"(\""+deckListCards[i].setnr+"\")' style='background-image: url(\""+deckListCards[i].image+"\"); margin-left: "+offset+"'>"
                +"<div class='card-section'>"
                +pitch
                +cost
                +"</div>"
                +"<div class='card-section'>"
                +attack
                +defense
                +"</div>"
                +"</div>"
                +wrapperEnd);
            }

            countCards()

            break;

        case "deckList":
        
            deckListCards = JSON.parse(msg.content);
            for (var i = 0; i < deckListCards.length; i++) {
                //$(getContainer(deckListCards[i].sideboardid, deckListCards[i].keywords)).append("<button class='card-item' id='"+deckListCards[i].setnr+"' onclick='"+getRemoveCardFunction(deckListCards[i].sideboardid)+"(\""+deckListCards[i].setnr+"\")' style='background-image: url("+deckListCards[i].image+")'></button>");
                var pitch = "";
                var cost = "";
                var attack = "";
                var defense = "";

                if (deckListCards[i].resource > 0) {
                    pitch = "<div class='card-att-banner card-pitch pitch-"+deckListCards[i].resource+"'></div>";
                }
                if (deckListCards[i].cost > -1) {
                    cost = "<div class='card-att-banner card-cost'>"+deckListCards[i].cost+"</div>"
                }
                if (deckListCards[i].attack > -1) {
                    attack = "<div class='card-att-banner card-attack'>"+deckListCards[i].attack+"</div>"
                }
                if (deckListCards[i].defense > -1) {
                    defense = "<div class='card-att-banner card-defense'>"+deckListCards[i].defense+"</div>"
                }

                var container = deckListCards[i].setnr+"-container-"+deckListCards[i].sideboardid+"-sideboardid";
                var wrapper = "";
                var wrapperEnd = "";
                var offset = "0px";
                var appendIn = getContainer(deckListCards[i].sideboardid, deckListCards[i].keywords);
                // Check if Card is already in the list
                if ($("#"+container).length > 0) {
                    appendIn = "#"+container;
                    offset = "-65px";
                }
                else {
                    wrapper = "<div class='card-wrapper' id='"+container+"'>";
                    wrapperEnd = "</div>";
                }

                $(appendIn).append(wrapper+"<div class='card' id='"+deckListCards[i].setnr+"' onclick='"+getRemoveCardFunction(deckListCards[i].sideboardid)+"(\""+deckListCards[i].setnr+"\")' style='background-image: url(\""+deckListCards[i].image+"\"); margin-left: "+offset+"'>"
                +"<div class='card-section'>"
                +pitch
                +cost
                +"</div>"
                +"<div class='card-section'>"
                +attack
                +defense
                +"</div>"
                +"</div>"
                +wrapperEnd);
            }

            countCards()

            break;

        case "deckVersion":
            $("#version").html(msg.content);
            break;

        case "refresh":
            document.location.reload(true);
            break;

        case "getCards":
            cards = JSON.parse(msg.content);

            for (var i = 0; i < cards.length; i++) {
                var pitch = "";
                var cost = "";
                var attack = "";
                var defense = "";

                if (cards[i].resource > 0) {
                    pitch = "<div class='card-att-banner card-pitch pitch-"+cards[i].resource+"'></div>";
                }
                if (cards[i].cost > -1) {
                    cost = "<div class='card-att-banner card-cost'>"+cards[i].cost+"</div>"
                }
                if (cards[i].attack > -1) {
                    attack = "<div class='card-att-banner card-attack'>"+cards[i].attack+"</div>"
                }
                if (cards[i].defense > -1) {
                    defense = "<div class='card-att-banner card-defense'>"+cards[i].defense+"</div>"
                }

                //$("#cards").append("<button class='card-item "+cards[i].setnr+"' id='"+cards[i].setnr+"' onclick='addCard(\""+cards[i].setnr+"\")' style='background-image: url(\""+cards[i].image+"\")'></button>");
                $("#cards").append("<div class='card "+cards[i].setnr+"' id='"+cards[i].setnr+"' onclick='addCard(\""+cards[i].setnr+"\")' style='background-image: url(\""+cards[i].image+"\")'>"
                +"<div class='card-section'>"
                +pitch
                +cost
                +"</div>"
                +"<div class='card-section'>"
                +attack
                +defense
                +"</div>"
                +"</div>");
            }
            break;

        case "usersEditing":
            //$("#me").html(msg.content[0]);
            $('.other').each(function() {
                $(this).remove();
            });
            for (var i = 0; i < msg.content.length; i++) {
                $("#usersEditing").append('<div class="user other" style="position: relative; z-index: '+(100-i)+'; background-color: '+colors[i]+';">'+msg.content[i]+'</div>');
            }
            break;
    }
});

// Search box
function searchCards() {
    // Do whatever you need to do on actual change of the value of the input field
    console.log($("#searchCards").val());
    var input = $("#searchCards").val();

    for (var i = 0; i < cards.length; i++) {
        c = cards[i].name.toLowerCase();
        if (c.includes(input.toLowerCase())) {
            //$("#cards").find("#"+cards[i].setnr).show();
            $("."+cards[i].setnr).show();
            console.log(cards[i].setnr);
        }
        else {
            //$("#cards").find("#"+cards[i].setnr).hide();
            $("."+cards[i].setnr).hide();
        }
    }
}

function share() {
    $("#share").show();
}

function commit() {
    $("#commit").show();
}

function closeDialog() {
    $("#share").hide();
    $("#commit").hide();
}

function countCards() {
    $("#amount").html(deckListCards.length);

    var equipmentNr = 0;
    var aaNr = 0;
    var naaNr = 0;
    var instantNr = 0;
    var sideboardNr = 0;

    var pitch1 = 0;
    var pitch2 = 0;
    var pitch3 = 0;

    var cost0 = 0;
    var cost1 = 0;
    var cost2 = 0;
    var cost3 = 0;
    var cost4 = 0;
    var costAll = 0;

    for (var i = 0; i < deckListCards.length; i++) {
        if (deckListCards[i].sideboardid > 0) {
            sideboardNr++;
        }
        else if (deckListCards[i].keywords.includes("equipment") || deckListCards[i].keywords.includes("weapon")) {
            equipmentNr++;
        }
        else if (deckListCards[i].keywords.includes("attack")) {
            aaNr++;
        }
        else if (deckListCards[i].keywords.includes("instant")) {
            instantNr++;
        }
        else {
            naaNr++;
        }
    }

    for (var i = 0; i < deckListCards.length; i++) {
        if (deckListCards[i].resource == 1) {
            pitch1++;
        }
        else if (deckListCards[i].resource == 2) {
            pitch2++;
        }
        else if (deckListCards[i].resource == 3) {
            pitch3++;
        }
    }

    for (var i = 0; i < deckListCards.length; i++) {
        if (deckListCards[i].cost == 0) {
            cost0++;
        }
        else if (deckListCards[i].cost == 1) {
            cost1++;
        }
        else if (deckListCards[i].cost == 2) {
            cost2++;
        }
        else if (deckListCards[i].cost == 3) {
            cost3++;
        }
        else if (deckListCards[i].cost > 3) {
            cost4++;
        }
    }

    pitchAll = pitch1+pitch2+pitch3;
    costAll = cost0+cost1+cost2+cost3+cost4;

    $("#sideboardNr").html(sideboardNr);
    $("#equipmentNr").html(equipmentNr);
    $("#aaNr").html(aaNr);
    $("#instantNr").html(instantNr);
    $("#naaNr").html(naaNr);

    $("#resource-1").html(pitch1);
    $("#resource-2").html(pitch2);
    $("#resource-3").html(pitch3);

    $("#resource-1").width((pitch1/pitchAll*100).toString()+"%");
    $("#resource-2").width((pitch2/pitchAll*100).toString()+"%");
    $("#resource-3").width((pitch3/pitchAll*100).toString()+"%");

    $("#cost-0").html(cost0);
    $("#cost-1").html(cost1);
    $("#cost-2").html(cost2);
    $("#cost-3").html(cost3);
    $("#cost-4").html(cost4);

    $("#cost-0").width((cost0/costAll*100).toString()+"%");
    $("#cost-1").width((cost1/costAll*100).toString()+"%");
    $("#cost-2").width((cost2/costAll*100).toString()+"%");
    $("#cost-3").width((cost3/costAll*100).toString()+"%");
    $("#cost-4").width((cost4/costAll*100).toString()+"%");
    
}

setInterval( function() {
    if ($("#share").is(":hidden") && $("#commit").is(":hidden")) {
        var focusbox = document.getElementById("searchCards");
        focusbox.focus();
    }
});