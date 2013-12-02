// For conditions of distribution and use, see copyright notice in LICENSE

var scene = new Scene();
var ent = scene.createEntity(42);
var nc = ent.createComponent(45, cComponentTypeName);

function DomBindMo(attrName, comp, domNode) {
    function mutationCallback(mutationBatch) {
        console.log("hello from mutationCallback");
        mutationBatch.forEach(function(mutation) {
            if (mutation.type !== "attributes")
                throw "unexpected mutations happening";
            var newValue = mutation.target.getAttribute(mutation.attributeName);
            console.log("dom attribute", mutation.attributeName, "changed to",
                    newValue);
            if (mutation.attributeName == attrName) {
                // silent flag to suppress change signal
                comp[attrName].setValue(newValue, {silent: true});
            }
            console.log("corresponding ec change done");
        });
    }
    var config = { attributes: true };
    var mo = new MutationObserver(mutationCallback);
    mo.observe(domNode, config);
    console.log("mutation observer created & observing", domNode);
}

function ecBind(attrName, domNode, comp) {
    function changedCallback() {
        console.log("updating dom in response to ec change signal");
        if (false) {
            // use attribute assignment instead of SetAttribute to suppress
            // MutationObserver signal
            domNode[attrName] = comp[attrName].value;
        } else {
            domNode.setAttribute(attrName, comp[attrName].value);
        }
    }
    console.log("subscribing to changed signal");
    comp[attrName].changed.add(changedCallback);
}

function doTest() {
    console.log("testing dom -> ec sync:");
    document.getElementById("testkek").setAttribute("name", "frank");
    DomBindMo("name", nc, document.getElementById("testkek"));
    
    console.log("making a dom change from js");
    document.getElementById("testkek").setAttribute("name", "seppo"); //["name"] = "seppo";
    var count=0;
    function laterTest() {
        console.log("testing ec -> dom sync:");
        console.log("making an ec change from js");
        ecBind("name", document.getElementById("testkek"), nc);
        nc.name.setValue("histamiini" + count++);
        window.setTimeout(laterTest, 500);
    }
    window.setTimeout(laterTest, 10);
}

window.onload = doTest;
