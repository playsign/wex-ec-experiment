// For conditions of distribution and use, see copyright notice in LICENSE
/* jslint browser: true, globalstrict: true, devel: true, debug: true */
/* global THREE, THREEx, signals */
/* global WebSocketClient, Scene, SyncManager, EC_Mesh, EC_Placeable */
/* global cComponentTypePlaceable, cComponentTypeMesh, componentTypeIds */
"use strict";

var useCubes = false; // instead of json models loaded from from ec_mesh url
var useSignals = true; // instead of signals

function WTModel() {
    this.client = new WebSocketClient();
    this.scene = new Scene();
    this.syncManager = new SyncManager(this.client, this.scene);
    this.syncManager.logDebug = false;
    this.loginData = {"name": "Test User"};
    this.client.connect("localhost", 2345, this.loginData);

    this.meshComponentReady = new signals.Signal();
    // if (useSignals)
    //     this.scene.componentAdded.add(this.onComponentAdded.bind(this));

    // if (useSignals) {
    //     this.meshListner = new ListenerWithPrecondition(
    //         this.scene.componentAdded,
    //         this.placeableSeenCheck,
    //         this.scene.componentAdded,
    //         this.meshComponentReady.dispatch.bind(this.meshComponentReady));
    // }

    if (useSignals) {
        this.scene.entityCreated.add(this.onEntityCreated.bind(this));
        this.scene.attributeChanged.add(this.onAttributeChanged.bind(this));
    }
}

WTModel.prototype.onEntityCreated = function(newEntity, changeType) {
    var havePlaceable = new signals.Signal();
    var haveGoodMeshAssetRef = new signals.Signal();
    var meshGood = new signals.CompoundSignal(haveGoodMeshAssetRef, havePlaceable);
    var thisIsThis = this;
    meshGood.add(function(meshInfo, placeableInfo) {
        thisIsThis.meshComponentReady.dispatch(placeableInfo[0], placeableInfo[1],
                                               meshInfo[0]);
    });  
    signalWhenComponentTypePresent(newEntity, cComponentTypePlaceable, havePlaceable);
                                          
    var meshRefOk = function(assetref) {
        return assetref.value.ref !== "";
    };
    signalWhenAttributePreconditionOk(newEntity, cComponentTypeMesh, "meshRef",
                                      meshRefOk, haveGoodMeshAssetRef);
};

WTModel.prototype.onAttributeChanged = function(component, attribute, changeType) {
};

// WTModel.prototype.placeableSeenCheck = function(entity, component, changeType) {
//     return (component instanceof EC_Placeable);
// };

function signalWhenPlaceablePresent(entity, mySignal) {
    var currentPlaceable = entity.componentByType(cComponentTypePlaceable);
    if (currentPlaceable !== null) {
        mySignal.dispatch(entity, currentPlaceable);
        return;
    }
    var listenForPlaceable = function(entity, newComponent) {
        if (newComponent instanceof EC_Placeable) {
            mySignal.dispatch(entity, newComponent);
            entity.componentAdded.remove(listenForPlaceable);
        }
    };
    entity.componentAdded.add(listenForPlaceable);
}

function signalWhenAttributePreconditionOk(entity, componentTypeId, targetAttributeId, condFunc, mySignal) {
    var onGotComponent = function(entity, component) {
        if (entity.id == 55)
            console.log("55 precond 2");

        var currentAttribute = component.attributeById(targetAttributeId);
        if (currentAttribute !== null) {
            var statusNow = condFunc(currentAttribute);
            if (statusNow) {
                mySignal.dispatch(component, currentAttribute);
                return;
            }
        }
        var onAttributeChanged = function(changedAttribute, changeType) {
            if (entity.id == 55)
                console.log("55 precond 3.1", changedAttribute);
            if (targetAttributeId !== changedAttribute.id)
                return;
            var status = condFunc(changedAttribute);
            if (!status)
                return;
            mySignal.dispatch(changedAttribute.owner, changedAttribute);
            component.attributeChanged.remove(onAttributeChanged);
        };
        
        component.attributeChanged.add(onAttributeChanged);

        var onAttributeAdded = function(changedComponent, changedAttribute, changeType) {
            if (entity.id == 55)
                console.log("55 precond 3.2");
            console.log("attributeAdded");
            if (targetAttributeId !== changedAttribute.id)
                return;
            var status = condFunc(changedAttribute);
            if (!status)
                return;
            mySignal.dispatch(changedComponent, changedAttribute);
            component.attributeAdded.remove(onAttributeAdded);
        };
        
        component.attributeAdded.add(onAttributeAdded);
    };
    if (entity.id == 55)
        console.log("55 precond 1", entity.componentByType(componentTypeId));
    var gotComponentSig = new signals.Signal();
    gotComponentSig.add(onGotComponent);
    signalWhenComponentTypePresent(entity, componentTypeId, gotComponentSig);
}

