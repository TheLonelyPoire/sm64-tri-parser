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
    
    loadCollisionData(triangleData) {
        this.triangles = triangleData.triangles || [];
        this.vertices = triangleData.vertices || [];
        
        console.log(`Loaded ${this.vertices.length} vertices and ${this.triangles.length} triangles`);
        
        this.createMesh();
        this.uiControls.updateStats();
        
        // Center camera on the mesh
        if (this.collisionMesh) {
            const box = new THREE.Box3().setFromObject(this.collisionMesh);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            
            // Position camera with X=0, but maintain Y and Z offset based on mesh size
            this.camera.position.set(0, center.y + size.y * 0.9 + 10, center.z + size.z * 1.1);
            this.controls.target.copy(center);
        }
    }
    
    createMesh() {
        // Remove existing mesh
        if (this.collisionMesh) {
            this.scene.remove(this.collisionMesh);
        }
        
        if (this.viewMode === 'surface') {
            this.collisionMesh = this.meshCreator.createSurfaceTypeMesh(this.triangles, this.vertices);
        } else {
            this.collisionMesh = this.meshCreator.createGeometryTypeMesh(this.triangles, this.vertices);
        }
        
        if (this.collisionMesh) {
            this.collisionMesh.castShadow = true;
            this.collisionMesh.receiveShadow = true;
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
