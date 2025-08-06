/**
 * File Handler Module
 * Handles loading of collision data files and sample data
 */

export class FileHandler {
    constructor(viewer) {
        this.viewer = viewer;
    }
    
    async loadSampleData() {
        // Load the default BITFS collision file
        this.loadSpecificFile('./data/bitfs_tris.inc.c');
    }
    
    async loadSpecificFile(filename) {
        try {
            const response = await fetch(`./data/${filename}`);
            if (!response.ok) {
                throw new Error(`Failed to load ${filename}`);
            }
            
            const content = await response.text();
            const collisionData = this.parseCollisionFile(content);
            this.viewer.loadCollisionData(collisionData);
            console.log(`Successfully loaded ${filename}`);
        } catch (error) {
            console.error(`Error loading ${filename}:`, error);
            
            // Fallback: try to load from root directory (legacy location)
            try {
                const response = await fetch(`../${filename}`);
                if (response.ok) {
                    const content = await response.text();
                    const collisionData = this.parseCollisionFile(content);
                    this.viewer.loadCollisionData(collisionData);
                    console.log(`Successfully loaded ${filename} from fallback location`);
                } else {
                    this.showLoadError(`Could not load ${filename}. Please check that the file exists.`);
                }
            } catch (fallbackError) {
                this.showLoadError(`Could not load ${filename}. Please check that the file exists.`);
            }
        }
    }
    
    handleFileLoad(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                if (file.name.endsWith('.json')) {
                    const data = JSON.parse(e.target.result);
                    this.viewer.loadCollisionData(data);
                } else {
                    // Parse .c/.inc.c files
                    const collisionData = this.parseCollisionFile(e.target.result);
                    this.viewer.loadCollisionData(collisionData);
                }
            } catch (error) {
                console.error('Error loading file:', error);
                alert('Error loading file: ' + error.message);
            }
        };
        
        reader.readAsText(file);
    }
    
    parseCollisionFile(content) {
        try {
            const vertices = [];
            const triangles = [];
            
            // Parse vertices first
            const vertexPattern = /COL_VERTEX\(\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/g;
            let match;
            while ((match = vertexPattern.exec(content)) !== null) {
                vertices.push({
                    x: parseInt(match[1]),
                    y: parseInt(match[2]),
                    z: parseInt(match[3])
                });
            }
            
            console.log(`Parsed ${vertices.length} vertices`);
            
            // Parse triangles with surface type tracking
            const lines = content.split('\n');
            let currentSurface = 'SURFACE_DEFAULT';
            
            for (const line of lines) {
                // Check for surface type initialization
                const surfaceMatch = line.match(/COL_TRI_INIT\(\s*([^,]+)\s*,\s*\d+\s*\)/);
                if (surfaceMatch) {
                    currentSurface = surfaceMatch[1].trim();
                    continue;
                }
                
                // Check for triangle definition
                const triMatch = line.match(/COL_TRI\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
                if (triMatch) {
                    const v1Index = parseInt(triMatch[1]);
                    const v2Index = parseInt(triMatch[2]);
                    const v3Index = parseInt(triMatch[3]);
                    
                    if (v1Index < vertices.length && v2Index < vertices.length && v3Index < vertices.length) {
                        triangles.push({
                            surface_type: currentSurface,
                            vertex1: vertices[v1Index],
                            vertex2: vertices[v2Index],
                            vertex3: vertices[v3Index]
                        });
                    }
                }
            }
            
            console.log(`Parsed ${triangles.length} triangles`);

            if (triangles.length === 0) {
                throw new Error('No valid triangles found in file');
            }
            
            // Create the data structure expected by the viewer
            const collisionData = {
                vertices: vertices,
                triangles: triangles
            };

            console.log('Collision data parsed successfully.');
            
            return collisionData;
            
        } catch (error) {
            console.error('Error parsing collision file:', error);
            throw new Error('Failed to parse collision file: ' + error.message);
        }
    }
    
    showLoadError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 0, 0, 0.9);
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            z-index: 2000;
        `;
        errorDiv.innerHTML = `
            <h3>No Data Loaded</h3>
            <p>${message}</p>
            <button onclick="this.parentElement.remove()" style="
                background: white;
                color: red;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                margin-top: 10px;
            ">OK</button>
        `;
        document.body.appendChild(errorDiv);
    }
}
