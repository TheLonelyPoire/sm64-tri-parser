/**
 * Local Level Loader
 * Loads collision files from the local data/levels directory
 */

export class LevelLoader {
    constructor() {
        this.levelsPath = './data/levels';
        this.yamlPath = './data/levels_list.yaml';
        this.collisionFiles = [];
    }

    async fetchCollisionFiles() {
        try {
            console.log('Loading SM64 level data from YAML...');
            
            // Load and parse the YAML configuration
            this.collisionFiles = await this.loadFromYAML();
            
            console.log(`Found ${this.collisionFiles.length} collision files`);
            return this.collisionFiles;
            
        } catch (error) {
            console.error('Error fetching collision files:', error);
            // Fallback to hardcoded list if YAML fails
            return this.getFallbackList();
        }
    }

    async loadFromYAML() {
        try {
            // Load js-yaml library if not already loaded
            if (typeof jsyaml === 'undefined') {
                await this.loadYAMLLibrary();
                console.log('YAML library loaded successfully!');
            }
            
            console.log('YAML path:', this.yamlPath);
            const response = await fetch(this.yamlPath);
            if (!response.ok) {
                throw new Error(`Failed to load YAML: ${response.status}`);
            }
            
            const yamlText = await response.text();
            const levelData = jsyaml.load(yamlText);
            
            return this.processLevelData(levelData);
            
        } catch (error) {
            console.error('Error loading YAML configuration:', error);
            throw error;
        }
    }

