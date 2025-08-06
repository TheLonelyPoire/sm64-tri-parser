# SM64 Triangle Parser

A useful tool for parsing and visualizing Super Mario 64 collision triangle data.

## Project Structure

```
SM64TriParser/
├── parser/                 # Python parsing library
│   ├── parse_tris.py      # Main SM64TriangleParser class
│   └── example_usage.py   # Example usage script
├── viewer/                 # Interactive 3D web viewer
│   ├── index.html         # Main HTML file
│   ├── css/
│   │   └── viewer-styles.css
│   └── js/
│       ├── collision-viewer.js     # Main application logic
│       ├── mesh-creator.js         # 3D mesh creation
│       ├── geometry-classifier.js  # Triangle classification
│       ├── ui-controls.js          # User interface
│       ├── file-handler.js         # File loading
│       ├── level-loader.js         # SM64 level data loading
│       └── color-config.js         # Centralized color definitions
└── data/                   # Sample collision data and configuration
    ├── levels_list.yaml   # Complete SM64 level configuration
    ├── levels/            # Local SM64 decomp level data
    ├── bitfs_tris.inc.c   # Original C format sample
```

## Python Parser Usage

The parser library allows you to extract and analyze triangle data from SM64 collision files:

```python
from parser.parse_tris import SM64TriangleParser

# Create parser instance
parser = SM64TriangleParser()

# Parse collision data
parser.parse_file("data/bitfs_tris.inc.c")

# Find triangles containing specific coordinates
triangles = parser.find_triangles_by_vertex_coordinates(6462, 4506, 740)

# Get surface types at coordinates
surface_types = parser.get_surface_type_for_coordinates(6462, 4506, 740)

# Export to OBJ format
parser.export_to_obj("collision_mesh.obj")
```

## Web Viewer Features
The interactive 3D viewer enables you to load and explore collision data from all SM64 levels/areas.
Surfaces can be viewed by orientation (e.g. Walls, Floors, Ceilings) or by Surface Type (e.g. DEFAULT,
SLIPPERY, BURNING, etc.).

## Quick Start

### Python Parser
```bash
cd parser
python example_usage.py
```

### Web Viewer
1. Open `viewer/index.html` in a web browser
2. Select a level from the comprehensive dropdown menu
3. Explore collision data from all 15 main courses, castle areas, and special levels
4. Use mouse controls to navigate the 3D visualization
5. Toggle between surface types and geometry classification
6. Hover over triangles for highlighting, double-click for detailed information

## Supported SM64 Levels

The viewer includes collision data access for:

**Main Courses**: Bob-omb Battlefield, Whomp's Fortress, Jolly Roger Bay, Cool Cool Mountain, Big Boo's Haunt, Hazy Maze Cave, Lethal Lava Land, Shifting Sand Land, Dire Dire Docks, Snowman's Land, Wet-Dry World, Tall Tall Mountain, Tiny-Huge Island, Tick Tock Clock, Rainbow Ride

**Castle Areas**: Castle Grounds, Castle Interior, Castle Courtyard

**Special Levels**: Bowser stages, Cap levels, Secret areas, Boss arenas

## Controls (Web Viewer)

- **Left click + drag**: Rotate view around target
- **Right click + drag**: Pan camera position
- **Mouse wheel**: Zoom in/out
- **Mouse hover**: Highlight individual triangles
- **Double-click triangle**: Show detailed surface and geometry information
- **View mode toggle**: Switch between surface types and geometry classification
- **Level dropdown**: Select from comprehensive list of SM64 levels/areas
- **Load custom file**: Select a valid `collision.inc.c` file from your computer to view the surfaces

