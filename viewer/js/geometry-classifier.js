/**
 * Geometry Classifier Module
 * Handles classification of triangles based on surface normals
 */

export class GeometryClassifier {
    constructor() {
        this.yThreshold = 0.01;
    }
    
    classifyTriangleGeometry(triangle) {
        const normal = this.calculateTriangleNormal(triangle);
        
        if (normal.y > this.yThreshold) {
            return 'floor';
        } else if (normal.y < -this.yThreshold) {
            return 'ceiling';
        } else {
            return 'wall';
        }
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
    
    getGeometryStats(triangles) {
        const stats = {
            floor: 0,
            wall: 0,
            ceiling: 0
        };
        
        triangles.forEach(triangle => {
            const type = this.classifyTriangleGeometry(triangle);
            stats[type]++;
        });
        
        return stats;
    }
    
    getSurfaceTypeStats(triangles) {
        const stats = {};
        
        triangles.forEach(triangle => {
            const surfaceType = triangle.surface_type || 'DEFAULT';
            stats[surfaceType] = (stats[surfaceType] || 0) + 1;
        });
        
        return stats;
    }
}
