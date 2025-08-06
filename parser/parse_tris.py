#!/usr/bin/env python3
"""
SM64 Triangle Parser

This module parses Super Mario 64 collision data files to extract triangles 
with their vertices and surface types. It can find triangles by coordinates
and provides utilities for analyzing collision geometry.
"""

import re
from typing import List, Tuple, Dict, Optional, Set
from dataclasses import dataclass
from enum import Enum


class SurfaceType(Enum):
    """Surface types found in SM64 collision data"""
    DEFAULT = "SURFACE_DEFAULT"
    BURNING = "SURFACE_BURNING"
    HANGABLE = "SURFACE_HANGABLE"
    VERY_SLIPPERY = "SURFACE_VERY_SLIPPERY"
    NOT_SLIPPERY = "SURFACE_NOT_SLIPPERY"
    # Add more surface types as needed
    

@dataclass
class Vertex:
    """Represents a 3D vertex with x, y, z coordinates"""
    x: int
    y: int
    z: int
    index: int  # Original index in the vertex list
    
    def __eq__(self, other) -> bool:
        if not isinstance(other, Vertex):
            return False
        return self.x == other.x and self.y == other.y and self.z == other.z
    
    def __hash__(self) -> int:
        return hash((self.x, self.y, self.z))
    
    def distance_to(self, other: 'Vertex') -> float:
        """Calculate Euclidean distance to another vertex"""
        return ((self.x - other.x)**2 + (self.y - other.y)**2 + (self.z - other.z)**2)**0.5


@dataclass
class Triangle:
    """Represents a triangle with three vertices and a surface type"""
    vertex1: Vertex
    vertex2: Vertex
    vertex3: Vertex
    surface_type: SurfaceType
    
    def contains_vertex(self, vertex: Vertex) -> bool:
        """Check if triangle contains the given vertex"""
        return vertex in [self.vertex1, self.vertex2, self.vertex3]
    
    def get_vertices(self) -> List[Vertex]:
        """Get all vertices of the triangle"""
        return [self.vertex1, self.vertex2, self.vertex3]
    
    def get_center(self) -> Tuple[float, float, float]:
        """Calculate the center point of the triangle"""
        x = (self.vertex1.x + self.vertex2.x + self.vertex3.x) / 3
        y = (self.vertex1.y + self.vertex2.y + self.vertex3.y) / 3
        z = (self.vertex1.z + self.vertex2.z + self.vertex3.z) / 3
        return (x, y, z)


