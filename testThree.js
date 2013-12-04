// For conditions of distribution and use, see copyright notice in LICENSE
/* jslint browser: true, globalstrict: true, devel: true, debug: true */
/* global WebSocketClient, Scene, SyncManager, THREE, document, window, console, requestAnimationFrame, performance */
"use strict";

var useCubes = true;

function WTModel() {
    this.client = new WebSocketClient();
    this.scene = new Scene();
    this.syncManager = new SyncManager(this.client, this.scene);
    this.syncManager.logDebug = false;
    this.loginData = {"name": "Test User"};
    this.client.connect("localhost", 2345, this.loginData);
}

function setXyz(thing, x, y, z) {
    thing.x = x; thing.y = y; thing.z = z;
}

function ThreeView() {
    var container = document.createElement('div');
    THREEx.FullScreen.bindKey({
	charCode: 'm'.charCodeAt(0)
    });
    this.objectsByEntityId = {};
    this.meshCache = {};
    document.body.appendChild(container);
    this.renderer = new THREE.WebGLRenderer();
    container.appendChild(this.renderer.domElement);
    this.camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 1000 );
    this.camera.position.y = 10;
    this.camera.position.z = 24;

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    THREEx.WindowResize(this.renderer, this.camera);

    this.scene = new THREE.Scene();
    this.scene.add(this.camera);

    this.scene.add(new THREE.AmbientLight(0x6b6b6b));
    
    var geometry = new THREE.CubeGeometry( 2, 2, 2 );

    for ( var i = 0; i < geometry.faces.length; i += 2 ) {
        var hex = Math.random() * 0xffffff;
        geometry.faces[ i ].color.setHex( hex );
        geometry.faces[ i + 1 ].color.setHex( hex );
    }
    var material = new THREE.MeshBasicMaterial( { vertexColors: THREE.FaceColors, overdraw: 0.5 } );
    this.cubeGeometry = geometry;
    this.cubeMaterial = material;

    // var jsonLoader = new THREE.JSONLoader();
    // var thisIsThis = this;
    // var loadStart = performance.now();
    // jsonLoader.load("cube.json", function(geometry, loadedMaterial) {
    //     console.log("loaded from json:", geometry, loadedMaterial);
    //     // for ( var i = 0; i < geometry.faces.length; i += 2 ) {
    //     //     var hex = Math.random() * 0xffffff;
    //     //     geometry.faces[ i ].color.setHex( hex );
    //     //     geometry.faces[ i + 1 ].color.setHex( hex );
            
    //     // }

    //     // var faceColorsMaterial = new THREE.MeshBasicMaterial( { vertexColors: THREE.FaceColors, overdraw: 0.5 } );
       
    //     // thisIsThis.cubemesh = new THREE.Mesh(geometry, faceColorsMaterial);
    //     thisIsThis.cubemesh = new THREE.Mesh(geometry, new THREE.MeshFaceMaterial(loadedMaterial));
    //     thisIsThis.cubemesh.position.y = 150;
    //     thisIsThis.scene.add(thisIsThis.cubemesh);
    //     console.log("added", performance.now() - loadStart);
    // });

}

function jsonLoad(url, addCallback) {
    var loader = new THREE.JSONLoader();
    loader.load(url, function(geometry, material) {
        addCallback(geometry, material);
    });

}

function checkDefined() {
    for (var i = 0; i < arguments.length; i++)
        if (arguments[i] === undefined)
            debugger; // throw("undefined value, arg #" + i);
}

ThreeView.prototype.render = function() {
    checkDefined(this.scene, this.camera);
    this.renderer.render(this.scene, this.camera);
    
};

function copyXyz(src, dst) {
    dst.x = src.x; dst.y = src.y; dst.z = src.z;
}

function updateFromTransform(threeMesh, placeable) {
    copyXyz(placeable.transform.value.pos, threeMesh.position);
    copyXyz(placeable.transform.value.scale, threeMesh.scale);
    copyXyz(placeable.transform.value.rot, threeMesh.rotation);
    threeMesh.needsUpdate = true;
}

