import * as THREE from 'three';
import WebGL from 'three/addons/capabilities/WebGL.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import GUI from 'lil-gui';

if ( WebGL.isWebGLAvailable() ) {
    const frameSize = 128;
    const lastFrame = 2155;
    const posOffset = 63.5;
    const rOffset = 0.01;
    const gOffset = 0.01;
    const bOffset = 0.15;
    const retryCount = 10;
    const min = 61;
    const max = 72;
    let animateId = null;
    let indexCnt = 0;
    const verticesMatrix = new Float32Array(frameSize * frameSize * 3);
    const indexMatrix = new Uint16Array((frameSize - 1) * (frameSize - 1) * 6);
    const colorMatrix = new Float32Array(frameSize * frameSize * 3);
    const color = new THREE.Color();    

    const canvas = document.querySelector("canvas.webgl");

    const gui = new GUI();
    const uiOption = {        
        currFrame: 1,
        isPlay: false,
        onClickPrevious: async () => {
            if (uiOption.currFrame > 1) {
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
        const sleep = (ms) => {
            return new Promise(resolve => setTimeout(resolve, ms));
        };

        let count = 0;
        try {
            const res = await fetch(`${import.meta.env.VITE_API_HOST}/hlist/getSurfaceById/${id}`);
            return await res.json();
        } catch(err) {
            while (count < retryCount) {
                console.log(`Retry ${count + 1} time.`);
                await sleep(5000);
                try {
                    const res = await fetch(`${import.meta.env.VITE_API_HOST}/hlist/getSurfaceById/${id}`);
                    return await res.json();
                } catch (err) {
                    count++;
                }
            }            
        }
        
        throw new Error("Fail to connect API.");
    };

    const updateFrame = async (surfaceId) => {
        const data = await getSurfaceById(surfaceId);
        let positionAttr = geometry.attributes.position.array;
        let colorAttr = geometry.attributes.color.array;

        if (data?.surface_id && data?.vertices?.length > 0) {
            const frame = data.vertices;
            for (let i = 0; i < frame.length; i++) {
                for (let j = 0; j < frame[i].length; j++) {
                    const idx = i * frameSize + j;
                    const vertexIdx = 3 * idx;
                    const hRatio = (frame[i][j] - min) / (max - min);
                    const r = hRatio * (1 - rOffset) + rOffset;
                    const g = hRatio * (1 - gOffset) + gOffset;
                    const b = bOffset - hRatio * bOffset;
    
                    positionAttr[vertexIdx + 2] = frame[i][j] - min;                
        
                    color.setRGB(r, g, b, THREE.SRGBColorSpace);
                    colorAttr[vertexIdx] = color.r;
                    colorAttr[vertexIdx + 1] = color.g;
                    colorAttr[vertexIdx + 2] = color.b;
                }
            }
        }
        
        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.color.needsUpdate = true;
        renderer.render(scene, camera);
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

    // Initiate matrices

    for (let i = 0; i < frameSize; i++) {
        for (let j = 0; j < frameSize; j++) {
            const idx = i * frameSize + j;
            const vertexIdx = 3 * idx;
            
            verticesMatrix[vertexIdx] = i - posOffset;
            verticesMatrix[vertexIdx + 1] = j - posOffset;
            verticesMatrix[vertexIdx + 2] = 0;

            color.setRGB(rOffset, gOffset, bOffset, THREE.SRGBColorSpace);
            colorMatrix[vertexIdx] = color.r;
            colorMatrix[vertexIdx + 1] = color.g;
            colorMatrix[vertexIdx + 2] = color.b;

            if (i < frameSize - 1 && j < frameSize - 1) {
                const v1 = idx;
                const v2 = idx + 1;
                const v3 = idx + 1 + frameSize;
                const v4 = idx + frameSize;
                indexMatrix[indexCnt] = v1;
                indexMatrix[indexCnt + 1] = v2;
                indexMatrix[indexCnt + 2] = v3;
                indexMatrix[indexCnt + 3] = v3;
                indexMatrix[indexCnt + 4] = v4;
                indexMatrix[indexCnt + 5] = v1;
                indexCnt += 6;
            }
        }
    }

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

    // Light
    const light = new THREE.HemisphereLight();
    light.intensity = 3.5;
    scene.add(light);

    // Geometry
    geometry.setIndex(new THREE.BufferAttribute(indexMatrix, 1));
    geometry.setAttribute('position', new THREE.BufferAttribute(verticesMatrix, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colorMatrix, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshLambertMaterial({
        vertexColors: true,
        side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // renderer.render(scene, camera);
    updateFrame(uiOption.currFrame);

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