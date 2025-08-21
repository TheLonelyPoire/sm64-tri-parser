/**
 * Mesh Creator Module
 * Handles creation of Three.js meshes for different viewing modes
 */

import { ColorConfig } from './color-config.js';
import { ShaderLoader } from './shader-loader.js';

export class MeshCreator {
    constructor(viewer) {
        this.viewer = viewer;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.hoveredTriangleIndex = -1;
        this.hoveredMesh = null;
        this.activeMaterials = []; // Track materials for shader updates
        this.isOrbiting = false;
        this.mouseEventsSetup = false;
        
        // Initialize shader loader
        this.shaderLoader = new ShaderLoader();
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
        
        // Touch events for mobile support
        canvas.addEventListener('touchstart', (event) => {
            if (event.touches.length === 1) {
                // Single finger touch - treat as click for triangle selection
                event.preventDefault();
                this.updateTouchPosition(event.touches[0]);
            }
        }, { passive: false });
        
        canvas.addEventListener('touchend', (event) => {
            if (!this.isOrbiting && event.changedTouches.length === 1) {
                // Single finger tap - select triangle
                event.preventDefault();
                this.updateTouchPosition(event.changedTouches[0]);
                this.handleTriangleSelection();
            }
        }, { passive: false });
        
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
    
    updateTouchPosition(touch) {
        const rect = this.viewer.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
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
            
            // Get the global triangle index for shader-based highlighting
            const globalTriangleIndex = this.getGlobalTriangleIndex(mesh, faceIndex);
            
            // Check if we're hovering over a different triangle or different mesh
            if (this.hoveredTriangleIndex !== globalTriangleIndex || this.hoveredMesh !== mesh) {
                // Reset previous mesh
                this.resetHover();
                
                this.hoveredTriangleIndex = globalTriangleIndex;
                this.hoveredMesh = mesh;
                this.updateShaderHighlight(mesh, globalTriangleIndex);
            }
        } else {
            // Reset cursor when not hovering over triangles
            this.viewer.renderer.domElement.style.cursor = 'crosshair';
            this.resetHover();
        }
    }
    
    getGlobalTriangleIndex(mesh, faceIndex) {
        // For shader-based meshes, use the triangle index attribute
        if (mesh.geometry.attributes.triangleIndex) {
            const triangleIndices = mesh.geometry.attributes.triangleIndex.array;
            const vertexIndex = faceIndex * 3; // Each face has 3 vertices
            if (vertexIndex < triangleIndices.length) {
                return triangleIndices[vertexIndex];
            }
        }
        return -1;
    }
    
    updateShaderHighlight(mesh, triangleIndex) {
        // Update only the specific mesh's material
        if (mesh && mesh.material && mesh.material.uniforms && mesh.material.uniforms.hoveredTriangleIndex) {
            mesh.material.uniforms.hoveredTriangleIndex.value = triangleIndex;
        }
    }
    
    resetHover() {
        if (this.hoveredMesh && this.hoveredTriangleIndex !== -1) {
            // Reset the previously hovered mesh
            this.updateShaderHighlight(this.hoveredMesh, -1);
            this.hoveredTriangleIndex = -1;
            this.hoveredMesh = null;
        }
    }
    
