/**
 * UI Controls Module
 * Handles user interface elements and interactions
 */

import { ColorConfig } from './color-config.js';
import { LevelLoader } from './level-loader.js';

export class UIControls {
    constructor(viewer) {
        this.viewer = viewer;
        this.levelLoader = new LevelLoader();
        this.setupControls();
        // Initialize level loader
        this.loadLocalCollisionFiles();
    }
    
    setupControls() {
        // Create UI container
        const uiContainer = document.createElement('div');
        uiContainer.id = 'ui-container';
        uiContainer.style.cssText = `
            position: absolute;
            top: 10px;
            left: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 20px;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            z-index: 1000;
            min-width: 300px;
        `;
        
        document.body.appendChild(uiContainer);
        
        // Title
        const title = document.createElement('h3');
        title.textContent = 'SM64 Collision Viewer';
        title.style.cssText = 'margin: 0 0 15px 0; color: #4CAF50; font-size: 18px;';
        uiContainer.appendChild(title);
        
        // Interactive instructions
        const instructions = document.createElement('div');
        instructions.style.cssText = `
            background: rgba(76, 175, 80, 0.2);
            border: 1px solid #4CAF50;
            border-radius: 4px;
            padding: 10px;
            margin-bottom: 15px;
            font-size: 12px;
            line-height: 1.4;
        `;
        instructions.innerHTML = `
            <strong style="color: #4CAF50;">💡 Tip:</strong><br>
            • <strong>Hover</strong> over triangles to highlight them<br>
            • <strong>Double-Click</strong> highlighted triangles for detailed info<br>
            • <strong>Drag</strong> to rotate camera view
        `;
        uiContainer.appendChild(instructions);
        
        // Statistics
        this.statsDiv = document.createElement('div');
        this.statsDiv.id = 'stats';
        uiContainer.appendChild(this.statsDiv);
        
        // View mode toggle
        this.viewModeButton = document.createElement('button');
        this.viewModeButton.textContent = 'Switch to Geometry View';
        this.viewModeButton.style.cssText = `
            background: #4CAF50;
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 4px;
            cursor: pointer;
            margin: 10px 5px 5px 0;
            font-size: 13px;
        `;
        this.viewModeButton.onclick = () => this.viewer.toggleViewMode();
        uiContainer.appendChild(this.viewModeButton);
        
        // Export button
        const exportButton = document.createElement('button');
        exportButton.textContent = 'Export OBJ';
        exportButton.style.cssText = `
            background: #2196F3;
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 4px;
            cursor: pointer;
            margin: 10px 5px 5px 0;
            font-size: 13px;
        `;
        exportButton.onclick = () => this.viewer.exportToOBJ();
        uiContainer.appendChild(exportButton);
        
        // File selection dropdown
        const fileSelectContainer = document.createElement('div');
        fileSelectContainer.style.cssText = 'margin: 10px 0; padding: 10px 0; border-top: 1px solid #555;';
        
        const fileSelectLabel = document.createElement('label');
        fileSelectLabel.textContent = 'Select Collision File:';
        fileSelectLabel.style.cssText = 'display: block; margin-bottom: 8px; font-size: 13px;';
        fileSelectContainer.appendChild(fileSelectLabel);
        
        this.fileSelect = document.createElement('select');
        this.fileSelect.style.cssText = `
            width: 100%;
            padding: 8px;
            border: 1px solid #555;
            border-radius: 4px;
            background: rgba(255, 255, 255, 0.1);
            color: white;
            font-size: 13px;
        `;
        
        // Ensure dropdown options are visible
        const style = document.createElement('style');
        style.textContent = `
            select option {
                background: #333 !important;
                color: white !important;
            }
            select option:hover {
                background: #555 !important;
            }
        `;
        document.head.appendChild(style);
        
        // Add loading option
        const loadingOption = document.createElement('option');
        loadingOption.value = '';
        loadingOption.textContent = 'Loading SM64 levels...';
        this.fileSelect.appendChild(loadingOption);
        
        this.fileSelect.onchange = (e) => {
            if (e.target.value) {
                if (e.target.value.startsWith('{')) {
                    // JSON file info - load from local levels
                    this.loadLocalFile(e.target.value);
                } else {
                    // Legacy file name - load from root directory
                    this.viewer.fileHandler.loadFile(e.target.value);
                }
            }
        };
        
        fileSelectContainer.appendChild(this.fileSelect);
        uiContainer.appendChild(fileSelectContainer);
        
        // Local data info
        const localInfo = document.createElement('div');
        localInfo.style.cssText = `
            background: rgba(76, 175, 80, 0.2);
            border: 1px solid #4CAF50;
            border-radius: 4px;
            padding: 8px;
            margin-bottom: 10px;
            font-size: 11px;
            line-height: 1.3;
        `;
        localInfo.innerHTML = `
            <strong style="color: #4CAF50;">📂 Local Data:</strong><br>
            Collision files loaded from local<br>
            SM64 decomp levels directory
        `;
        uiContainer.appendChild(localInfo);
        
        // File input for loading custom collision data
        const fileContainer = document.createElement('div');
        fileContainer.style.cssText = 'margin-top: 10px; padding-top: 10px; border-top: 1px solid #555;';
        
        const fileLabel = document.createElement('label');
        fileLabel.textContent = 'Load Collision File:';
        fileLabel.style.cssText = 'display: block; margin-bottom: 8px; font-size: 13px;';
        fileContainer.appendChild(fileLabel);
        
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.c,.inc.c,.json';
        fileInput.style.cssText = 'font-size: 12px; color: white;';
        fileInput.onchange = (e) => this.viewer.fileHandler.handleFileLoad(e);
        fileContainer.appendChild(fileInput);
        
        uiContainer.appendChild(fileContainer);
        
        // Legend
        this.createLegend(uiContainer);
    }
    
