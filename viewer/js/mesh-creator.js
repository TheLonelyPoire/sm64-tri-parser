/**
 * Mesh Creator Module
 * Handles creation of Three.js meshes for different viewing modes
 */

import { ColorConfig } from './color-config.js';

export class MeshCreator {
    constructor(viewer) {
        this.viewer = viewer;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.hoveredTriangle = null;
        this.hoveredTriangleMesh = null;
        this.isOrbiting = false;
        this.mouseEventsSetup = false;
    }
    
    setupMouseEvents() {
        // Only setup once and only after renderer is ready
        if (this.mouseEventsSetup || !this.viewer.renderer) return;
        
        const canvas = this.viewer.renderer.domElement;
        
        // Track orbit controls state
        this.viewer.controls.addEventListener('start', () => {
            this.isOrbiting = true;
        });
        
        this.viewer.controls.addEventListener('end', () => {
            // Add a small delay to prevent click events immediately after orbiting
            setTimeout(() => {
                this.isOrbiting = false;
            }, 100);
        });
        
        // Mouse move for hover effects
        canvas.addEventListener('mousemove', (event) => {
            if (this.isOrbiting) return;
            
            this.updateMousePosition(event);
            this.handleHover();
        });
        
        // Mouse click for triangle selection
        canvas.addEventListener('click', (event) => {
            if (this.isOrbiting) return;
            
            this.updateMousePosition(event);
            this.handleTriangleSelection();
        });
        
        // Add cursor style changes
        canvas.style.cursor = 'crosshair';
        
        // Reset hover when mouse leaves canvas
        canvas.addEventListener('mouseleave', () => {
            this.resetHover();
        });
        
        this.mouseEventsSetup = true;
    }
    
    updateMousePosition(event) {
        const rect = this.viewer.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }
    
    handleHover() {
        if (!this.viewer.collisionMesh) return;
        
        this.raycaster.setFromCamera(this.mouse, this.viewer.camera);
        const intersects = this.raycaster.intersectObject(this.viewer.collisionMesh, true);
        
        if (intersects.length > 0) {
            const intersection = intersects[0];
            const mesh = intersection.object;
            const faceIndex = intersection.faceIndex;
            
            // Change cursor to indicate clickable triangle
            this.viewer.renderer.domElement.style.cursor = 'pointer';
            
            // Check if we're hovering over a different triangle
            if (this.hoveredTriangle !== faceIndex || this.hoveredTriangleMesh !== mesh) {
                this.resetHover();
                this.hoveredTriangle = faceIndex;
                this.hoveredTriangleMesh = mesh;
                this.highlightTriangle(mesh, faceIndex);
            }
        } else {
            // Reset cursor when not hovering over triangles
            this.viewer.renderer.domElement.style.cursor = 'crosshair';
            this.resetHover();
        }
    }
    
    highlightTriangle(mesh, faceIndex) {
        // Create a highlighted triangle mesh
        const geometry = new THREE.BufferGeometry();
        const originalGeometry = mesh.geometry;
        
        // Get the position attribute
        const positions = originalGeometry.attributes.position.array;
        const normals = originalGeometry.attributes.normal.array;
        
        // Extract the specific triangle's vertices (each triangle has 3 vertices * 3 coordinates)
        const triangleStart = faceIndex * 9; // 3 vertices * 3 coordinates per vertex
        const trianglePositions = positions.slice(triangleStart, triangleStart + 9);
        const triangleNormals = normals.slice(triangleStart, triangleStart + 9);
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(trianglePositions, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(triangleNormals, 3));
        
        // Create highlighted material (lighter version of original)
        const originalColor = new THREE.Color(mesh.material.color);
        const highlightColor = originalColor.clone().multiplyScalar(1.5); // Brighter
        
        const highlightMaterial = new THREE.MeshLambertMaterial({
            color: highlightColor,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9
        });
        
        // Create the highlight mesh
        this.highlightMesh = new THREE.Mesh(geometry, highlightMaterial);
        this.highlightMesh.position.copy(mesh.position);
        this.highlightMesh.rotation.copy(mesh.rotation);
        this.highlightMesh.scale.copy(mesh.scale);
        
        // Add to scene
        this.viewer.scene.add(this.highlightMesh);
    }
    
