/**
 * GitHub Repository Loader
 * Fetches collision files directly from the SM64 decomp repository
 */

export class GitHubLoader {
    constructor() {
        this.repoOwner = 'n64decomp';
        this.repoName = 'sm64';
        this.branch = 'master';
        this.levelsPath = 'levels';
        this.collisionFiles = [];
        this.requestDelay = 100; // 100ms delay between requests to avoid rate limiting
        this.maxRetries = 3;
    }

    // Add delay between requests to avoid rate limiting
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async fetchWithRetry(url, retries = this.maxRetries) {
        for (let i = 0; i < retries; i++) {
            try {
                await this.delay(this.requestDelay);
                const response = await fetch(url);
                
                if (response.status === 403) {
                    console.warn(`Rate limited on ${url}, attempt ${i + 1}/${retries}`);
                    if (i < retries - 1) {
                        await this.delay(1000 * (i + 1)); // Exponential backoff
                        continue;
                    }
                    throw new Error(`Rate limited after ${retries} attempts`);
                }
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                return response;
            } catch (error) {
                if (i === retries - 1) throw error;
                await this.delay(1000 * (i + 1));
            }
        }
    }

    async fetchCollisionFiles() {
        try {
            console.log('Fetching SM64 level data from GitHub...');
            
            // Get the levels directory structure
            const levelsUrl = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/contents/${this.levelsPath}?ref=${this.branch}`;
            const levelsResponse = await this.fetchWithRetry(levelsUrl);
            
            const levelDirs = await levelsResponse.json();
            this.collisionFiles = [];
            
            // Process each level directory with rate limiting
            for (const levelDir of levelDirs) {
                if (levelDir.type === 'dir') {
                    try {
                        await this.scanLevelDirectory(levelDir.name);
                    } catch (error) {
                        console.warn(`Skipping level ${levelDir.name} due to error:`, error.message);
                        continue; // Continue with other levels even if one fails
                    }
                }
            }
            
            console.log(`Found ${this.collisionFiles.length} collision files`);
            return this.collisionFiles;
            
        } catch (error) {
            console.error('Error fetching collision files:', error);
            throw error;
        }
    }

    async scanLevelDirectory(levelName) {
        try {
            const levelUrl = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/contents/${this.levelsPath}/${levelName}?ref=${this.branch}`;
            const levelResponse = await this.fetchWithRetry(levelUrl);
            
            const levelContents = await levelResponse.json();
            
            // Look for collision files in the level directory itself
            for (const item of levelContents) {
                if (item.type === 'file' && this.isCollisionFile(item.name)) {
                    this.collisionFiles.push({
                        name: item.name,
                        levelName: levelName,
                        displayName: this.formatLevelName(levelName, item.name),
                        downloadUrl: item.download_url,
                        path: `${this.levelsPath}/${levelName}/${item.name}`
                    });
                } else if (item.type === 'dir') {
                    // Scan subdirectories (areas, objects, etc.)
                    await this.scanSubdirectory(levelName, item.name);
                }
            }
            
        } catch (error) {
            console.warn(`Error scanning level ${levelName}:`, error);
        }
    }

    async scanSubdirectory(levelName, subdirName) {
        try {
            const subdirUrl = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/contents/${this.levelsPath}/${levelName}/${subdirName}?ref=${this.branch}`;
            const subdirResponse = await this.fetchWithRetry(subdirUrl);
            
            const subdirContents = await subdirResponse.json();
            
            for (const item of subdirContents) {
                if (item.type === 'file' && this.isCollisionFile(item.name)) {
                    // Found collision file in subdirectory
                    this.collisionFiles.push({
                        name: item.name,
                        levelName: levelName,
                        subdirectory: subdirName,
                        displayName: this.formatLevelName(levelName, item.name, subdirName),
                        downloadUrl: item.download_url,
                        path: `${this.levelsPath}/${levelName}/${subdirName}/${item.name}`
                    });
                } else if (item.type === 'dir' && subdirName === 'areas') {
                    // For areas subdirectory, scan area numbers (1, 2, etc.)
                    await this.scanAreaDirectory(levelName, item.name);
                }
            }
            
        } catch (error) {
            console.warn(`Error scanning subdirectory ${levelName}/${subdirName}:`, error);
        }
    }

    async scanAreaDirectory(levelName, areaNumber) {
        try {
            const areaUrl = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/contents/${this.levelsPath}/${levelName}/areas/${areaNumber}?ref=${this.branch}`;
            const areaResponse = await this.fetchWithRetry(areaUrl);
            
            const areaContents = await areaResponse.json();
            
            for (const item of areaContents) {
                if (item.type === 'file' && this.isCollisionFile(item.name)) {
                    this.collisionFiles.push({
                        name: item.name,
                        levelName: levelName,
                        subdirectory: 'areas',
                        areaNumber: areaNumber,
                        displayName: this.formatLevelName(levelName, item.name, 'areas', areaNumber),
                        downloadUrl: item.download_url,
                        path: `${this.levelsPath}/${levelName}/areas/${areaNumber}/${item.name}`
                    });
                }
            }
            
        } catch (error) {
            console.warn(`Error scanning area ${levelName}/areas/${areaNumber}:`, error);
        }
    }

