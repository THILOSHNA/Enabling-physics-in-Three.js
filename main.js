
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import RAPIER from 'https://cdn.skypack.dev/@dimforge/rapier3d-compat@0.11.2';

await RAPIER.init();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.VSMShadowMap
document.body.appendChild(renderer.domElement);

// ---------lights
const light = new THREE.AmbientLight( 0xffffff ); // soft white light
scene.add( light );

const light1 = new THREE.SpotLight(undefined, Math.PI * 10)
light1.position.set(2.5, 10, 15)
light1.angle = Math.PI / 3
light1.penumbra = 0.5
light1.castShadow = true
light1.shadow.blurSamples = 10
light1.shadow.radius = 5
scene.add(light1)

const light2 = light1.clone()
light2.position.set(-2.5, 10, 5)
scene.add(light2)

const controls = new OrbitControls(camera, renderer.domElement);

// UI elements
const shapeInfo = document.getElementById('shapeInfo');
const enablePhysicsBtn = document.getElementById('enablePhysics');
const colliderTypeSelect = document.getElementById('colliderType');
const setColliderBtn = document.getElementById('setCollider');
const bounceSlider = document.getElementById('bounce');
const frictionSlider = document.getElementById('friction');
const gravitySlider = document.getElementById('gravity');
const dampingSlider = document.getElementById('damping');
const bounceValue = document.getElementById('bounceValue');
const frictionValue = document.getElementById('frictionValue');
const gravityValue = document.getElementById('gravityValue');
const dampingValue = document.getElementById('dampingValue');
const horizontalForceSlider = document.getElementById('horizontalForce');
const horizontalForceValue = document.getElementById('horizontalForceValue');
const applyForceBtn = document.getElementById('applyForce');
const toggleDebugBtn = document.getElementById('toggleDebug');


// Physics world setup
const world = new RAPIER.World({ x: 0, y: parseFloat(gravitySlider.value), z: 0 });
const dynamicBodies = [];

// Create shapes without physics
const shapes = [];
const geometries = [
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.SphereGeometry(0.5),
    new THREE.CylinderGeometry(0.5, 0.5, 1),
    new THREE.IcosahedronGeometry(0.5),
    new THREE.TorusKnotGeometry(0.5, 0.2)
];

for (let i = 0; i < geometries.length; i++) {
    const material = new THREE.MeshNormalMaterial({
        transparent: true,
        opacity: 0.6 // Set this to your desired opacity value (0.0 to 1.0)
    });
    const mesh = new THREE.Mesh(geometries[i], material);
    mesh.position.set(i * 2 - 4, 5, 0);
    mesh.castShadow = true;
    scene.add(mesh);
    shapes.push(mesh);
}

//
// 3d model
//
let loader = new GLTFLoader();
let model;

loader.load("shiba.glb", (gltf)=>{
    model= gltf.scene;
    model.position.set(6,5,0)
    // model.scale.set(0.001,0.001,0.001)
    scene.add(model)
    shapes.push(model)
    
})
//
// Floor
//
const floorMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 50),
    new THREE.MeshPhongMaterial({ color: 0xcccccc })
);
floorMesh.rotation.x = -Math.PI / 2;
floorMesh.receiveShadow = true;
scene.add(floorMesh);

const floorBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
world.createCollider(RAPIER.ColliderDesc.cuboid(25, 0.1, 25), floorBody);
//
// Raycaster setup
//
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let selectedShape = null;
let selectedShapeName = null;
let debugMode = false;
const debugObjects = new THREE.Group();
scene.add(debugObjects);

