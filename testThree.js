// For conditions of distribution and use, see copyright notice in LICENSE
/* jslint browser: true, globalstrict: true, devel: true, debug: true */
/* global WebSocketClient, Scene, SyncManager, THREE, document, window, console, requestAnimationFrame, performance */
"use strict";

function WTModel() {
    this.client = new WebSocketClient();
    this.scene = new Scene();
    this.syncManager = new SyncManager(this.client, this.scene);
    this.loginData = {"name": "Test User"};
    this.client.connect("localhost", 2345, this.loginData);
}

function ThreeView() {
    var container = document.createElement( 'div' );
    document.body.appendChild(container);
    this.renderer = new THREE.WebGLRenderer();
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 1000 );
    this.camera.position.y = 150;
    this.camera.position.z = 500;

    this.scene = new THREE.Scene();
    this.scene.add(this.camera);

    
    this.scene.add(new THREE.AmbientLight(0x6b6b6b));
    
    var geometry = new THREE.CubeGeometry( 200, 200, 200 );

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

ThreeView.prototype.add = function(entity, placeable, mesh) {
    this.scene.add(this.cubeMesh);
    var cube = new THREE.Mesh(this.cubeGeometry, this.cubeMaterial);
    copyXyz(placeable.transform.pos, cube.position);
    copyXyz(placeable.transform.scale, cube.scale);
    cube.position.y = 150;
    this.scene.add(cube);
};

function TestApp(dataConnection, viewer) {
    this.viewer = new ThreeView();
    this.dataConnection = new WTModel(this);
}

TestApp.prototype.start = function() {
    this.frameUpdate();
};

TestApp.prototype.frameUpdate = function() {
    var thisIsThis = this;
    requestAnimationFrame(function() {
        thisIsThis.dataToViewerUpdate();
        thisIsThis.viewer.render();
        thisIsThis.frameUpdate();
    });
};

TestApp.prototype.dataToViewerUpdate = function() {
    console.log("in dataToViewer");
    var sceneData = this.dataConnection.scene;
    for (var i in Object.keys(sceneData.entities)) {
        var entity = sceneData.entities[i];
        if (entity === undefined || entity.checkedForViewer === true)
            continue;
        else
            entity.checkedForViewer = true;
        var placeable = null;
        var meshes = [];
        var j;
        console.log("checking entity", i);
        for (j in Object.keys(entity.components)) {
            var comp = entity.components[j];
            if (comp instanceof EC_Mesh)
                meshes.push(comp);
            else if (comp instanceof EC_Placeable)
                placeable = comp;
        }
        console.log("entity", entity, "placeable", placeable, "nmeshes", meshes.length);
        if (placeable !== null)
            for (j in Object.keys(meshes))
                this.viewer.add(entity, placeable, meshes[j]);
    }
};

var theApp = null;

function startApp() {
    theApp = new TestApp();
    theApp.start();
}

startApp();