function signalWhenComponentTypePresent(entity, typeId, mySignal) {
    if (typeof typeId == 'string' || typeId instanceof String)
        typeId = componentTypeIds[typeId];

    var currentComponent = entity.componentByType(typeId);
    if (currentComponent !== null) {
        mySignal.dispatch(entity, currentComponent);
        return;
    }
    var onComponentAdded = function(newComponent, changeType) {
        if (newComponent === null) {
            // can happen with unknown component type from server
            return;
        }
        if (entity.id == 55)
            console.log("55 present 2");
        if (newComponent.typeId === typeId) {
            mySignal.dispatch(entity, newComponent);
            entity.componentAdded.remove(onComponentAdded);
        }
    };
    if (entity.id == 55)
        console.log("55 present 1");
    entity.componentAdded.add(onComponentAdded);
}


function callAfterHavePlaceableWithNonEmptyAssetRef(entity, fun) {
    var havePlaceableFun = function() {
        
    };
    var listenForPlaceableFun = function(entity, newComponent) {
        if (newComponent instanceof EC_Placeable) {
            havePlaceableSig.dispatch(entity, newComponent);
            entity.componentAdded.remove(listenForPlaceableFun);
        }
    };

    var placeable = entity.componentByType("Placeable");
    if (placeable)
        havePlaceableFun();
    else {
        entity.componentAdded.add(listenForPlaceableFun);
        havePlaceableSig.addOnce(havePlaceableFun);
    }
}

// WTModel.prototype.onComponentAdded = function(entity, component, changeType) {
//     // emit addMesh for each mesh as they become ready to add
//     // (ie. they are added to scene AND we have a placeable for them).
//     var placeable = entity.componentByType("Placeable");
//     if (!(component instanceof EC_Mesh))
//         return;
//     var mesh = component;
//     if (!placeable) {
//         // handle this mesh when the placeable appears
//         var thisIsThis;
//         var onEntityComponentAdded = function (component) {
//             if (!(component instanceof EC_Placeable))
//                 return;
//             thisIsThis.meshComponentReady.dispatch(entity, component, mesh);
//             mesh.attributeChanged.add(thisIsThis.onMeshAttributeChanged);
//             checkDefined(onEntityComponentAdded);
//             entity.componentAdded.remove(onEntityComponentAdded);
//         };
//         entity.componentAdded.add(onEntityComponentAdded);
//     } else {
//         this.meshComponentReady.dispatch(entity, placeable, mesh);
//         mesh.attributeChanged.add(this.onMeshAttributeChanged);
//     }
// };


// WTModel.prototype.onComponentAdded = function(entity, component, changeType) {
//     // emit addMesh for each mesh as they become ready to add
//     // (ie. they are added to scene AND we have a placeable for them).
//     var placeable = entity.componentByType("Placeable");
//     if (!(component instanceof EC_Mesh))
//         return;
//     var mesh = component;
//     if (!placeable) {
//         // handle this mesh when the placeable appears
//         var thisIsThis;
//         var onEntityComponentAdded = function (component) {
//             if (!(component instanceof EC_Placeable))
//                 return;
//             thisIsThis.meshComponentReady.dispatch(entity, component, mesh);
//             mesh.attributeChanged.add(thisIsThis.onMeshAttributeChanged);
//             checkDefined(onEntityComponentAdded);
//             entity.componentAdded.remove(onEntityComponentAdded);
//         };
//         entity.componentAdded.add(onEntityComponentAdded);
//     } else {
//         this.meshComponentReady.dispatch(entity, placeable, mesh);
//         mesh.attributeChanged.add(this.onMeshAttributeChanged);
//     }
// };


