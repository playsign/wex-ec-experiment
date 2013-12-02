/* jshint browser:true, debug:true */
/* globals Peer, console */

"use strict";
var peerJsApiKey = "gnyz9wskc2chaor";

function randElt(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function humanFriendlyId() {
    var firstPartChoices = "John Gregory Benedict Clement Leo Boniface Urban Celestine Sixtus Anastasius Honorius Callixtus Adeodatus Agapetus Damasus Gelasius Marcellus Pelagius".split(" ");
    var secondPartChoices = "Apprehensive Skeptical Uptight Automatic Unmeditated Sudden Extemporaneous Involuntary Amnemonic Bemused Nirvanic Preoccupied Abstracted".split(" ");
    var ordinals = "I II III IV V VI VII VIII IX X XI XII XIII".split(" ");
    return randElt(firstPartChoices) + " " + randElt(ordinals) + " the " + randElt(secondPartChoices);
}

var myPeerId = "cargame:" + humanFriendlyId();
var thisPeer;
function netInit() {
    thisPeer = new Peer(myPeerId, {key: peerJsApiKey});
    thisPeer.on('connection', gotConnection);
    thisPeer.on('open', function(myNewId) {
        if (myNewId !== myPeerId) {
            myPeerId = myNewId;
        }
        console.log("my peer id:", myPeerId);
    });
}

function connectTo(peerid) {
    var conn = thisPeer.connect(peerid);
}