    createLegend(container) {
        const legendContainer = document.createElement('div');
        legendContainer.style.cssText = 'margin-top: 15px; padding-top: 10px; border-top: 1px solid #555;';
        
        const legendTitle = document.createElement('div');
        legendTitle.textContent = 'Legend:';
        legendTitle.style.cssText = 'font-weight: bold; margin-bottom: 10px; font-size: 13px;';
        legendContainer.appendChild(legendTitle);
        
        this.surfaceLegend = document.createElement('div');
        this.surfaceLegend.id = 'surface-legend';
        this.surfaceLegend.style.cssText = `
            padding-right: 5px;
        `;
        legendContainer.appendChild(this.surfaceLegend);
        
        this.geometryLegend = document.createElement('div');
        this.geometryLegend.id = 'geometry-legend';
        this.geometryLegend.style.display = 'none';
        legendContainer.appendChild(this.geometryLegend);
        
        container.appendChild(legendContainer);
        
        this.updateLegend();
    }
    
    updateLegend() {
        // Surface type legend - use centralized colors
        this.surfaceLegend.innerHTML = '';
        for (const [type, colorHex] of Object.entries(ColorConfig.surfaceTypes)) {
            // Skip duplicate entries (keep SURFACE_ prefixed versions)
            if (!type.startsWith('SURFACE_') && ColorConfig.surfaceTypes['SURFACE_' + type]) {
                continue;
            }
            
            const item = document.createElement('div');
            item.style.cssText = 'display: flex; align-items: center; margin-bottom: 5px; font-size: 12px;';
            
            const colorBox = document.createElement('div');
            colorBox.style.cssText = `
                width: 16px;
                height: 16px;
                background-color: ${ColorConfig.toHexString(colorHex)};
                margin-right: 8px;
                border: 1px solid #333;
            `;
            
            const label = document.createElement('span');
            label.textContent = type.replace(/^SURFACE_/, '').replace(/_/g, ' ');
            
            item.appendChild(colorBox);
            item.appendChild(label);
            this.surfaceLegend.appendChild(item);
        }
        
        // Geometry type legend - use centralized colors
        this.geometryLegend.innerHTML = '';
        for (const [type, colorHex] of Object.entries(ColorConfig.geometryTypes)) {
            const item = document.createElement('div');
            item.style.cssText = 'display: flex; align-items: center; margin-bottom: 5px; font-size: 12px;';
            
            const colorBox = document.createElement('div');
            colorBox.style.cssText = `
                width: 16px;
                height: 16px;
                background-color: ${ColorConfig.toHexString(colorHex)};
                margin-right: 8px;
                border: 1px solid #333;
            `;
            
            const label = document.createElement('span');
            label.textContent = type.charAt(0).toUpperCase() + type.slice(1);
            
            item.appendChild(colorBox);
            item.appendChild(label);
            this.geometryLegend.appendChild(item);
        }
    }
    