    resetHover() {
        if (this.highlightMesh) {
            this.viewer.scene.remove(this.highlightMesh);
            this.highlightMesh.geometry.dispose();
            this.highlightMesh.material.dispose();
            this.highlightMesh = null;
        }
        this.hoveredTriangle = null;
        this.hoveredTriangleMesh = null;
    }
    
    handleTriangleSelection() {
        if (!this.viewer.collisionMesh) return;
        
        this.raycaster.setFromCamera(this.mouse, this.viewer.camera);
        const intersects = this.raycaster.intersectObject(this.viewer.collisionMesh, true);
        
        if (intersects.length > 0) {
            const intersection = intersects[0];
            const mesh = intersection.object;
            const triangleIndex = intersection.faceIndex;
            
            // Find the triangle data based on the mesh and face index
            const triangleData = this.getTriangleDataFromIntersection(mesh, triangleIndex);
            
            if (triangleData) {
                this.showTriangleInfo(triangleData, intersection.point);
            }
        }
    }
    
    getTriangleDataFromIntersection(mesh, faceIndex) {
        // Get the surface type or geometry type from the mesh name or userData
        let surfaceType = mesh.userData.surfaceType || mesh.userData.geometryType || 'UNKNOWN';
        
        // For surface view, find triangles with this surface type
        if (this.viewer.viewMode === 'surface') {
            const trianglesOfType = this.viewer.triangles.filter(tri => 
                (tri.surface_type || 'DEFAULT') === surfaceType
            );
            if (trianglesOfType[faceIndex]) {
                return trianglesOfType[faceIndex];
            }
        } else {
            // For geometry view, find triangles of this geometry type
            const trianglesOfType = this.viewer.triangles.filter(tri => {
                // Use SM64-style normal calculation for consistency
                const normal = this.calculateTriangleNormalSM64Style(tri);
                const geometryType = this.classifyTriangleGeometry(normal);
                return geometryType === surfaceType;
            });
            if (trianglesOfType[faceIndex]) {
                return trianglesOfType[faceIndex];
            }
        }
        
        return null;
    }
    