ThreeView.prototype.addOrUpdate = function(entity, placeable, meshComp) {
    checkDefined(entity, placeable, meshComp);
    checkDefined(entity.id);
    var cube = this.objectsByEntityId[entity.id];
    if (cube === undefined) {
        if (useCubes) {
            cube = new THREE.Mesh(this.cubeGeometry, this.cubeMaterial);
            this.objectsByEntityId[entity.id] = cube;
            this.scene.add(cube);
        } else {
            var url = meshComp.meshRef.value.ref;
            var placeablesForUrl = this.meshCache[url];
            var firstRef = false;
            if (placeablesForUrl === undefined) {
                this.meshCache[url] = placeablesForUrl = [];
                firstRef = true;
            }
            placeablesForUrl.push(placeable);
            if (!firstRef)
                return;
            console.log("new mesh ref:", url);          
            var thisIsThis = this;
            jsonLoad(url.replace(/\.mesh$/i, ".json"),
                     function (geometry, material) {                        
                         thisIsThis.addMeshToPlaceables(geometry, material, url);
                         //updateFromTransform(threeMesh, placeable);
                         console.log("loaded & updated to scene:", url);
                     });
        }
    } else {
        updateFromTransform(cube, placeable);
    }
};

ThreeView.prototype.addMeshToPlaceables = function(geometry, material, url) {
    var placeables = this.meshCache[url];
    material = new THREE.MeshBasicMaterial( { vertexColors: THREE.FaceColors, overdraw: 0.5 } );
    for (var i = 0; i < placeables.length; i++) {
        var pl = placeables[i];
        var mesh = new THREE.Mesh(geometry, material);
        updateFromTransform(mesh, pl);
        this.scene.add(mesh);
    }
    placeables.length = 0;
};

function TestApp(dataConnection, viewer) {
    this.viewer = new ThreeView();
    this.dataConnection = new WTModel(this);
    this.logicInit();
}

TestApp.prototype.start = function() {
    this.frameCount = 0;
    this.frameUpdate();
};

TestApp.prototype.frameUpdate = function() {
    var thisIsThis = this;
    requestAnimationFrame(function() {
        thisIsThis.logicUpdate();
        thisIsThis.dataToViewerUpdate();
        thisIsThis.viewer.render();
        thisIsThis.frameUpdate();
        thisIsThis.frameCount++;
    });
};

TestApp.prototype.dataToViewerUpdate = function() {
    var sceneData = this.dataConnection.scene;
    for (var i in sceneData.entities) {
        if (!sceneData.entities.hasOwnProperty(i))
            continue;
        var entity = sceneData.entities[i];
        checkDefined(entity);
        // if (entity.registeredWithViewer === true)
        //     continue;
        // else
        //     entity.registeredWithViewer = true;
        var placeable = null;
        var meshes = [];
        var j;
        for (j in entity.components) {
            if (!entity.components.hasOwnProperty(j))
                continue;
            var comp = entity.components[j];
            checkDefined(comp);
            if (comp instanceof EC_Mesh)
                meshes.push(comp);
            else if (comp instanceof EC_Placeable)
                placeable = comp;
        }
        if (placeable !== null)
            for (j in Object.keys(meshes))
                this.viewer.addOrUpdate(entity, placeable, meshes[j]);
    }
};

TestApp.prototype.logicInit = function() {
    this.cubeCount = 0;
    var scene = this.dataConnection.scene;
    this.testEntities = [];
    console.log("in makeEntities");
    for (var i = 0; i < this.cubeCount; i++) {
        var ent = scene.createEntity(i+1000);
        this.testEntities.push(ent);
        var placeable = ent.createComponent("placeable", "Placeable", "");
        var mesh = ent.createComponent("mesh", "Mesh", "placeable");
        placeable.transform.value.pos.x = i*150;
        placeable.transform.value.pos.y = 150;
        
        setXyz(placeable.transform.value.scale, 1, 1, 1);
        mesh.meshRef.ref = "http://kek";
    }
};

TestApp.prototype.logicUpdate = function() {
    var posIncrement;
    checkDefined(this.frameCount);
    if (this.frameCount % 100 === 0) {
        posIncrement = 50;
    } else {
        posIncrement = -0.5;
    }
    for (var i = 0; i < this.testEntities.length; i++) {
        var ent = this.testEntities[i];
        checkDefined(ent);
        ent.components.placeable.transform.value.pos.y += posIncrement;
        ent.components.placeable.transform.value.rot.y += 0.01;
    }
};

var theApp = null;

function startApp() {
    theApp = new TestApp();
    theApp.start();
}

startApp();

/* repl utilities */

function dPos(entityId) {
    return theApp.dataConnection.scene.entities[entityId].components.placeable.transform.value.pos;
}