    async loadYAMLLibrary() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load YAML library'));
            document.head.appendChild(script);
        });
    }

    processLevelData(levelData) {
        const collisionFiles = [];
        
        for (const [levelId, levelInfo] of Object.entries(levelData.levels)) {
            const levelName = levelInfo.name || levelId;
            
            // Process areas
            for (const area of levelInfo.areas || []) {
                if (area.collision_file) {
                    const filePath = `${this.levelsPath}/${levelId}/${area.collision_file}`;
                    collisionFiles.push({
                        name: 'collision.inc.c',
                        levelName: levelId,
                        subdirectory: 'areas',
                        areaNumber: area.id,
                        displayName: `${levelName} - ${area.name}`,
                        localPath: filePath,
                        path: `levels/${levelId}/${area.collision_file}`,
                        type: 'area',
                        objects: levelInfo.objects || [] // Include objects for this level
                    });
                }
            }
            
            // Now we'll process objects and include them with the areas
            // Objects will be loaded separately and positioned based on script.c
        }
        
        return collisionFiles;
    }

    getFallbackList() {
        // Fallback to a minimal hardcoded list if YAML fails
        console.log('Using fallback collision file list');
        
        return [
            {
                name: 'collision.inc.c',
                levelName: 'bob',
                subdirectory: 'areas',
                areaNumber: '1',
                displayName: 'Bob-omb Battlefield - Main Area',
                localPath: `${this.levelsPath}/bob/areas/1/collision.inc.c`,
                path: 'levels/bob/areas/1/collision.inc.c',
                type: 'area',
                objects: []
            },
            {
                name: 'collision.inc.c',
                levelName: 'bitfs',
                subdirectory: 'areas',
                areaNumber: '1',
                displayName: 'Bowser in the Fire Sea - Main Area',
                localPath: `${this.levelsPath}/bitfs/areas/1/collision.inc.c`,
                path: 'levels/bitfs/areas/1/collision.inc.c',
                type: 'area',
                objects: []
            }
        ];
    }

    async downloadCollisionFile(fileInfo) {
        try {
            console.log(`Loading ${fileInfo.displayName}...`);
            
            const response = await fetch(fileInfo.localPath);
            if (!response.ok) {
                throw new Error(`Failed to load file: ${response.status} - ${fileInfo.localPath}`);
            }
            
            const content = await response.text();
            return content;
            
        } catch (error) {
            console.error(`Error loading ${fileInfo.name}:`, error);
            throw error;
        }
    }

    // Get collision files with caching
    async getCollisionFilesList() {
        if (this.collisionFiles.length === 0) {
            await this.fetchCollisionFiles();
        }
        return this.collisionFiles;
    }

    // Load objects for a specific level, filtered by current area
    async loadLevelObjects(levelInfo, version = 'US') {
        const objects = [];
        
        if (!levelInfo.objects || levelInfo.objects.length === 0) {
            return objects;
        }

        // Get current area from fileInfo for filtering
        const currentArea = levelInfo.areaNumber ? parseInt(levelInfo.areaNumber) : null;
        console.log(`Loading objects for ${levelInfo.levelName}${currentArea ? ` (Area ${currentArea})` : ''}...`);

        try {
            // Load script.c to get object positions
            const scriptPath = `${this.levelsPath}/${levelInfo.levelName}/script.c`;
            const scriptContent = await this.loadFile(scriptPath);
            const objectPositions = this.parseObjectPositions(scriptContent, levelInfo.levelName);

            // Load each object's collision data
            for (const objectDef of levelInfo.objects) {
                // Filter objects by current area if area filtering is enabled
                if (currentArea && objectDef.area && objectDef.area !== currentArea) {
                    console.log(`Skipping ${objectDef.name} (area ${objectDef.area}, current area is ${currentArea})`);
                    continue;
                }
                
                try {
                    const objectPath = `${this.levelsPath}/${levelInfo.levelName}/${objectDef.collision_file}`;
                    const objectContent = await this.loadFile(objectPath);
                    
                    // Parse object collision data
                    const objectData = this.parseObjectCollision(objectContent, objectDef, version);
                    
                    // Find positions for this object in script.c
                    const positions = this.findObjectPositions(objectDef, objectPositions, levelInfo.levelName);
                    
                    if (positions.length > 0) {
                        // Create object instances at each position
                        for (const position of positions) {
                            objects.push({
                                ...objectData,
                                position: position,
                                name: objectDef.name,
                                id: objectDef.id
                            });
                        }
                        console.log(`Loaded ${objectDef.name} at ${positions.length} position(s)`);
                    } else {
                        console.log(`No positions found for ${objectDef.name}`);
                    }
                    
                } catch (error) {
                    console.warn(`Could not load object ${objectDef.name}:`, error.message);
                }
            }

        } catch (error) {
            console.warn(`Could not load script.c for ${levelInfo.levelName}:`, error.message);
        }

        return objects;
    }

    // Parse object positions from script.c
    parseObjectPositions(scriptContent, levelAbbr) {
        const positions = {};
        const lines = scriptContent.split('\n');
        
        // Look for OBJECT or OBJECT_WITH_ACTS lines that match the pattern
        // Handle spaces between OBJECT and opening parenthesis
        const objectPattern = /OBJECT(?:_WITH_ACTS)?\s*\(\s*\/\*model\*\/\s*MODEL_([^,]+),\s*\/\*pos\*\/\s*(-?\d+),\s*(-?\d+),\s*(-?\d+),\s*\/\*angle\*\/\s*(-?\d+),\s*(-?\d+),\s*(-?\d+)/;
        
        for (const line of lines) {
            const match = line.match(objectPattern);
            if (match) {
                const modelName = match[1];
                const position = {
                    x: parseInt(match[2]),
                    y: parseInt(match[3]),
                    z: parseInt(match[4]),
                    angleX: parseInt(match[5]),
                    angleY: parseInt(match[6]),
                    angleZ: parseInt(match[7])
                };
                
                if (!positions[modelName]) {
                    positions[modelName] = [];
                }
                positions[modelName].push(position);
            }
        }
        
        return positions;
    }

    // Find positions for a specific object definition
    findObjectPositions(objectDef, objectPositions, levelAbbr) {
        const levelAbbrUpper = levelAbbr.toUpperCase();
        const objectIdUpper = objectDef.id.toUpperCase();
        
        // Start with script_model_name if provided in YAML
        const possibleModelNames = [];
        
        if (objectDef.script_model_name) {
            if (Array.isArray(objectDef.script_model_name)) {
                possibleModelNames.push(...objectDef.script_model_name);
            } else {
                possibleModelNames.push(objectDef.script_model_name);
            }
        }
        
        // Add default patterns as fallback
        possibleModelNames.push(
            `${levelAbbrUpper}_${objectIdUpper}`,
            `LEVEL_GEOMETRY_${objectIdUpper}`,
            `${levelAbbrUpper}_${objectIdUpper.replace(/_/g, '_')}`,
            objectIdUpper
        );
        
        // Keep LLL-specific mappings for backwards compatibility (until we move them to YAML)
        if (levelAbbr === 'lll') {
            const lllMappings = {
                'tilting_square_platform': 'LLL_TILTING_SQUARE_PLATFORM',
                'sinking_rectangular_platform': 'LLL_SINKING_RECTANGULAR_PLATFORM', 
                'sinking_square_platform': 'LLL_SINKING_SQUARE_PLATFORMS',
                'moving_octagonal_mesh_platform': 'LLL_MOVING_OCTAGONAL_MESH_PLATFORM',
                'puzzle_piece': 'LLL_BOWSER_PIECE'
            };
            
            if (lllMappings[objectDef.id]) {
                possibleModelNames.unshift(lllMappings[objectDef.id]);
            }
        }
        
        for (const modelName of possibleModelNames) {
            if (objectPositions[modelName]) {
                return objectPositions[modelName];
            }
        }
        
        return [];
    }

    // Parse collision data for an object
    parseObjectCollision(content, objectDef, version) {
        // This is similar to the main file handler but for individual objects
        const vertices = [];
        const triangles = [];
        
        // Process version directives if present
        let processedContent = content;
        if (content.includes('#ifdef VERSION_JP') || content.includes('#ifndef VERSION_JP')) {
            processedContent = this.preprocessVersionDirectives(content, version);
        }
        
        // Parse vertices
        const vertexPattern = /COL_VERTEX\(\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/g;
        let match;
        while ((match = vertexPattern.exec(processedContent)) !== null) {
            vertices.push({
                x: parseInt(match[1]),
                y: parseInt(match[2]),
                z: parseInt(match[3])
            });
        }
        
        // Parse triangles
        const lines = processedContent.split('\n');
        let currentSurface = 'SURFACE_DEFAULT';
        
        for (const line of lines) {
            const surfaceMatch = line.match(/COL_TRI_INIT\(\s*([^,]+)\s*,\s*\d+\s*\)/);
            if (surfaceMatch) {
                currentSurface = surfaceMatch[1].trim();
                continue;
            }
            
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
            triangles: triangles,
            type: 'object'
        };
    }

    // Preprocess version directives (same as in FileHandler)
    preprocessVersionDirectives(content, targetVersion) {
        const lines = content.split('\n');
        const processedLines = [];
        let insideIf = false;
        let ifCondition = '';
        let skipBlock = false;
        let ifDepth = 0;
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            if (trimmed.startsWith('#ifdef VERSION_JP')) {
                insideIf = true;
                ifCondition = 'VERSION_JP';
                skipBlock = (targetVersion !== 'JP');
                ifDepth = 1;
                continue;
            }
            
            if (trimmed.startsWith('#ifndef VERSION_JP')) {
                insideIf = true;
                ifCondition = '!VERSION_JP';
                skipBlock = (targetVersion === 'JP');
                ifDepth = 1;
                continue;
            }
            
            if (insideIf && (trimmed.startsWith('#ifdef') || trimmed.startsWith('#ifndef'))) {
                ifDepth++;
                continue;
            }
            
            if (insideIf && trimmed.startsWith('#else') && ifDepth === 1) {
                skipBlock = !skipBlock;
                continue;
            }
            
            if (insideIf && trimmed.startsWith('#endif')) {
                ifDepth--;
                if (ifDepth === 0) {
                    insideIf = false;
                    skipBlock = false;
                    ifCondition = '';
                }
                continue;
            }
            
            if (insideIf && skipBlock) {
                continue;
            }
            
            if (trimmed.startsWith('#') && !trimmed.startsWith('#ifdef') && !trimmed.startsWith('#ifndef') && !trimmed.startsWith('#else') && !trimmed.startsWith('#endif')) {
                continue;
            }
            
            processedLines.push(line);
        }
        
        return processedLines.join('\n');
    }

    // Helper method to load any file
    async loadFile(filePath) {
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`Failed to load ${filePath}: ${response.status}`);
        }
        return await response.text();
    }
}