function updatePhysicsProperties() {
    bounceValue.textContent = bounceSlider.value;
    frictionValue.textContent = frictionSlider.value;
    gravityValue.textContent = gravitySlider.value;
    dampingValue.textContent = dampingSlider.value;
    horizontalForceValue.textContent = horizontalForceSlider.value;

    world.gravity = { x: 0, y: parseFloat(gravitySlider.value), z: 0 };

    for (let [mesh, body] of dynamicBodies) {
        const collider = body.collider(0);
        if (collider) {
            collider.setRestitution(parseFloat(bounceSlider.value));
            collider.setFriction(parseFloat(frictionSlider.value));
        }
        body.setLinearDamping(parseFloat(dampingSlider.value));
        body.setAngularDamping(parseFloat(dampingSlider.value));
    }
}
//
// Event listeners
//
renderer.domElement.addEventListener('click', onMouseClick);
enablePhysicsBtn.addEventListener('click', enablePhysics);
setColliderBtn.addEventListener('click', setCollider);
applyForceBtn.addEventListener('click', applyForce);
toggleDebugBtn.addEventListener('click', toggleDebug);
bounceSlider.addEventListener('input', updatePhysicsProperties);
frictionSlider.addEventListener('input', updatePhysicsProperties);
gravitySlider.addEventListener('input', updatePhysicsProperties);
dampingSlider.addEventListener('input', updatePhysicsProperties);
horizontalForceSlider.addEventListener('input', updatePhysicsProperties);

function onMouseClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(shapes, true);  // Set to true to check descendants

    if (intersects.length > 0) {
        selectedShape = intersects[0].object;
        // If the intersected object is part of a group (like a 3D model), select the entire group
        while (selectedShape.parent && selectedShape.parent !== scene) {
            selectedShape = selectedShape.parent;
        }
        selectedShapeName = selectedShape.name || 'Model';
        console.log(selectedShape);
        shapeInfo.textContent = `Selected: ${selectedShapeName}`;
        enablePhysicsBtn.disabled = false;
        colliderTypeSelect.disabled = false;
        setColliderBtn.disabled = false;
        applyForceBtn.disabled = false;
    } else {
        selectedShape = null;
        shapeInfo.textContent = 'No shape selected';
        enablePhysicsBtn.disabled = true;
        colliderTypeSelect.disabled = true;
        setColliderBtn.disabled = true;
        applyForceBtn.disabled = true;
    }
}

//
// Colliders Ball, Cuboid, Cylinder
//
function setCollider() {
    if (selectedShape) {
        // Calculate bounding box
        const boundingBox = new THREE.Box3().setFromObject(selectedShape);
        const center = boundingBox.getCenter(new THREE.Vector3());
        const size = boundingBox.getSize(new THREE.Vector3());

        // Create a new group and add the selected shape to it
        const group = new THREE.Group();
        selectedShape.position.sub(center);  // Offset the shape within the group
        group.add(selectedShape);
        group.position.copy(center);  // Position the group at the original center
        scene.add(group);

        let collider;
        const maxDimension = Math.max(size.x, size.y, size.z);

        switch (colliderTypeSelect.value) {
            case 'sphere':
                collider = RAPIER.ColliderDesc.ball(maxDimension / 2);
                break;
            case 'cube':
                collider = RAPIER.ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2);
                break;
            case 'cylinder':
                const cylinderRadius = Math.max(size.x, size.z) / 2;
                collider = RAPIER.ColliderDesc.cylinder(size.y / 2, cylinderRadius);
                break;
        }
        
        if (collider) {
            group.userData.collider = collider;
            group.userData.originalShape = selectedShape;
            enablePhysicsBtn.disabled = false;
            shapeInfo.textContent = `Selected: ${selectedShapeName}, Collider: ${colliderTypeSelect.value}`;
            
            // Update selectedShape to be the new group
            selectedShape = group;
        }
    }
}

//
// Enable Physics world
//
 function enablePhysics() {
    if (selectedShape && selectedShape.userData.collider && !dynamicBodies.some(body => body[0] === selectedShape)) {
        let worldPos = new THREE.Vector3();
        selectedShape.getWorldPosition(worldPos);

        const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(worldPos.x, worldPos.y, worldPos.z)
            .setLinearDamping(parseFloat(dampingSlider.value))
            .setAngularDamping(parseFloat(dampingSlider.value));
        const rigidBody = world.createRigidBody(bodyDesc);
        
        const colliderDesc = selectedShape.userData.collider;
        colliderDesc.setRestitution(parseFloat(bounceSlider.value));
        colliderDesc.setFriction(parseFloat(frictionSlider.value));
        
        const collider = world.createCollider(colliderDesc, rigidBody);
        
        dynamicBodies.push([selectedShape, rigidBody]);
        enablePhysicsBtn.disabled = true;
        rigidBody.applyImpulse({ x: 0, y: 0.5, z: 0 }, true);

        if (debugMode) {
            addDebugObject(selectedShape, collider);
        }
    }
}