    // Clear material tracking and reset shader highlights
    clearMaterialCaches() {
        // Dispose of tracked materials
        this.activeMaterials.forEach(material => {
            material.dispose();
        });
        this.activeMaterials = [];
        
        // Reset any active hover
        this.resetHover();
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
        // Check if this mesh represents object data
        if (mesh.userData.objectTriangles && mesh.userData.objectPosition) {
            // For objects, get the triangle directly from stored object data
            const objectTriangles = mesh.userData.objectTriangles;
            if (faceIndex < objectTriangles.length) {
                const originalTriangle = objectTriangles[faceIndex];
                
                // Create a transformed triangle with world coordinates for display
                const position = mesh.userData.objectPosition;
                const transformedTriangle = {
                    surface_type: originalTriangle.surface_type,
                    vertex1: this.transformVertex(originalTriangle.vertex1, position),
                    vertex2: this.transformVertex(originalTriangle.vertex2, position),
                    vertex3: this.transformVertex(originalTriangle.vertex3, position),
                    isObject: true,
                    objectName: mesh.userData.objectName || 'Unknown Object'
                };
                
                return transformedTriangle;
            }
        }
        
        // For shader-based meshes, use the triangle index attribute to get the exact triangle
        if (mesh.geometry.attributes.triangleIndex) {
            const triangleIndices = mesh.geometry.attributes.triangleIndex.array;
            const vertexIndex = faceIndex * 3; // Each face has 3 vertices
            
            if (vertexIndex < triangleIndices.length) {
                const triangleIndex = triangleIndices[vertexIndex];
                
                // Return the triangle directly from the viewer's triangle array
                if (triangleIndex >= 0 && triangleIndex < this.viewer.triangles.length) {
                    return this.viewer.triangles[triangleIndex];
                }
            }
        }
        
        // Fallback to legacy method for non-shader meshes (objects, etc.)
        let surfaceType = mesh.userData.surfaceType || mesh.userData.geometryType || 'UNKNOWN';
        
        // For surface view, find triangles with this surface type
        if (this.viewer.viewMode === 'surface') {
            const trianglesOfType = this.viewer.triangles.filter(tri => 
                (tri.surface_type || 'DEFAULT') === surfaceType
            );
            if (faceIndex < trianglesOfType.length) {
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
            if (faceIndex < trianglesOfType.length) {
                return trianglesOfType[faceIndex];
            }
        }
        
        return null;
    }

    // Helper function to transform a vertex by object position and rotation
    transformVertex(vertex, objectPosition) {
        // Create transformation matrix
        const matrix = new THREE.Matrix4();
        matrix.makeRotationFromEuler(new THREE.Euler(
            THREE.MathUtils.degToRad(objectPosition.angleX),
            THREE.MathUtils.degToRad(objectPosition.angleY),
            THREE.MathUtils.degToRad(objectPosition.angleZ)
        ));
        matrix.setPosition(objectPosition.x, objectPosition.y, objectPosition.z);
        
        // Transform vertex
        const vec = new THREE.Vector3(vertex.x, vertex.y, vertex.z);
        vec.applyMatrix4(matrix);
        
        return {
            x: Math.round(vec.x * 100) / 100, // Round for cleaner display
            y: Math.round(vec.y * 100) / 100,
            z: Math.round(vec.z * 100) / 100
        };
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
            max-width: 500px;
            border: 2px solid #4CAF50;
        `;
        
        const surfaceType = triangle.surface_type || 'DEFAULT';
        const normalSM64 = this.calculateTriangleNormalSM64Style(triangle);
        const normalTrue = this.calculateTriangleNormal(triangle);
        const geometryType = this.classifyTriangleGeometry(normalSM64);
        
        let title = 'Triangle Information';
        let extraInfo = '';
        
        if (triangle.isObject) {
            title = `Object Triangle: ${triangle.objectName}`;
            extraInfo = `
                <div style="background: rgba(76, 175, 80, 0.2); padding: 8px; border-radius: 4px; margin-bottom: 10px;">
                    <strong style="color: #4CAF50;">📦 Object Information</strong><br>
                    This triangle belongs to a positioned object.<br>
                    Coordinates shown are world positions.
                </div>
            `;
        }
        
        infoPanel.innerHTML = `
            <h3 style="margin: 0 0 15px 0; color: #4CAF50;">${title}</h3>
            ${extraInfo}
            <strong>Surface Type:</strong> ${surfaceType.replace(/_/g, ' ')}<br>
            <strong>Geometry Type:</strong> ${geometryType.charAt(0).toUpperCase() + geometryType.slice(1)}<br><br>
            <strong>Vertices ${triangle.isObject ? '(World Coordinates)' : ''}:</strong><br>
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
        
        // Create a single geometry with all triangles
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const normals = [];
        const colors = [];
        const triangleIndices = [];
        
        triangles.forEach((triangle, triangleIndex) => {
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
            
            // Get surface type color
            const surfaceType = triangle.surface_type || 'DEFAULT';
            const colorHex = ColorConfig.surfaceTypes[surfaceType] || ColorConfig.surfaceTypes.DEFAULT;
            const color = new THREE.Color(colorHex);
            
            // Add colors for all 3 vertices of this triangle
            colors.push(
                color.r, color.g, color.b,
                color.r, color.g, color.b,
                color.r, color.g, color.b
            );
            
            // Add triangle index for all 3 vertices of this triangle
            triangleIndices.push(
                triangleIndex, triangleIndex, triangleIndex
            );
        });
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('baseColor', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setAttribute('triangleIndex', new THREE.Float32BufferAttribute(triangleIndices, 1));
        
        // Get shader material and track it
        const material = this.shaderLoader.getCollisionMaterial();
        this.activeMaterials.push(material);
        
        const mesh = new THREE.Mesh(geometry, material);
        return mesh;
    }
    
    createGeometryTypeMesh(triangles, vertices) {
        // Setup mouse events if not already done
        this.setupMouseEvents();
        
        // Create a single geometry with all triangles
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const normals = [];
        const colors = [];
        const triangleIndices = [];
        
        triangles.forEach((triangle, triangleIndex) => {
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
            
            // Classify geometry type and get color
            const geometryType = this.classifyTriangleGeometry(normal);
            const colorHex = ColorConfig.geometryTypes[geometryType] || ColorConfig.geometryTypes.floor;
            const color = new THREE.Color(colorHex);
            
            // Add colors for all 3 vertices of this triangle
            colors.push(
                color.r, color.g, color.b,
                color.r, color.g, color.b,
                color.r, color.g, color.b
            );
            
            // Add triangle index for all 3 vertices of this triangle
            triangleIndices.push(
                triangleIndex, triangleIndex, triangleIndex
            );
        });
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('baseColor', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setAttribute('triangleIndex', new THREE.Float32BufferAttribute(triangleIndices, 1));
        
        // Get shader material and track it
        const material = this.shaderLoader.getCollisionMaterial();
        this.activeMaterials.push(material);
        
        const mesh = new THREE.Mesh(geometry, material);
        return mesh;
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
