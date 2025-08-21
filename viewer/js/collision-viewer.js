/**
 * SM64 Triangle Parser Web Interface
 * Main JavaScript module for the collision mesh viewer
 */

import { MeshCreator } from './mesh-creator.js';
import { GeometryClassifier } from './geometry-classifier.js';
import { UIControls } from './ui-controls.js';
import { FileHandler } from './file-handler.js';

class CollisionViewer {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.collisionMesh = null;
        this.viewMode = 'surface';
        this.triangles = [];
        this.vertices = [];
        this.objects = [];
        
        this.meshCreator = new MeshCreator(this);
        this.geometryClassifier = new GeometryClassifier();
        this.uiControls = new UIControls(this);
        this.fileHandler = new FileHandler(this);
        
        this.init();
    }
    
    init() {
        this.setupThreeJS();
        this.setupLights();
        this.setupEventListeners();
        this.loadSampleData();
    }
    
    setupThreeJS() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a2e);
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(
            75, 
            window.innerWidth / window.innerHeight, 
            10, 
            50000
        );
        this.camera.position.set(0, 8000, 10000);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true 
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Fog for depth perception (reduced from original)
        this.scene.fog = new THREE.Fog(0x1a1a2e, 5000, 50000);
        
        document.getElementById('viewer').appendChild(this.renderer.domElement);
        
        // Controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.1;
        this.controls.maxDistance = 30000;
        this.controls.minDistance = 100;
    }
    
    setupLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);
        
        // Directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10000, 10000, 5000);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50000;
        directionalLight.shadow.camera.left = -10000;
        directionalLight.shadow.camera.right = 10000;
        directionalLight.shadow.camera.top = 10000;
        directionalLight.shadow.camera.bottom = -10000;
        this.scene.add(directionalLight);
        
        // Point light for fill
        const pointLight = new THREE.PointLight(0xffffff, 0.3);
        pointLight.position.set(-5000, 5000, -5000);
        this.scene.add(pointLight);
    }
    
    setupEventListeners() {
        // Window resize
        window.addEventListener('resize', () => this.onWindowResize(), false);
        
        // Animation loop
        this.animate();
    }
    
    loadCollisionData(triangleData, preserveCamera = false) {
        // Save current camera state if preserving
        let savedCameraPosition = null;
        let savedCameraTarget = null;
        if (preserveCamera && this.camera && this.controls) {
            savedCameraPosition = this.camera.position.clone();
            savedCameraTarget = this.controls.target.clone();
        }
        
        this.triangles = triangleData.triangles || [];
        this.vertices = triangleData.vertices || [];
        this.objects = triangleData.objects || [];
        
        console.log(`Loaded ${this.vertices.length} vertices, ${this.triangles.length} triangles, and ${this.objects.length} objects`);
        
        this.createMesh();
        this.uiControls.updateStats();
        
        // Handle camera positioning
        if (this.collisionMesh) {
            if (preserveCamera && savedCameraPosition && savedCameraTarget) {
                // Restore saved camera state
                this.camera.position.copy(savedCameraPosition);
                this.controls.target.copy(savedCameraTarget);
                console.log('Camera position preserved during reload');
            } else {
                // Center camera on the mesh (default behavior)
                const box = new THREE.Box3().setFromObject(this.collisionMesh);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());
                
                // Position camera with X=0, but maintain Y and Z offset based on mesh size
                this.camera.position.set(0, center.y + size.y * 0.9 + 10, center.z + size.z * 1.1);
                this.controls.target.copy(center);
            }
        }
    }
    
    createMesh() {
        // Remove existing mesh
        if (this.collisionMesh) {
            this.scene.remove(this.collisionMesh);
        }
        
        // Create main level mesh
        let mainMesh;
        if (this.viewMode === 'surface') {
            mainMesh = this.meshCreator.createSurfaceTypeMesh(this.triangles, this.vertices);
        } else {
            mainMesh = this.meshCreator.createGeometryTypeMesh(this.triangles, this.vertices);
        }
        
        // Create a group to hold both level and objects
        this.collisionMesh = new THREE.Group();
        
        if (mainMesh) {
            mainMesh.castShadow = true;
            mainMesh.receiveShadow = true;
            this.collisionMesh.add(mainMesh);
        }
        
        // Add objects at their positions
        if (this.objects && this.objects.length > 0) {
            console.log(`Adding ${this.objects.length} objects to scene`);
            
            for (const object of this.objects) {
                let objectMesh;
                if (this.viewMode === 'surface') {
                    objectMesh = this.meshCreator.createSurfaceTypeMesh(object.triangles, object.vertices);
                } else {
                    objectMesh = this.meshCreator.createGeometryTypeMesh(object.triangles, object.vertices);
                }
                
                if (objectMesh) {
                    // Position the object
                    objectMesh.position.set(object.position.x, object.position.y, object.position.z);
                    
                    // Apply rotation (convert degrees to radians)
                    objectMesh.rotation.set(
                        THREE.MathUtils.degToRad(object.position.angleX),
                        THREE.MathUtils.degToRad(object.position.angleY),
                        THREE.MathUtils.degToRad(object.position.angleZ)
                    );
                    
                    objectMesh.castShadow = true;
                    objectMesh.receiveShadow = true;
                    
                    // Store object data in mesh userData for triangle selection
                    objectMesh.traverse((child) => {
                        if (child.isMesh) {
                            child.userData.objectTriangles = object.triangles;
                            child.userData.objectPosition = object.position;
                            child.userData.objectName = object.name;
                        }
                    });
                    
                    // Add some visual distinction (slightly different material properties)
                    if (objectMesh.material) {
                        if (Array.isArray(objectMesh.material)) {
                            objectMesh.material.forEach(mat => {
                                if (mat.emissive) {
                                    mat.emissive.setRGB(0.05, 0.05, 0.05); // Slight glow
                                }
                            });
                        } else if (objectMesh.material.emissive) {
                            objectMesh.material.emissive.setRGB(0.05, 0.05, 0.05);
                        }
                    }
                    
                    // Handle child meshes for groups
                    objectMesh.traverse((child) => {
                        if (child.isMesh && child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(mat => {
                                    if (mat.emissive) {
                                        mat.emissive.setRGB(0.05, 0.05, 0.05);
                                    }
                                });
                            } else if (child.material.emissive) {
                                child.material.emissive.setRGB(0.05, 0.05, 0.05);
                            }
                        }
                    });
                    
                    this.collisionMesh.add(objectMesh);
                    console.log(`Added ${object.name} at (${object.position.x}, ${object.position.y}, ${object.position.z})`);
                }
            }
        }
        
        if (this.collisionMesh.children.length > 0) {
            this.scene.add(this.collisionMesh);
        }
    }
    
    toggleViewMode() {
        this.viewMode = this.viewMode === 'surface' ? 'geometry' : 'surface';
        this.createMesh();
        this.uiControls.updateViewModeButton();
    }
    
    exportToOBJ() {
        if (!this.triangles.length) {
            alert('No collision data loaded!');
            return;
        }
        
        let objContent = '# SM64 Collision Mesh Export\n';
        objContent += `# ${this.vertices.length} vertices, ${this.triangles.length} triangles\n\n`;
        
        // Write vertices
        this.vertices.forEach(vertex => {
            objContent += `v ${vertex.x} ${vertex.y} ${vertex.z}\n`;
        });
        
        objContent += '\n';
        
        // Write faces (OBJ uses 1-based indexing)
        this.triangles.forEach(triangle => {
            const v1 = this.vertices.findIndex(v => 
                v.x === triangle.vertex1.x && 
                v.y === triangle.vertex1.y && 
                v.z === triangle.vertex1.z
            ) + 1;
            const v2 = this.vertices.findIndex(v => 
                v.x === triangle.vertex2.x && 
                v.y === triangle.vertex2.y && 
                v.z === triangle.vertex2.z
            ) + 1;
            const v3 = this.vertices.findIndex(v => 
                v.x === triangle.vertex3.x && 
                v.y === triangle.vertex3.y && 
                v.z === triangle.vertex3.z
            ) + 1;
            
            objContent += `f ${v1} ${v2} ${v3}\n`;
        });
        
        // Download the file
        const blob = new Blob([objContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'collision_mesh.obj';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    loadSampleData() {
        this.fileHandler.loadSampleData();
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize the viewer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.collisionViewer = new CollisionViewer();
});
