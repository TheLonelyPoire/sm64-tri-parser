/**
 * Shader Loader Module
 * Handles loading and managing GLSL shaders for triangle highlighting
 */

export class ShaderLoader {
    constructor() {
        this.collisionMaterial = null;
        this.hoveredTriangleIndex = -1;
        this.init();
    }
    
    init() {
        // Create the collision material with embedded shaders
        this.collisionMaterial = this.createCollisionMaterial();
    }
    
    createCollisionMaterial() {
        // Embedded vertex shader
        const vertexShader = `
            attribute float triangleIndex;
            attribute vec3 baseColor;
            
            uniform float hoveredTriangleIndex;
            
            varying vec3 vColor;
            varying vec3 vNormal;
            varying float vIsHovered;
            varying float vFogDepth;
            
            void main() {
                // Calculate if this triangle is hovered
                vIsHovered = (triangleIndex == hoveredTriangleIndex) ? 1.0 : 0.0;
                
                // Pass base color to fragment shader for processing
                vColor = baseColor;
                vNormal = normalize(normalMatrix * normal);
                
                // Calculate fog depth (distance from camera)
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                vFogDepth = -mvPosition.z;
                
                gl_Position = projectionMatrix * mvPosition;
            }
        `;
        
        // Embedded fragment shader - replicate your scene's exact lighting
        const fragmentShader = `
            uniform vec3 ambientLightColor;
            uniform float ambientLightIntensity;
            uniform vec3 directionalLightColor;
            uniform float directionalLightIntensity;
            uniform vec3 directionalLightDirection;
            uniform vec3 pointLightColor;
            uniform float pointLightIntensity;
            
            varying vec3 vColor;
            varying vec3 vNormal;
            varying float vIsHovered;
            
            void main() {
                // Replicate your scene's lighting exactly with two-sided support
                vec3 normal = normalize(vNormal);
                vec3 lightDir = normalize(-directionalLightDirection);
                
                // Two-sided Lambert calculation (abs ensures both sides are lit)
                float lambertian = abs(dot(normal, lightDir));
                
                // Combine all lights from your scene:
                // - AmbientLight: 0x404040 with intensity 0.6
                // - DirectionalLight: 0xffffff with intensity 0.8  
                // - PointLight: 0xffffff with intensity 0.3 (simplified as additional ambient)
                vec3 ambient = ambientLightColor * ambientLightIntensity;
                vec3 directional = directionalLightColor * directionalLightIntensity * lambertian;
                vec3 point = pointLightColor * pointLightIntensity; // Simplified point light as additional ambient
                
                vec3 totalLighting = ambient + directional + point;
                vec3 litColor = vColor * totalLighting;
                
                // Apply the brightness multiplier to the final lit color (prevents desaturation)
                if (vIsHovered > 0.5) {
                    litColor = litColor * 1.35; // Same as originalColor.clone().multiplyScalar(1.5)
                }
                
                // Use different opacity for hovered vs normal (0.9 vs 0.8, same as original)
                float alpha = vIsHovered > 0.5 ? 0.9 : 0.8;
                
                gl_FragColor = vec4(litColor, alpha);
            }
        `;
        
        // Create the shader material with your scene's exact lighting values
        const material = new THREE.ShaderMaterial({
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            uniforms: {
                hoveredTriangleIndex: { value: -1 },
                // Replicate your scene's lighting exactly:
                // AmbientLight: 0x404040 with intensity 0.6
                ambientLightColor: { value: new THREE.Color(0x404040) },
                ambientLightIntensity: { value: 0.6 },
                // DirectionalLight: 0xc0c0c0 with intensity 0.8, position (10000, 10000, 5000)
                directionalLightColor: { value: new THREE.Color(0xc0c0c0) },
                directionalLightIntensity: { value: 0.8 },
                directionalLightDirection: { value: new THREE.Vector3(10000, 10000, 5000).normalize() },
                // PointLight: 0xffffff with intensity 0.3 (simplified as additional ambient)
                pointLightColor: { value: new THREE.Color(0xffffff) },
                pointLightIntensity: { value: 0.3 }
            },
            side: THREE.DoubleSide,
            transparent: true
        });
        
        return material;
    }
    
    getCollisionMaterial() {
        // Return a clone so each mesh can have its own material instance
        return this.collisionMaterial.clone();
    }
    
    updateHoveredTriangle(triangleIndex) {
        this.hoveredTriangleIndex = triangleIndex;
        
        // Update all materials that use this shader
        if (this.collisionMaterial) {
            this.collisionMaterial.uniforms.hoveredTriangleIndex.value = triangleIndex;
            
            // Also update any cloned materials (we'll need to track these)
            // For now, we'll handle this in the mesh creator
        }
    }
    
    updateMaterialHover(material, triangleIndex) {
        if (material && material.uniforms && material.uniforms.hoveredTriangleIndex) {
            material.uniforms.hoveredTriangleIndex.value = triangleIndex;
        }
    }
    
    dispose() {
        if (this.collisionMaterial) {
            this.collisionMaterial.dispose();
            this.collisionMaterial = null;
        }
    }
}