    isCollisionFile(filename) {
        // Match files that contain collision data
        const collisionPatterns = [
            /collision\.inc\.c$/i,
            /_collision\.inc\.c$/i,
            /areas\/\d+\/collision\.inc\.c$/i
        ];
        
        return collisionPatterns.some(pattern => pattern.test(filename));
    }

    formatLevelName(levelDir, filename, subdirectory = null, areaNumber = null) {
        // Convert level directory names to readable format
        const levelNames = {
            'bob': 'Bob-omb Battlefield',
            'wf': 'Whomp\'s Fortress', 
            'jrb': 'Jolly Roger Bay',
            'ccm': 'Cool, Cool Mountain',
            'bbh': 'Big Boo\'s Haunt',
            'hmc': 'Hazy Maze Cave',
            'lll': 'Lethal Lava Land',
            'ssl': 'Shifting Sand Land',
            'ddd': 'Dire Dire Docks',
            'sl': 'Snowman\'s Land',
            'wdw': 'Wet-Dry World',
            'ttm': 'Tall, Tall Mountain',
            'thi': 'Tiny-Huge Island',
            'ttc': 'Tick Tock Clock',
            'rr': 'Rainbow Ride',
            'castle_inside': 'Castle Interior',
            'castle_outside': 'Castle Grounds',
            'castle_courtyard': 'Castle Courtyard',
            'pss': 'Princess\'s Secret Slide',
            'sa': 'Secret Aquarium',
            'bitdw': 'Bowser in the Dark World',
            'bits': 'Bowser in the Sky',
            'bitfs': 'Bowser in the Fire Sea',
            'totwc': 'Tower of the Wing Cap',
            'cotmc': 'Cavern of the Metal Cap',
            'vcutm': 'Vanish Cap Under the Moat',
            'wmotr': 'Wing Mario Over the Rainbow',
            'ending': 'Ending Sequence'
        };
        
        const readableName = levelNames[levelDir] || levelDir.toUpperCase();
        
        // Handle area-specific collision files
        if (subdirectory === 'areas' && areaNumber) {
            return `${readableName} - Area ${areaNumber}`;
        }
        
        // Handle object-specific collision files
        if (subdirectory && subdirectory !== 'areas') {
            const objectName = subdirectory.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            return `${readableName} - ${objectName}`;
        }
        
        return readableName;
    }

    async downloadCollisionFile(fileInfo) {
        try {
            console.log(`Downloading ${fileInfo.displayName}...`);
            
            const response = await fetch(fileInfo.downloadUrl);
            if (!response.ok) {
                throw new Error(`Failed to download file: ${response.status}`);
            }
            
            const content = await response.text();
            return content;
            
        } catch (error) {
            console.error(`Error downloading ${fileInfo.name}:`, error);
            throw error;
        }
    }

    // Get collision files with caching
    async getCollisionFilesList() {
        if (this.collisionFiles.length === 0) {
            try {
                await this.fetchCollisionFiles();
            } catch (error) {
                console.warn('GitHub API failed, falling back to predefined list');
                return this.getFallbackCollisionFiles();
            }
        }
        return this.collisionFiles;
    }

    // Fallback list of known collision files when GitHub API fails
    getFallbackCollisionFiles() {
        return [
            {
                name: 'collision.inc.c',
                levelName: 'bob',
                subdirectory: 'areas',
                areaNumber: '1',
                displayName: 'Bob-omb Battlefield - Area 1',
                downloadUrl: 'https://raw.githubusercontent.com/n64decomp/sm64/master/levels/bob/areas/1/collision.inc.c',
                path: 'levels/bob/areas/1/collision.inc.c'
            },
            {
                name: 'collision.inc.c',
                levelName: 'wf',
                subdirectory: 'areas',
                areaNumber: '1',
                displayName: 'Whomp\'s Fortress - Area 1',
                downloadUrl: 'https://raw.githubusercontent.com/n64decomp/sm64/master/levels/wf/areas/1/collision.inc.c',
                path: 'levels/wf/areas/1/collision.inc.c'
            },
            {
                name: 'collision.inc.c',
                levelName: 'bitfs',
                subdirectory: 'areas',
                areaNumber: '1',
                displayName: 'Bowser in the Fire Sea - Area 1',
                downloadUrl: 'https://raw.githubusercontent.com/n64decomp/sm64/master/levels/bitfs/areas/1/collision.inc.c',
                path: 'levels/bitfs/areas/1/collision.inc.c'
            },
            {
                name: 'collision.inc.c',
                levelName: 'castle_inside',
                subdirectory: 'areas',
                areaNumber: '1',
                displayName: 'Castle Interior - Area 1',
                downloadUrl: 'https://raw.githubusercontent.com/n64decomp/sm64/master/levels/castle_inside/areas/1/collision.inc.c',
                path: 'levels/castle_inside/areas/1/collision.inc.c'
            },
            {
                name: 'collision.inc.c',
                levelName: 'ccm',
                subdirectory: 'areas',
                areaNumber: '1',
                displayName: 'Cool, Cool Mountain - Area 1',
                downloadUrl: 'https://raw.githubusercontent.com/n64decomp/sm64/master/levels/ccm/areas/1/collision.inc.c',
                path: 'levels/ccm/areas/1/collision.inc.c'
            }
        ];
    }
}
