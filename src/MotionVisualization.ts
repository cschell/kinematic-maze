import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {Reactor} from "./events";
import {Sky} from "three/examples/jsm/objects/Sky";
import {OBJLoader} from "three/examples/jsm/loaders/OBJLoader";
import Papa from "papaparse";
import {PlaybackController} from './PlaybackController';

function sleep(ms: any) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export class MotionVisualization {
    csvPath: string;

    preview = false;
    

    isAutoRotateEnabled = true;

    rendererDom: HTMLElement
    scene: THREE.Scene
    reactor: Reactor
    renderer: THREE.WebGLRenderer
    camera!: THREE.PerspectiveCamera
    cameraControls!: OrbitControls
    clock: THREE.Clock

    settings: { [key: string]: any } = {};
    meshes: { [key: string]: THREE.Mesh | THREE.Group } = {};
    mixers: { [key: string]: THREE.AnimationMixer } = {};
    actions: { [key: string]: any } = {};
    state: { [key: string]: any } = {};
    canvas: HTMLCanvasElement;
    playerDom: HTMLDivElement;
    canvasContainer: HTMLDivElement;
    ready: Promise<void>;

    constructor(playerDom: HTMLDivElement) {
        this.playerDom = playerDom;
        this.csvPath = this.playerDom.dataset["sourcePath"] as string;

        this.canvas = document.createElement("canvas");
        this.canvasContainer = document.createElement("div");
        this.scene = new THREE.Scene();
        this.reactor = new Reactor()

        this.renderer = new THREE.WebGLRenderer(
            {
                canvas: this.canvas,
                antialias: true,
                precision: "highp"
            });
        this.rendererDom = this.renderer.domElement
        this.clock = new THREE.Clock();

        this.state = {}

        this.ready = new Promise<void>(async (resolve, _reject) => {
            await this.setup();
            resolve();
        });

        this.onWindowResize()

    }

    async setup() {
        this.reactor.registerEvent('step');
        this.reactor.registerEvent('sweep');
        this.canvasContainer.classList.add("canvas-container")
        this.canvasContainer.appendChild(this.canvas);
        this.playerDom.appendChild(this.canvasContainer);
        // Preview video camera change
        if (this.playerDom.className.includes("preview")) {
            this.preview = true;
        }

        this._setupCameraAndControls()
        this._addKeyListeners()
        window.addEventListener('resize', this.onWindowResize.bind(this));

        this.setupScene();


        const material = new THREE.MeshStandardMaterial({color: 0x00ff00});
        this.meshes["HMDIndicator"] = new THREE.Mesh(new THREE.SphereGeometry(.02), material);
        this.meshes["leftControllerIndicator"] = new THREE.Mesh(new THREE.SphereGeometry(.02), material);
        this.meshes["rightControllerIndicator"] = new THREE.Mesh(new THREE.SphereGeometry(.02), material);

        this.mixers["HMDIndicator"] = new THREE.AnimationMixer(this.meshes["HMDIndicator"]);
        this.mixers["leftControllerIndicator"] = new THREE.AnimationMixer(this.meshes["leftControllerIndicator"]);
        this.mixers["rightControllerIndicator"] = new THREE.AnimationMixer(this.meshes["rightControllerIndicator"]);

        const modelMapping = {
            HMD: "generic_hmd",
            leftController: "vr_controller_vive_1_5",
            rightController: "vr_controller_vive_1_5",
        }

        for (const [objectName, modelName] of Object.entries(modelMapping)) {
            new OBJLoader().load(
                "models/" + modelName + "/" + modelName + ".obj",
                (meshGroup) => {

                    const material = new THREE.MeshLambertMaterial({color: 0x444444});

                    meshGroup.traverse((child: THREE.Object3D) => {
                        if ((child as any).isMesh) {
                            const mesh = child as THREE.Mesh;
                            mesh.material = material;
                            mesh.castShadow = true;
                        }
                    });

                    meshGroup.scale.set(2, 2, 2)
                    meshGroup.position.set(0, 0, 0);
                    this.scene.add(meshGroup)

                    this.meshes[objectName] = meshGroup;
                    this.mixers[objectName] = new THREE.AnimationMixer(this.meshes[objectName]);
                },
                (xhr) => {
                },
                (error) => { // onError callback
                    console.error('An error happened', error);
                });
        }

        while (!this.allObjectsLoaded()) {
            console.log("waiting for objects to be loaded...")
            await sleep(250);
        }

        await this._loadAndBuildAnimations();

        if (this.playerDom.dataset["progress"] == "true") {
            new PlaybackController(this);
        }

        // Activate shadows
        for (const key in this.meshes) {
            if (this.meshes.hasOwnProperty(key)) {
                const mesh = this.meshes[key];
                mesh.castShadow = true;
                mesh.receiveShadow = true;
            }
        }
    }

    _setupCameraAndControls() {
        this.camera = new THREE.PerspectiveCamera(40, this.rendererDom.offsetWidth / this.rendererDom.offsetHeight, 0.1, 8000);

        this.cameraControls = new OrbitControls(this.camera, this.renderer.domElement);
        this.cameraControls.enableDamping = true;
        this.cameraControls.dampingFactor = 0.25;
        this.cameraControls.screenSpacePanning = false;
        this.cameraControls.autoRotate = false;
        this.cameraControls.autoRotateSpeed = 0.15;
        this.cameraControls.target.set(0, 1.2, 0);

        let radius = 3;
        let theta = Math.PI / 4; // 45 degrees in radians
        let offsetX = radius * Math.sin(theta);
        let thirdPersonOffsetY = 5;
        let thirdPersonOffsetZ = -3;

        this.camera.position.set(offsetX, thirdPersonOffsetY, thirdPersonOffsetZ);
        this.cameraControls.minPolarAngle = 0.5 * Math.PI / 3; // How low the camera can go
        this.cameraControls.maxPolarAngle = Math.PI / 3; // How high the camera can go
        this.cameraControls.enablePan = false;
        this.cameraControls.minAzimuthAngle = -Infinity; // radians
        this.cameraControls.maxAzimuthAngle = Infinity;
        this.cameraControls.enableRotate = true;
        this.cameraControls.update();

        this.cameraControls.addEventListener('change', () => {
            this.camera.position.y = thirdPersonOffsetY;
        });
    }

    _addKeyListeners() {
        // Toggle camera auto rotate when pressing space
        document.addEventListener('keydown', (event) => {
            if (event.code === 'Space') {
                this.isAutoRotateEnabled = !this.isAutoRotateEnabled;
                this.cameraControls.autoRotate = this.isAutoRotateEnabled;
                event.preventDefault();
            }
        });
    }

    async _loadAndBuildAnimations() {

        try {
            const response = await fetch(this.csvPath);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const csvData = await response.text();

            const parse = new Promise<void>((resolve, reject) => {
                Papa.parse(csvData, {
                    fastMode: true,
                    header: true,
                    skipEmptyLines: true,
                    complete: (results: any) => {
                        const data = results.data;
                        const numRows = data.length;
                        const times = new Array(numRows);

                        const HeadPositions = new Array(numRows * 3);
                        const leftHandPositions = new Array(numRows * 3);
                        const rightHandPositions = new Array(numRows * 3);

                        const HeadRotations = new Array(numRows * 4);
                        const leftHandRotations = new Array(numRows * 4);
                        const rightHandRotations = new Array(numRows * 4);

                        const initialRow = data[0];

                        const yOffset = 2;
                        let scaling = 50;

                        // Fix normalization for boxrr tiltbrush if head positions are not given
                        if (!(initialRow.head_pos_x && initialRow.head_pos_y && initialRow.head_pos_z)) {
                            initialRow.head_pos_x = initialRow.right_hand_pos_x
                            initialRow.head_pos_y = initialRow.right_hand_pos_y
                            initialRow.head_pos_z = initialRow.right_hand_pos_z
                        }

                        let row;
                        for (let i = 0; i < numRows; i++) {
                            row = data[i];
                            times[i] = Number(row.delta_time_ms) / 1000.0;
                            HeadPositions[i * 3 + 0] = Number(row.head_pos_x - initialRow.head_pos_x) / scaling;
                            HeadPositions[i * 3 + 1] = Number(row.head_pos_y - initialRow.head_pos_y) / scaling + yOffset;
                            HeadPositions[i * 3 + 2] = Number(row.head_pos_z - initialRow.head_pos_z) / scaling;

                            leftHandPositions[i * 3 + 0] = Number(row.left_hand_pos_x - initialRow.head_pos_x) / scaling;
                            leftHandPositions[i * 3 + 1] = Number(row.left_hand_pos_y - initialRow.head_pos_y) / scaling + yOffset;
                            leftHandPositions[i * 3 + 2] = Number(row.left_hand_pos_z - initialRow.head_pos_z) / scaling;

                            rightHandPositions[i * 3 + 0] = Number(row.right_hand_pos_x - initialRow.head_pos_x) / scaling;
                            rightHandPositions[i * 3 + 1] = Number(row.right_hand_pos_y - initialRow.head_pos_y) / scaling + yOffset;
                            rightHandPositions[i * 3 + 2] = Number(row.right_hand_pos_z - initialRow.head_pos_z) / scaling;

                            HeadRotations[i * 4 + 0] = Number(row.head_rot_x);
                            HeadRotations[i * 4 + 1] = Number(row.head_rot_y);
                            HeadRotations[i * 4 + 2] = Number(row.head_rot_z);
                            HeadRotations[i * 4 + 3] = Number(row.head_rot_w);

                            leftHandRotations[i * 4 + 0] = Number(row.left_hand_rot_x);
                            leftHandRotations[i * 4 + 1] = Number(row.left_hand_rot_y);
                            leftHandRotations[i * 4 + 2] = Number(row.left_hand_rot_z);
                            leftHandRotations[i * 4 + 3] = Number(row.left_hand_rot_w);

                            rightHandRotations[i * 4 + 0] = Number(row.right_hand_rot_x);
                            rightHandRotations[i * 4 + 1] = Number(row.right_hand_rot_y);
                            rightHandRotations[i * 4 + 2] = Number(row.right_hand_rot_z);
                            rightHandRotations[i * 4 + 3] = Number(row.right_hand_rot_w);
                        }

                        const HeadPositionKFT = new THREE.VectorKeyframeTrack(".position", times, HeadPositions)
                        const leftHandPositionKFT = new THREE.VectorKeyframeTrack(".position", times, leftHandPositions)
                        const rightHandPositionKFT = new THREE.VectorKeyframeTrack(".position", times, rightHandPositions)

                        const HeadRotationKFT = new THREE.QuaternionKeyframeTrack(".quaternion", times, HeadRotations)
                        const leftHandRotationKFT = new THREE.QuaternionKeyframeTrack(".quaternion", times, leftHandRotations)
                        const rightHandRotationKFT = new THREE.QuaternionKeyframeTrack(".quaternion", times, rightHandRotations)

                        const animateHead = new THREE.AnimationClip('AnimateHMD', -1, [HeadPositionKFT, HeadRotationKFT])
                        this.actions["HMD"] = this.mixers["HMD"].clipAction(animateHead);
                        this.actions["HMDIndicator"] = this.mixers["HMDIndicator"].clipAction(animateHead);

                        const animateLeftHand = new THREE.AnimationClip('AnimateLeftController', -1, [leftHandPositionKFT, leftHandRotationKFT])
                        this.actions["leftController"] = this.mixers["leftController"].clipAction(animateLeftHand);
                        this.actions["leftControllerIndicator"] = this.mixers["leftControllerIndicator"].clipAction(animateLeftHand);

                        const animateRightHand = new THREE.AnimationClip('AnimateRightController', -1, [rightHandPositionKFT, rightHandRotationKFT])
                        this.actions["rightController"] = this.mixers["rightController"].clipAction(animateRightHand);
                        this.actions["rightControllerIndicator"] = this.mixers["rightControllerIndicator"].clipAction(animateRightHand);

                        this.state["currentSessionDuration"] = animateHead.duration;

                        resolve();
                    },
                    error: (error: any) => {
                        console.error('Error parsing CSV:', error.message);
                    }
                });
            });
            await parse;
        } catch (error) {
            console.error('Error fetching and parsing CSV:', error);
            return;
        }
        this.activateAllActions();
        this.animate();
    }

    isEverythingLoadedAndReady() {
        return "HMD" in this.mixers;
    }

    progress() {
        return this.actions["HMD"].time / this.state["currentSessionDuration"];
    }

    getCurrentTimestamp() {
        return this.actions["HMD"].time * 1000;
    }

    pauseContinue() {
        this.state["singleStepMode"] = false;

        if (this.state["run"]) {
            this.pauseAllActions();
        } else {
            this.unPauseAllActions();
        }
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        let delta;

        if (this.state["singleStepMode"]) {
            delta = this.state["sizeOfNextStep"];
            this.state["sizeOfNextStep"] = 0;

        } else {
            delta = this.clock.getDelta();
        }

        if ("HMD" in this.actions) {
            this.state["playbackPosition"] = this.actions["HMD"].time;
        }

        for (const [_, mixer] of Object.entries(this.mixers)) {
            mixer.update(delta)
        }

        if (this.cameraControls.autoRotate) {
            this.cameraControls.update();
        }

        this.reactor.dispatchEvent("step")
        this.render();
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    activateAllActions() {
        this.state["run"] = true;
        for (const action of Object.values(this.actions)) {
            action.play();
        }
    }

    allObjectsLoaded() {
        return "HMD" in this.meshes && "leftController" in this.meshes && "rightController" in this.meshes
    }

    pauseAllActions() {
        this.state["run"] = false;
        for (const action of Object.values(this.actions)) {
            action.paused = true;
        }
    }

    unPauseAllActions() {
        this.state["run"] = true;
        for (const action of Object.values(this.actions)) {
            action.paused = false;
        }
    }

    resetAllActions() {
        this.state["run"] = true;
        for (const action of Object.values(this.actions)) {
            action.reset();
        }
    }

    sweep(position: any) {
        const animationTime = this.state["currentSessionDuration"] * position;

        const wasPaused = !this.state["run"];
        this.unPauseAllActions();

        for (const mixer of Object.values(this.mixers)) {
            mixer.setTime(animationTime);
        }

        if (wasPaused) {
            this.pauseAllActions();
        }

        this.reactor.dispatchEvent("sweep");
    }

    setupScene() {
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.scene.background = new THREE.Color().setHSL(0.6, 0, 1);
        this.scene.fog = new THREE.Fog(this.scene.background, 1, 5000);

        // LIGHT
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.color.setHSL(1, 1, 0.95);
        dirLight.position.set(-20, 60, -20);
        dirLight.target.position.set(0, 0, 0);
        this.scene.add(dirLight);

        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.left = -50;
        dirLight.shadow.camera.right = 50;
        dirLight.shadow.camera.top = 50;
        dirLight.shadow.camera.bottom = -50;
        dirLight.shadow.camera.far = 100;
        dirLight.shadow.bias = -0.0001;

        // GROUND
        const groundGeo = new THREE.PlaneGeometry(100, 100);
        const groundMat = new THREE.MeshPhongMaterial({color: 0xaaaaaa, side: THREE.DoubleSide});
        groundMat.opacity = 0.4;
        groundMat.transparent = true;
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.position.y = 0;
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        const grid = new THREE.GridHelper(100, 25)
        grid.position.y = 0.1; // Lower it just a bit
        this.scene.add(grid);

        this.addAxeArrows();

        // SKY DOME
        const sky = new Sky();
        sky.scale.setScalar(450000);
        this.scene.add(sky);

        const sun = new THREE.Vector3();

        /// GUI
        const skySettings = {
            turbidity: 10,
            rayleigh: 3,
            mieCoefficient: 0.005,
            mieDirectionalG: 0.7,
            elevation: 30,
            azimuth: 180,
            exposure: this.renderer.toneMappingExposure
        };

        const uniforms = sky.material.uniforms;
        uniforms['turbidity'].value = skySettings.turbidity;
        uniforms['rayleigh'].value = skySettings.rayleigh;
        uniforms['mieCoefficient'].value = skySettings.mieCoefficient;
        uniforms['mieDirectionalG'].value = skySettings.mieDirectionalG;

        const phi = THREE.MathUtils.degToRad(90 - skySettings.elevation);
        const theta = THREE.MathUtils.degToRad(skySettings.azimuth);

        sun.setFromSphericalCoords(1, phi, theta);

        uniforms['sunPosition'].value.copy(sun);

        this.renderer.toneMappingExposure = skySettings.exposure;
    }

    addAxeArrows() {
        const dirX = new THREE.Vector3(1, 0, 0);
        const dirY = new THREE.Vector3(0, 1, 0);
        const dirZ = new THREE.Vector3(0, 0, 1);

        const origin = new THREE.Vector3(-1, 0, -1);
        const length = 3;
        const radius_cylinder = 0.02;
        const headLength = 0.1 * length;
        const headWidth = 0.05 * length;

        const addAxis = (direction: THREE.Vector3, color: number) => {
            const cylinderLength = length - headLength;

            // Cylinder for the shaft of the arrow
            const cylinderGeometry = new THREE.CylinderGeometry(radius_cylinder, radius_cylinder, cylinderLength, 64);
            const cylinderMaterial = new THREE.MeshBasicMaterial({color: color});
            const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);

            // Positioning and orienting the cylinder
            cylinder.position.copy(origin.clone().add(direction.clone().normalize().multiplyScalar(cylinderLength / 2)));
            cylinder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());

            // Arrowhead
            const arrowHelper = new THREE.ArrowHelper(direction, origin, length, color, headLength, headWidth);

            this.scene.add(cylinder);
            this.scene.add(arrowHelper);
        };

        addAxis(dirX, 0xff0000); // Red for X-axis
        addAxis(dirY, 0x00d400); // Green for Y-axis
        addAxis(dirZ, 0x0000ff); // Blue for Z-axis
    }


    onWindowResize() {
        const rect = this.canvasContainer.getBoundingClientRect();
        this.renderer.setSize(rect.width, rect.height);
        this.camera.aspect = rect.width / rect.height;
        this.camera.updateProjectionMatrix();
        this.cameraControls.update()
    }
}