// 
// Horizontal Force
//
function applyForce() {
    if (selectedShape) {
        const body = dynamicBodies.find(body => body[0] === selectedShape);
        if (body) {
            const rigidBody = body[1];
            const force = parseFloat(horizontalForceSlider.value);
            rigidBody.applyImpulse({ x: force, y: 0, z: 0 }, true);
        }
    }
}
//
// Enable / disable Debug
//
function toggleDebug() {
    debugMode = !debugMode;
    debugObjects.visible = debugMode;

    if (debugMode) {
        for (let [mesh, body] of dynamicBodies) {
            const collider = body.collider(0);
            addDebugObject(mesh, collider);
        }
    } else {
        debugObjects.clear();
    }
}
//  
// Creating Debuged Objects
// 
function addDebugObject(group, collider) {
    let debugGeometry;
    const colliderType = collider.shape.type;
    const mesh = group.userData.originalShape;

    if (colliderType === RAPIER.ShapeType.Ball) {
        debugGeometry = new THREE.SphereGeometry(collider.shape.radius);
    } else if (colliderType === RAPIER.ShapeType.Cuboid) {
        const halfExtents = collider.shape.halfExtents;
        debugGeometry = new THREE.BoxGeometry(halfExtents.x * 2, halfExtents.y * 2, halfExtents.z * 2);
    } else if (colliderType === RAPIER.ShapeType.Cylinder) {
        debugGeometry = new THREE.CylinderGeometry(collider.shape.radius, collider.shape.radius, collider.shape.halfHeight * 2);
    } else if (colliderType === RAPIER.ShapeType.ConvexPolyhedron || colliderType === RAPIER.ShapeType.TriMesh) {
        debugGeometry = new THREE.BufferGeometry();
        const vertices = [];
        mesh.traverse((child) => {
            if (child.geometry) {
                const positionAttribute = child.geometry.getAttribute('position');
                for (let i = 0; i < positionAttribute.count; i++) {
                    vertices.push(
                        positionAttribute.getX(i),
                        positionAttribute.getY(i),
                        positionAttribute.getZ(i)
                    );
                }
            }
        });
        debugGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    }


    if (debugGeometry) {
        const debugMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
        const debugMesh = new THREE.Mesh(debugGeometry, debugMaterial);
        debugMesh.userData.originalGroup = group;
        debugObjects.add(debugMesh);
    }
}


const fixedTimeStep = 1/60;
let accumulator = 0;
let lastTime = 0;

//
// Animation Loop
// 
function animate(time) {
    requestAnimationFrame(animate);

    const frameTime = Math.min((time - lastTime) / 1000, 0.1);
    accumulator += frameTime;

    while (accumulator >= fixedTimeStep) {
        world.step();
        accumulator -= fixedTimeStep;
    }

    // Sync physics body with mesh
    for (let i = 0; i < dynamicBodies.length; i++) {
        const [group, body] = dynamicBodies[i];
        const position = body.translation();
        const rotation = body.rotation();
        group.position.set(position.x, position.y, position.z);
        group.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
        if (debugMode) {
            const debugMesh = debugObjects.children.find(child => child.userData.originalGroup === group);
            if (debugMesh) {
                debugMesh.position.copy(group.position);
                debugMesh.quaternion.copy(group.quaternion);
            }
        }
    }


    renderer.render(scene, camera);
    lastTime = time;
}

animate(0);
//
// Handle window resize
//
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Initial physics properties update
updatePhysicsProperties();
