import * as THREE from 'three';
import WebGL from 'three/addons/capabilities/WebGL.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import GUI from 'lil-gui';

if ( WebGL.isWebGLAvailable() ) {
    const frameSize = 128;
    const lastFrame = 2155;
    const offset = 63.5;
    let animateId = null;

    const canvas = document.querySelector("canvas.webgl");

    const gui = new GUI();
    const uiOption = {        
        currFrame: 1,
        isPlay: false,
        onClickPrevious: async () => {
            if (uiOption.currFrame > 0) {
                uiOption.currFrame--;
                await updateFrame(uiOption.currFrame);
            }        
        },
        onClickNext: async () => {
            if (uiOption.currFrame < lastFrame) {
                uiOption.currFrame++;            
            }
            await updateFrame(uiOption.currFrame);
        }
    };

    gui.add(uiOption, "currFrame", 1, lastFrame, 1)
    .name("Frame")
    .listen()
    .onFinishChange(async surfaceId => {
        await updateFrame(surfaceId);
    });

    gui.add(uiOption, "isPlay")
    .name("Play")
    .listen()
    .onFinishChange(() => {        
        if (uiOption.isPlay) {
            playFrame();
        } else {
            stopFrame();
        }        
    });

    gui.add(uiOption, "onClickPrevious")
    .name("Prev");

    gui.add(uiOption, "onClickNext")
    .name("Next");

    const getSurfaceById = async (id) => {
        const res = await fetch(`${import.meta.env.VITE_API_HOST}/hlist/getSurfaceById/${id}`);
        return await res.json();
    };

    const updateFrame = async (surfaceId) => {
        const frame = await getFrame(surfaceId);
        let positionMatrix = geometry.attributes.position.array;
        let colorMatrix = geometry.attributes.color.array;

        frame.vertices.forEach((coord, i) => {
            positionMatrix[i] = coord;
        });
        frame.colorMap.forEach((color, i) => {
            colorMatrix[i] = color;
        });
        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.color.needsUpdate = true;
        renderer.render(scene, camera);
    };

    const getFrame = async (surfaceId) => {
        const color = new THREE.Color();
        let result = {
            vertices: [],
            colorMap: []
        };
        const data = await getSurfaceById(surfaceId);

        if (data && data.surface_id && data.vertices?.length > 0) {
            const min = 61;
            const max = 72;
            data.vertices.forEach((row, j) => {
                row.forEach((vertex, i) => {
                    result.vertices.push(i - offset, j - offset, vertex - 60);
                    const hRatio = (vertex - min) / (max - min);
                    const r = hRatio * 0.99 + 0.01;
                    const g = hRatio * 0.5;
                    const b = hRatio * 0.1;
                    color.setRGB(r, g, b, THREE.SRGBColorSpace);
                    result.colorMap.push(color.r, color.g, color.b);
                });
            });
        }
        return result;
    };

    const getMeshIdx = () => {
        let result = [];
        for (let i = 0; i < frameSize * (frameSize - 1); i += frameSize) {
            for (let j = i; j < i + frameSize - 1; j++) {
                const v1 = j;
                const v2 = j + 1;
                const v3 = j + 1 + frameSize;
                const v4 = j + frameSize
                result.push(v1, v2, v3);
                result.push(v3, v4, v1);
            }
        }
        return result;
    };

    const playFrame = () => {
        if (uiOption.currFrame > 0 && uiOption.currFrame < lastFrame && uiOption.isPlay) {
            animateId = setInterval(async () => {
                if (uiOption.currFrame > 0 && uiOption.currFrame < lastFrame) {
                    uiOption.currFrame++;
                    await updateFrame(uiOption.currFrame);
                } else {
                    uiOption.isPlay = false;
                    clearInterval(animateId);
                }
                
            }, 150);
        } else {
            uiOption.isPlay = false;
        }
    };

    const stopFrame = () => {
        clearInterval(animateId);
    };

    const animate = () => {
        requestAnimationFrame(animate);
        orbit.update();
        renderer.render(scene, camera);
    }

    const init = async () => {        
        const frame = await getFrame(uiOption.currFrame);
        geometry.setIndex(getMeshIdx());
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(frame.vertices), 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(frame.colorMap, 3));
        geometry.computeVertexNormals();

        const material = new THREE.MeshLambertMaterial({
            vertexColors: true,
            side: THREE.DoubleSide
        });
        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        renderer.render(scene, camera);
    };

	const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({
        canvas: canvas
    });
    const geometry = new THREE.BufferGeometry();
    const orbit = new OrbitControls(camera, canvas);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    camera.position.set(0, -120, 115);
    camera.lookAt(0, 0, 0);
    orbit.screenSpacePanning = false;
    orbit.minDistance = 100;
    orbit.maxDistance = 300;
    orbit.maxPolarAngle = Math.PI;

    // Lights
    const light = new THREE.HemisphereLight();
    light.intensity = 3.5;
    // const light = new THREE.DirectionalLight(0xffffff, 3.5);
    // light.position.set(0, 0, 100);
    // light.target.position.set(0, 0, 0);
    // light.castShadow = true;
    // light.shadow.mapSize.width = 512;
    // light.shadow.mapSize.height = 512;
    // light.shadow.camera.near = 0.1;
    // light.shadow.camera.far = 100;
    // light.shadow.camera.left = -75;
    // light.shadow.camera.right = 75;
    // light.shadow.camera.top = 75;
    // light.shadow.camera.bottom = -75;
    scene.add(light);

    init();
    animate();
    
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.render(scene, camera);
    }, false);
    
} else {
	const warning = WebGL.getWebGLErrorMessage();
	document.getElementById('container').appendChild( warning );
}