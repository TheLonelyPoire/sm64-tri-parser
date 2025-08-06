/**
 * Collision File Manager
 * Handles loading of multiple collision files from a directory
 */

export class CollisionFileManager {
    constructor(viewer) {
        this.viewer = viewer;
        this.availableFiles = [
            {
                name: 'Bowser in the Fire Sea',
                filename: 'bitfs_tris.inc.c',
                description: 'Lava level with burning surfaces'
            }
            // Future files can be added here:
            // {
            //     name: 'Bob-omb Battlefield',
            //     filename: 'bob_tris.inc.c', 
            //     description: 'Grassy battlefield'
            // }
        ];
    }
    
    getAvailableFiles() {
        return this.availableFiles;
    }
    
    async loadCollisionFile(filename) {
        try {
            const response = await fetch(`./data/${filename}`);
            if (!response.ok) {
                throw new Error(`Failed to load ${filename}`);
            }
            
            const content = await response.text();
            return this.parseCollisionFile(content);
        } catch (error) {
            console.error(`Error loading ${filename}:`, error);
            throw error;
        }
    }
    
    parseCollisionFile(content) {
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
        
        return {
            vertices: vertices,
            triangles: triangles
        };
    }
}