    showTriangleInfo(triangle, point) {
        // Remove existing info panel
        const existingPanel = document.getElementById('triangle-info');
        if (existingPanel) {
            existingPanel.remove();
        }
        
        // Create info panel
        const infoPanel = document.createElement('div');
        infoPanel.id = 'triangle-info';
        infoPanel.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 20px;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            z-index: 2000;
            max-width: 400px;
            border: 2px solid #4CAF50;
        `;
        
        const surfaceType = triangle.surface_type || 'DEFAULT';
        const normalSM64 = this.calculateTriangleNormalSM64Style(triangle);
        const normalTrue = this.calculateTriangleNormal(triangle);
        const geometryType = this.classifyTriangleGeometry(normalSM64);
        
        infoPanel.innerHTML = `
            <h3 style="margin: 0 0 15px 0; color: #4CAF50;">Triangle Information</h3>
            <strong>Surface Type:</strong> ${surfaceType.replace(/_/g, ' ')}<br>
            <strong>Geometry Type:</strong> ${geometryType.charAt(0).toUpperCase() + geometryType.slice(1)}<br><br>
            <strong>Vertices:</strong><br>
            V1: (${triangle.vertex1.x}, ${triangle.vertex1.y}, ${triangle.vertex1.z})<br>
            V2: (${triangle.vertex2.x}, ${triangle.vertex2.y}, ${triangle.vertex2.z})<br>
            V3: (${triangle.vertex3.x}, ${triangle.vertex3.y}, ${triangle.vertex3.z})<br><br>
            <strong style="color: #FF6B6B;">SM64-Style Normal:</strong><br>
            <strong>Normal X:</strong> ${normalSM64.x.toFixed(10)}<br>
            <strong>Normal Y:</strong> ${normalSM64.y.toFixed(10)}<br>
            <strong>Normal Z:</strong> ${normalSM64.z.toFixed(10)}<br><br>
            <strong style="color: #FFD700;">"True" Normal:</strong><br>
            <strong>Normal X:</strong> ${normalTrue.x.toFixed(10)}<br>
            <strong>Normal Y:</strong> ${normalTrue.y.toFixed(10)}<br>
            <strong>Normal Z:</strong> ${normalTrue.z.toFixed(10)}<br><br>
            <strong>Clicked Point:</strong> (${point.x.toFixed(1)}, ${point.y.toFixed(1)}, ${point.z.toFixed(1)})<br><br>
                        <button onclick="document.getElementById('triangle-info').remove()" 
                    style="background: #4CAF50; color: white; border: none; padding: 8px 15px; 
                           border-radius: 4px; cursor: pointer; font-size: 12px;">Close</button>
        `;
        
        document.body.appendChild(infoPanel);
    }
    
    createSurfaceTypeMesh(triangles, vertices) {
        // Setup mouse events if not already done
        this.setupMouseEvents();
        
        const geometryGroups = this.groupTrianglesBySurfaceType(triangles);
        const meshGroup = new THREE.Group();
        
        for (const [surfaceType, triangleGroup] of Object.entries(geometryGroups)) {
            if (triangleGroup.length === 0) continue;
            
            const geometry = new THREE.BufferGeometry();
            const positions = [];
            const normals = [];
            
            triangleGroup.forEach(triangle => {
                // Add vertices for this triangle
                positions.push(
                    triangle.vertex1.x, triangle.vertex1.y, triangle.vertex1.z,
                    triangle.vertex2.x, triangle.vertex2.y, triangle.vertex2.z,
                    triangle.vertex3.x, triangle.vertex3.y, triangle.vertex3.z
                );
                
                // Calculate and add normals using SM64-style calculation
                const normal = this.calculateTriangleNormalSM64Style(triangle);
                normals.push(
                    normal.x, normal.y, normal.z,
                    normal.x, normal.y, normal.z,
                    normal.x, normal.y, normal.z
                );
            });
            
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
            
            const material = new THREE.MeshLambertMaterial({
                color: ColorConfig.surfaceTypes[surfaceType] || ColorConfig.surfaceTypes.DEFAULT,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.8
            });
            
            const mesh = new THREE.Mesh(geometry, material);
            mesh.userData.surfaceType = surfaceType; // Store for triangle selection
            meshGroup.add(mesh);
        }
        
        return meshGroup;
    }
    
    createGeometryTypeMesh(triangles, vertices) {
        // Setup mouse events if not already done
        this.setupMouseEvents();
        
        const geometryGroups = this.groupTrianglesByGeometryType(triangles);
        const meshGroup = new THREE.Group();
        
        for (const [geometryType, triangleGroup] of Object.entries(geometryGroups)) {
            if (triangleGroup.length === 0) continue;
            
            const geometry = new THREE.BufferGeometry();
            const positions = [];
            const normals = [];
            
            triangleGroup.forEach(triangle => {
                // Add vertices for this triangle
                positions.push(
                    triangle.vertex1.x, triangle.vertex1.y, triangle.vertex1.z,
                    triangle.vertex2.x, triangle.vertex2.y, triangle.vertex2.z,
                    triangle.vertex3.x, triangle.vertex3.y, triangle.vertex3.z
                );
                
                // Calculate and add normals using SM64-style calculation
                const normal = this.calculateTriangleNormalSM64Style(triangle);
                normals.push(
                    normal.x, normal.y, normal.z,
                    normal.x, normal.y, normal.z,
                    normal.x, normal.y, normal.z
                );
            });
            
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
            
            const material = new THREE.MeshLambertMaterial({
                color: ColorConfig.geometryTypes[geometryType] || ColorConfig.geometryTypes.floor,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.8
            });
            
            const mesh = new THREE.Mesh(geometry, material);
            mesh.userData.geometryType = geometryType; // Store for triangle selection
            meshGroup.add(mesh);
        }
        
        return meshGroup;
    }
    
    groupTrianglesBySurfaceType(triangles) {
        const groups = {};
        
        triangles.forEach(triangle => {
            const surfaceType = triangle.surface_type || 'DEFAULT';
            if (!groups[surfaceType]) {
                groups[surfaceType] = [];
            }
            groups[surfaceType].push(triangle);
        });
        
        return groups;
    }
    
    groupTrianglesByGeometryType(triangles) {
        const groups = {
            floor: [],
            wall: [],
            ceiling: []
        };
        
        triangles.forEach(triangle => {
            // Use SM64-style normal calculation for geometry classification
            const normal = this.calculateTriangleNormalSM64Style(triangle);
            const geometryType = this.classifyTriangleGeometry(normal);
            groups[geometryType].push(triangle);
        });
        
        return groups;
    }
    
    calculateTriangleNormal(triangle) {
        const v1 = new THREE.Vector3(triangle.vertex1.x, triangle.vertex1.y, triangle.vertex1.z);
        const v2 = new THREE.Vector3(triangle.vertex2.x, triangle.vertex2.y, triangle.vertex2.z);
        const v3 = new THREE.Vector3(triangle.vertex3.x, triangle.vertex3.y, triangle.vertex3.z);
        
        const edge1 = v2.clone().sub(v1);
        const edge2 = v3.clone().sub(v1);
        const normal = edge1.cross(edge2).normalize();
        
        return normal;
    }
    
    // Calculate triangle normal using SM64-style fixed-point precision
    calculateTriangleNormalSM64Style(triangle) {
        // Helper function to simulate 32-bit float precision
        function toFloat32(value) {
            const buffer = new ArrayBuffer(4);
            const view = new Float32Array(buffer);
            view[0] = value;
            return view[0];
        }
        
        // Helper function to simulate 32-bit signed integer
        function toInt32(value) {
            return value | 0; // Bitwise OR forces 32-bit signed integer
        }
        
        // Extract vertices exactly as SM64 does (as 32-bit signed integers)
        const x1 = toInt32(triangle.vertex1.x);
        const y1 = toInt32(triangle.vertex1.y);
        const z1 = toInt32(triangle.vertex1.z);
        
        const x2 = toInt32(triangle.vertex2.x);
        const y2 = toInt32(triangle.vertex2.y);
        const z2 = toInt32(triangle.vertex2.z);
        
        const x3 = toInt32(triangle.vertex3.x);
        const y3 = toInt32(triangle.vertex3.y);
        const z3 = toInt32(triangle.vertex3.z);
        
        // SM64's cross product: (v2 - v1) x (v3 - v2)
        // All intermediate calculations as 32-bit floats
        let nx = toFloat32(toFloat32(y2 - y1) * toFloat32(z3 - z2) - toFloat32(z2 - z1) * toFloat32(y3 - y2));
        let ny = toFloat32(toFloat32(z2 - z1) * toFloat32(x3 - x2) - toFloat32(x2 - x1) * toFloat32(z3 - z2));
        let nz = toFloat32(toFloat32(x2 - x1) * toFloat32(y3 - y2) - toFloat32(y2 - y1) * toFloat32(x3 - x2));
        
        // Calculate magnitude using 32-bit float precision
        let mag = toFloat32(Math.sqrt(toFloat32(toFloat32(nx * nx) + toFloat32(ny * ny) + toFloat32(nz * nz))));
        
        // SM64's safety check
        if (mag < 0.0001) {
            return { x: 0, y: 1, z: 0 }; // Default up vector
        }
        
        // SM64 does: mag = (f32)(1.0 / mag); then multiplies
        mag = toFloat32(1.0 / mag);
        nx = toFloat32(nx * mag);
        ny = toFloat32(ny * mag);
        nz = toFloat32(nz * mag);
        
        return { x: nx, y: ny, z: nz };
    }
    
    classifyTriangleGeometry(normal) {
        const yThreshold = 0.01;
        
        if (normal.y > yThreshold) {
            return 'floor';
        } else if (normal.y < -yThreshold) {
            return 'ceiling';
        } else {
            return 'wall';
        }
    }
}