class SM64TriangleParser:
    """Parser for SM64 collision data files"""
    
    def __init__(self):
        self.vertices: List[Vertex] = []
        self.triangles: List[Triangle] = []
        self.triangles_by_surface: Dict[SurfaceType, List[Triangle]] = {}
        
    def parse_file(self, filepath: str) -> None:
        """Parse an SM64 collision data file"""
        with open(filepath, 'r') as file:
            content = file.read()
        
        self.parse_content(content)
    
    def parse_content(self, content: str) -> None:
        """Parse SM64 collision data from string content"""
        self.vertices = []
        self.triangles = []
        self.triangles_by_surface = {}
        
        # Parse vertices
        self._parse_vertices(content)
        
        # Parse triangles
        self._parse_triangles(content)
        
        # Group triangles by surface type
        self._group_triangles_by_surface()
    
    def _parse_vertices(self, content: str) -> None:
        """Extract all vertices from the collision data"""
        # Pattern to match COL_VERTEX(x, y, z) lines with optional whitespace
        vertex_pattern = r'COL_VERTEX\(\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*\)'
        
        matches = re.findall(vertex_pattern, content)
        
        for i, (x, y, z) in enumerate(matches):
            vertex = Vertex(int(x), int(y), int(z), i)
            self.vertices.append(vertex)
    
    def _parse_triangles(self, content: str) -> None:
        """Extract all triangles with their surface types"""
        # Find all triangle initialization sections
        tri_init_pattern = r'COL_TRI_INIT\(\s*([^,]+)\s*,\s*\d+\s*\)'
        
        # Split content into lines for easier processing
        lines = content.split('\n')
        current_surface = SurfaceType.DEFAULT
        
        for line in lines:
            # Check if this line starts a new triangle section
            tri_init_match = re.search(tri_init_pattern, line)
            if tri_init_match:
                surface_name = tri_init_match.group(1).strip()
                # Try to match known surface types
                try:
                    current_surface = SurfaceType(surface_name)
                except ValueError:
                    # If unknown surface type, use default
                    current_surface = SurfaceType.DEFAULT
                continue
            
            # Check for triangle definitions
            triangle_match = re.search(r'COL_TRI\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)', line)
            if triangle_match:
                v1_idx, v2_idx, v3_idx = map(int, triangle_match.groups())
                
                # Validate vertex indices
                if (v1_idx < len(self.vertices) and 
                    v2_idx < len(self.vertices) and 
                    v3_idx < len(self.vertices)):
                    
                    triangle = Triangle(
                        self.vertices[v1_idx],
                        self.vertices[v2_idx],
                        self.vertices[v3_idx],
                        current_surface
                    )
                    self.triangles.append(triangle)
    
    def _group_triangles_by_surface(self) -> None:
        """Group triangles by their surface type"""
        self.triangles_by_surface = {}
        
        for triangle in self.triangles:
            if triangle.surface_type not in self.triangles_by_surface:
                self.triangles_by_surface[triangle.surface_type] = []
            self.triangles_by_surface[triangle.surface_type].append(triangle)
    
    def get_triangles(self) -> List[Triangle]:
        """Get all triangles"""
        return self.triangles
    
    def get_vertices(self) -> List[Vertex]:
        """Get all vertices"""
        return self.vertices
    
    def get_triangles_by_surface(self, surface_type: SurfaceType) -> List[Triangle]:
        """Get triangles of a specific surface type"""
        return self.triangles_by_surface.get(surface_type, [])
    
    def find_triangles_by_vertex_coordinates(self, x: int, y: int, z: int, 
                                           tolerance: float = 0.0) -> List[Triangle]:
        """Find triangles that contain a vertex with the given coordinates"""
        target_vertex = Vertex(x, y, z, -1)
        matching_triangles = []
        
        for triangle in self.triangles:
            for vertex in triangle.get_vertices():
                if tolerance == 0.0:
                    if vertex.x == x and vertex.y == y and vertex.z == z:
                        matching_triangles.append(triangle)
                        break
                else:
                    if vertex.distance_to(target_vertex) <= tolerance:
                        matching_triangles.append(triangle)
                        break
        
        return matching_triangles
    
    def find_triangles_near_point(self, x: float, y: float, z: float, 
                                 radius: float) -> List[Triangle]:
        """Find triangles whose center is within radius of the given point"""
        matching_triangles = []
        
        for triangle in self.triangles:
            center = triangle.get_center()
            distance = ((center[0] - x)**2 + (center[1] - y)**2 + (center[2] - z)**2)**0.5
            
            if distance <= radius:
                matching_triangles.append(triangle)
        
        return matching_triangles
    
    def get_surface_type_for_coordinates(self, x: int, y: int, z: int, 
                                       tolerance: float = 0.0) -> Set[SurfaceType]:
        """Get surface types associated with triangles containing the given coordinates"""
        triangles = self.find_triangles_by_vertex_coordinates(x, y, z, tolerance)
        return {triangle.surface_type for triangle in triangles}
    
    def print_statistics(self) -> None:
        """Print statistics about the parsed data"""
        print(f"Total vertices: {len(self.vertices)}")
        print(f"Total triangles: {len(self.triangles)}")
        print(f"Surface types found: {len(self.triangles_by_surface)}")
        
        for surface_type, triangles in self.triangles_by_surface.items():
            print(f"  {surface_type.value}: {len(triangles)} triangles")
    
    def export_to_obj(self, filename: str) -> None:
        """Export vertices and triangles to OBJ file format"""
        with open(filename, 'w') as f:
            f.write("# SM64 Collision Data\n")
            f.write(f"# {len(self.vertices)} vertices, {len(self.triangles)} triangles\n\n")
            
            # Write vertices
            for vertex in self.vertices:
                f.write(f"v {vertex.x} {vertex.y} {vertex.z}\n")
            
            f.write("\n")
            
            # Write faces (triangles) - OBJ uses 1-based indexing
            for triangle in self.triangles:
                v1_idx = triangle.vertex1.index + 1
                v2_idx = triangle.vertex2.index + 1
                v3_idx = triangle.vertex3.index + 1
                f.write(f"f {v1_idx} {v2_idx} {v3_idx}\n")


def main():
    """Example usage of the triangle parser"""
    parser = SM64TriangleParser()
    
    # Parse the collision data file
    try:
        parser.parse_file("../data/bitfs_tris.inc.c")
        print("Successfully parsed collision data!")
        print()
        
        # Print statistics
        parser.print_statistics()
        print()
        
        # Example: Find triangles containing specific coordinates
        x, y, z = 6462, 4506, 740  # Example coordinates from the file
        triangles = parser.find_triangles_by_vertex_coordinates(x, y, z)
        
        print(f"Triangles containing vertex ({x}, {y}, {z}):")
        for i, triangle in enumerate(triangles):
            print(f"  Triangle {i + 1}: {triangle.surface_type.value}")
            print(f"    V1: ({triangle.vertex1.x}, {triangle.vertex1.y}, {triangle.vertex1.z})")
            print(f"    V2: ({triangle.vertex2.x}, {triangle.vertex2.y}, {triangle.vertex2.z})")
            print(f"    V3: ({triangle.vertex3.x}, {triangle.vertex3.y}, {triangle.vertex3.z})")
            print()
        
        # Example: Get surface types for coordinates
        surface_types = parser.get_surface_type_for_coordinates(x, y, z)
        print(f"Surface types at ({x}, {y}, {z}): {[st.value for st in surface_types]}")
        print()
        
        # Example: Find triangles of a specific surface type
        burning_triangles = parser.get_triangles_by_surface(SurfaceType.BURNING)
        print(f"Found {len(burning_triangles)} burning surface triangles")
        
        # Export to OBJ file for visualization
        parser.export_to_obj("../data/collision_mesh.obj")
        print("Exported collision mesh to ../data/collision_mesh.obj")
        
    except FileNotFoundError:
        print("Error: bitfs_tris.inc.c file not found!")
    except Exception as e:
        print(f"Error parsing file: {e}")


if __name__ == "__main__":
    main()