// function ListenerWithPrecondition(signal, precondition, preconditionCheckSignal, signalHandler) {
//     this.preConditionStatus = false;
//     this.preCheckFunc = precondition;
//     this.preSig = preconditionCheckSignal;
//     this.mainSignal = signal;
//     this.mainSignalHandler = signalHandler;
//     this.preSig.add(this.onPreSig.bind(this));
//     this.mainSignal.add(this.mainSignalHanldler.bind(this));
// }


// ListenerWithPrecondition.prototype.onPreSig = function() {
//     if (this.preConditionStatus) {
//         console.log("precondition check triggered after it already checked out");
//         return;
//     }
//     this.preConditionStatus = this.preCheckFunc().apply(null, arguments);
//     if (!this.preConditionStatus)
//         return;
//     if (this.mainSignalTriggered)
//         this.replayMainSignal();
//     this.preSig.remove(this.onPreSig);
// };

// /* implement replayMainSignal.. (case: main sig happens before precondition) */

// ListenerWithPrecondition.prototype.mainSignal = function() {
    
// };

// WTModel.prototype.onMeshAttributeChanged = function(changedAttribute, changeType) {
//     var attrId = changedAttribute.id;
//     checkDefined(attrId);
//     if (attrId != "meshRef")
//         return;
//     var meshComponent = changedAttribute.owner;
//     console.log("mesh attribute changed:", changedAttribute.name);
//     var entity = meshComponent.owner;
//     checkDefined(entity);
//     var placeableComponent = entity.componentByType("Placeable");
//     checkDefined(entity, placeableComponent, meshComponent);
//     this.meshComponentReady.dispatch(entity, placeableComponent, meshComponent);
// };

// WTModel.prototype.checkMeshComonentReady = function(entity, placeable, meshComponent) {
//     var url = meshComponent.meshRef.value.ref;
//     if (meshComponent.readyForView === undefined) {
//         this.meshComponentReady.dispatch(entity, placeable, meshComponent);
//         meshComponent.readyForView = true;
//     }
// }

function setXyz(thing, x, y, z) {
    thing.x = x; thing.y = y; thing.z = z;
}

function attributeValues(o) {
    var out = [];
    for (var key in o) {
        if (!o.hasOwnProperty(key))
            continue;
        out.push(o[key]);
    }
    return out;
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
    this.projector = new THREE.Projector();
    var thisIsThis = this;
    document.addEventListener( 'mousedown', function(event) {
        var camera = thisIsThis.camera;
        var mouse = { x: ( event.clientX / window.innerWidth ) * 2 - 1,
                      y: - ( event.clientY / window.innerHeight ) * 2 + 1, };
        var vector = new THREE.Vector3( mouse.x, mouse.y, 1 );
        var ray = new THREE.Raycaster( camera.position, vector.sub( camera.position ).normalize() );
        var mouseVector = new THREE.Vector3( mouse.x, mouse.y, 1 );
        thisIsThis.projector.unprojectVector( mouseVector, camera );
        var intersects = ray.intersectObjects(attributeValues(thisIsThis.objectsByEntityId));
    }, false );

    this.pointLight = new THREE.PointLight(0xffffff);
    this.pointLight.position.set(-100,200,100);
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
    this.wireframeMaterial = new THREE.MeshBasicMaterial( { color: 0x00ee00, wireframe: true, transparent: true } );

    // debug
    this.entitiesSeen = {};
    this.entitiesWithMeshesSeen = {};

}

function jsonLoad(url, addCallback) {
    var loader = new THREE.JSONLoader();
    loader.load(url, function(geometry, material) {
        addCallback(geometry, material);
    });

}

var debugOnCheckFail = true;

function checkDefined() {
    for (var i = 0; i < arguments.length; i++) {
        if (arguments[i] === undefined) {
            if (debugOnCheckFail) {
                debugger;
            } else {
                throw("undefined value, arg #" + i);
            }
        }
    }
}

function check() {
    for (var i = 0; i < arguments.length; i++)
        if (arguments[i] !== true)
            if (debugOnCheckFail) {
                debugger;
            } else {
                throw("untrue value" + arguments[i] + ", arg #" + i);
            }
 }

ThreeView.prototype.render = function() {
    checkDefined(this.scene, this.camera);
    this.renderer.render(this.scene, this.camera);
    
};

