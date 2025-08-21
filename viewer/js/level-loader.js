/**
 * Local Level Loader
 * Loads collision files from the local data/levels directory
 */

export class LevelLoader {
    constructor() {
        this.levelsPath = '../../data/levels';
        this.yamlPath = '../../data/levels_list.yaml';
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
                        type: 'area'
                    });
                }
            }
            
            // Process objects
            // for (const object of levelInfo.objects || []) {
            //     if (object.collision_file) {
            //         const filePath = `${this.levelsPath}/${levelId}/${object.collision_file}`;
            //         collisionFiles.push({
            //             name: 'collision.inc.c',
            //             levelName: levelId,
            //             subdirectory: object.id,
            //             displayName: `${levelName} - ${object.name}`,
            //             localPath: filePath,
            //             path: `levels/${levelId}/${object.collision_file}`,
            //             type: 'object'
            //         });
            //     }
            // }
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
                type: 'area'
            },
            {
                name: 'collision.inc.c',
                levelName: 'bitfs',
                subdirectory: 'areas',
                areaNumber: '1',
                displayName: 'Bowser in the Fire Sea - Main Area',
                localPath: `${this.levelsPath}/bitfs/areas/1/collision.inc.c`,
                path: 'levels/bitfs/areas/1/collision.inc.c',
                type: 'area'
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
}