    updateStats() {
        const vertexCount = this.viewer.vertices.length;
        const triangleCount = this.viewer.triangles.length;
        
        let statsHTML = `
            <div style="margin-bottom: 10px;">
                <strong>Statistics:</strong><br>
                Vertices: ${vertexCount.toLocaleString()}<br>
                Triangles: ${triangleCount.toLocaleString()}
            </div>
        `;
        
        if (this.viewer.viewMode === 'surface') {
            const surfaceStats = this.viewer.geometryClassifier.getSurfaceTypeStats(this.viewer.triangles);
            statsHTML += '<div style="max-height: 150px; overflow-y: auto; padding-right: 5px;"><strong>Surface Types:</strong><br>';
            for (const [type, count] of Object.entries(surfaceStats)) {
                statsHTML += `${type.replace(/_/g, ' ')}: ${count}<br>`;
            }
            statsHTML += '</div>';
        } else {
            const geometryStats = this.viewer.geometryClassifier.getGeometryStats(this.viewer.triangles);
            statsHTML += '<strong>Geometry Types:</strong><br>';
            statsHTML += `Floors: ${geometryStats.floor}<br>`;
            statsHTML += `Walls: ${geometryStats.wall}<br>`;
            statsHTML += `Ceilings: ${geometryStats.ceiling}<br>`;
        }
        
        this.statsDiv.innerHTML = statsHTML;
    }
    
    updateViewModeButton() {
        this.viewModeButton.textContent = this.viewer.viewMode === 'surface' 
            ? 'Switch to Geometry View' 
            : 'Switch to Surface View';
        
        // Toggle legend visibility
        if (this.viewer.viewMode === 'surface') {
            this.surfaceLegend.style.display = 'block';
            this.geometryLegend.style.display = 'none';
        } else {
            this.surfaceLegend.style.display = 'none';
            this.geometryLegend.style.display = 'block';
        }
        
        this.updateStats();
    }

    async loadLocalCollisionFiles() {
        try {
            const collisionFiles = await this.levelLoader.getCollisionFilesList();
            this.populateFileDropdown(collisionFiles);
        } catch (error) {
            console.error('Failed to load local collision files:', error);
            this.showLoadError();
        }
    }

    populateFileDropdown(collisionFiles) {
        // Clear existing options
        this.fileSelect.innerHTML = '';
        
        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Choose a level to explore...';
        this.fileSelect.appendChild(defaultOption);
        
        // Sort files by display name
        collisionFiles.sort((a, b) => a.displayName.localeCompare(b.displayName));
        
        // Add collision file options
        collisionFiles.forEach(file => {
            const option = document.createElement('option');
            option.value = JSON.stringify(file); // Store the full file info
            option.textContent = file.displayName;
            this.fileSelect.appendChild(option);
        });
        
        console.log(`Added ${collisionFiles.length} collision files to dropdown`);
    }

    showLoadError() {
        this.fileSelect.innerHTML = '';
        const errorOption = document.createElement('option');
        errorOption.value = '';
        errorOption.textContent = 'Error loading collision files';
        this.fileSelect.appendChild(errorOption);
        
        // Also add local fallback
        const localOption = document.createElement('option');
        localOption.value = 'bitfs_tris.inc.c';
        localOption.textContent = 'Bowser in the Fire Sea (Legacy)';
        this.fileSelect.appendChild(localOption);
    }

    async loadLocalFile(fileInfoJson) {
        try {
            const fileInfo = JSON.parse(fileInfoJson);
            
            // Show loading indicator
            const originalText = this.fileSelect.options[this.fileSelect.selectedIndex].textContent;
            this.fileSelect.options[this.fileSelect.selectedIndex].textContent = 'Loading...';
            
            // Download and parse the file
            console.log('Loading file info:', fileInfo);
            const fileContent = await this.levelLoader.downloadCollisionFile(fileInfo);
            
            // Parse the collision data
            const triangleData = this.viewer.fileHandler.parseCollisionFile(fileContent);
            console.log('Parsed triangle data:', triangleData);

            if (triangleData && (triangleData.triangles.length > 0 || triangleData.vertices.length > 0)) {
                this.viewer.loadCollisionData(triangleData);
                console.log(`Successfully loaded ${fileInfo.displayName}`);
            } else {
                throw new Error(`No collision data found in file. File might be empty or not contain valid collision data. Content length: ${fileContent ? fileContent.length : 0}`);
            }
            
            // Restore original text
            this.fileSelect.options[this.fileSelect.selectedIndex].textContent = originalText;
            
        } catch (error) {
            console.error('Error loading local file:', error);
            
            // Restore dropdown and show error
            this.fileSelect.selectedIndex = 0;
            alert(`Failed to load collision file: ${error.message}`);
        }
    }
}