function copyXyz(src, dst) {
    dst.x = src.x; dst.y = src.y; dst.z = src.z;
}
function copyXyzMapped(src, dst, mapfun) {
    dst.x = mapfun(src.x); dst.y = mapfun(src.y); dst.z = mapfun(src.z);
}

function degToRad(val) {
    return val * (Math.PI/180);
}

function updateFromTransform(threeMesh, placeable) {
    checkDefined(placeable, threeMesh);   
    copyXyz(placeable.transform.value.pos, threeMesh.position);
    copyXyz(placeable.transform.value.scale, threeMesh.scale);
    copyXyzMapped(placeable.transform.value.rot, threeMesh.rotation, degToRad);
    threeMesh.needsUpdate = true;
}

ThreeView.prototype.addOrUpdate = function(entity, placeable, meshComp) {
    checkDefined(entity, placeable, meshComp);
    checkDefined(entity.id);
    var threeObject = this.objectsByEntityId[entity.id];
    var url = meshComp.meshRef.value.ref;
    if (url === 'sphere.mesh')
       url = 'android.js';
    if (threeObject === undefined) {
        console.log("in addOrUpdate, adding url \"" + url + "\"");
        if (useCubes) {
            threeObject = new THREE.Mesh(this.cubeGeometry, this.wireframeMaterial);
            this.objectsByEntityId[entity.id] = threeObject;
            this.scene.add(threeObject);
        } else if (url === 'lightsphere.mesh') {
            this.objectsByEntityId[entity.id] = this.pointLight;
            this.scene.add(this.pointLight);
            updateFromTransform(this.pointLight, placeable);
            this.connectToPlaceable(this.pointLight, placeable);
        } else {
            url = url.replace(/\.mesh$/i, ".json")
            var entitiesForUrl = this.meshCache[url];
            var firstRef = false;
            if (entitiesForUrl === undefined) {
                this.meshCache[url] = entitiesForUrl = [];
                firstRef = true;
            }
            entitiesForUrl.push(entity);
            if (!firstRef)
                return;
            console.log("new mesh ref:", url);          
            var thisIsThis = this;
            jsonLoad(url,
                     function (geometry, material) {                        
                         thisIsThis.addMeshToEntities(geometry, material, url);
                         console.log("loaded & updated to scene:", url);
                     });
        }
    } else {
        updateFromTransform(threeObject, placeable);
    }
};

ThreeView.prototype.connectToPlaceable = function(threeObject, placeable) {
    updateFromTransform(threeObject, placeable);
    placeable.attributeChanged.add(function(attr, changeType) {
        updateFromTransform(threeObject, placeable);
    });
 };

ThreeView.prototype.addMeshToEntities = function(geometry, material, url) {
    var entities = this.meshCache[url];
    checkDefined(entities);
    for (var i = 0; i < entities.length; i++) {
        var ent = entities[i];
        check(ent instanceof Entity);
        var pl = ent.componentByType("Placeable");
        var mesh = new THREE.Mesh(geometry, new THREE.MeshFaceMaterial(material));      
        if (useSignals) {
            this.connectToPlaceable(mesh, pl);
        } else {
            updateFromTransform(mesh, pl);
        }
        this.scene.add(mesh);
        this.objectsByEntityId[ent.id] = mesh;
        mesh.userData.entityId = ent.id;
    }
    entities.length = 0;
};

function TestApp(dataConnection, viewer) {
    this.viewer = new ThreeView();
    this.dataConnection = new WTModel(this);
    this.dataConnection.meshComponentReady.add(this.viewer.addOrUpdate.bind(this.viewer));
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
    if (useSignals)
        return;

    var sceneData = this.dataConnection.scene;
    for (var i in sceneData.entities) {
        if (!sceneData.entities.hasOwnProperty(i))
            continue;
        var entity = sceneData.entities[i];
        this.viewer.entitiesSeen[i] = true;
        checkDefined(entity);
        // if (entity.registeredWithViewer === true)
        //     continue;
        // else
        //     entity.registeredWithViewer = true;
        var placeable = entity.componentByType("Placeable");
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
            for (j in Object.keys(meshes)) {
                this.viewer.entitiesWithMeshesSeen[i] = true;
                this.viewer.addOrUpdate(entity, placeable, meshes[j]);
            }
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

function dMeshRef(entityId) {
    return theApp.dataConnection.scene.entities[entityId].componentByType("Mesh").meshRef.value;
}
