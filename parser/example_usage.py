#!/usr/bin/env python3
"""
Example usage of the SM64 Triangle Parser

This script demonstrates how to use the parser to find triangles
by coordinates and analyze collision geometry.
"""

from parse_tris import SM64TriangleParser, SurfaceType


def main():
    """Example usage of the triangle parser"""
    # Create parser instance
    parser = SM64TriangleParser()
    
    # Parse the collision data
    parser.parse_file("../data/bitfs_tris.inc.c")
    
    print("=== SM64 Triangle Parser Example ===\n")
    
    # Display basic statistics
    print("Basic Statistics:")
    parser.print_statistics()
    print()
    
    # Example 1: Find triangles containing a specific vertex
    print("Example 1: Finding triangles containing vertex (6462, 4506, 740)")
    x, y, z = 6462, 4506, 740
    triangles = parser.find_triangles_by_vertex_coordinates(x, y, z)
    
    print(f"Found {len(triangles)} triangles containing this vertex:")
    for i, triangle in enumerate(triangles):
        print(f"  Triangle {i + 1}: {triangle.surface_type.value}")
        print(f"    V1: ({triangle.vertex1.x}, {triangle.vertex1.y}, {triangle.vertex1.z})")
        print(f"    V2: ({triangle.vertex2.x}, {triangle.vertex2.y}, {triangle.vertex2.z})")
        print(f"    V3: ({triangle.vertex3.x}, {triangle.vertex3.y}, {triangle.vertex3.z})")
    print()
    
    # Example 2: Get surface types for coordinates
    print("Example 2: Surface types at specific coordinates")
    surface_types = parser.get_surface_type_for_coordinates(x, y, z)
    print(f"Surface types at ({x}, {y}, {z}): {[st.value for st in surface_types]}")
    print()
    
    # Example 3: Find triangles by surface type
    print("Example 3: Analyzing different surface types")
    for surface_type in [SurfaceType.BURNING, SurfaceType.VERY_SLIPPERY, SurfaceType.NOT_SLIPPERY]:
        triangles = parser.get_triangles_by_surface(surface_type)
        print(f"{surface_type.value}: {len(triangles)} triangles")
        
        if triangles:
            # Show first triangle as example
            triangle = triangles[0]
            print(f"  Example triangle vertices:")
            print(f"    V1: ({triangle.vertex1.x}, {triangle.vertex1.y}, {triangle.vertex1.z})")
            print(f"    V2: ({triangle.vertex2.x}, {triangle.vertex2.y}, {triangle.vertex2.z})")
            print(f"    V3: ({triangle.vertex3.x}, {triangle.vertex3.y}, {triangle.vertex3.z})")
    print()
    
    # Example 4: Find triangles near a point
    print("Example 4: Finding triangles near a specific point")
    center_x, center_y, center_z = 0, 0, 0
    radius = 2000
    nearby_triangles = parser.find_triangles_near_point(center_x, center_y, center_z, radius)
    print(f"Found {len(nearby_triangles)} triangles within {radius} units of ({center_x}, {center_y}, {center_z})")
    print()
    
    # Example 5: Analyze vertex with tolerance
    print("Example 5: Finding triangles with coordinate tolerance")
    target_x, target_y, target_z = 6460, 4500, 740  # Slightly different coordinates
    tolerance = 50.0
    fuzzy_triangles = parser.find_triangles_by_vertex_coordinates(
        target_x, target_y, target_z, tolerance
    )
    print(f"Found {len(fuzzy_triangles)} triangles within {tolerance} units of ({target_x}, {target_y}, {target_z})")
    print()
    
    # Example 6: Export mesh for visualization
    print("Example 6: Exporting collision mesh")
    parser.export_to_obj("../data/example_collision_mesh.obj")
    print("Exported collision mesh to '../data/example_collision_mesh.obj'")
    print("You can open this file in Blender or other 3D software to visualize the collision geometry.")


if __name__ == "__main__":
    main()
