/**
 * Centralized Color Configuration
 * Defines all colors used throughout the application
 */

export const ColorConfig = {
    // Surface type colors (using hex values for consistency)
    surfaceTypes: {
        'SURFACE_DEFAULT': 0x808080,
        'SURFACE_BURNING': 0xff4444,
        'SURFACE_HANGABLE': 0x44ff44,
        'SURFACE_VERY_SLIPPERY': 0x4444ff,
        'SURFACE_SLIPPERY': 0x44ffff,
        'SURFACE_NOT_SLIPPERY': 0xffff44,
        'SURFACE_WIND': 0xff44ff,
        'SURFACE_NOISE_DEFAULT': 0xffffff,
        'SURFACE_NOISE_SLIPPERY': 0xcccccc,
        'SURFACE_NOISE_NO_SLIP': 0x999999,
        'SURFACE_SAND': 0xdaa520,
        'SURFACE_VANISH_CAP_WALLS': 0x800080,
        // Fallbacks for non-prefixed names
        'DEFAULT': 0x808080,
        'BURNING': 0xff4444,
        'HANGABLE': 0x44ff44,
        'NO_CAM_COLLISION': 0x44ff44,
        'VERY_SLIPPERY': 0x4444ff,
        'SLIPPERY': 0x44ffff,
        'NOT_SLIPPERY': 0xffff44,
        'WIND': 0xff44ff,
        'NOISE_DEFAULT': 0xffffff,
        'NOISE_SLIPPERY': 0xcccccc,
        'NOISE_NO_SLIP': 0x999999,
        'SAND': 0xdaa520,
        'VANISH_CAP_WALLS': 0x800080
    },
    
    // Geometry type colors
    geometryTypes: {
        'floor': 0x4080ff,    // Blue for floors
        'wall': 0x44ff44,     // Green for walls
        'ceiling': 0xff4444   // Red for ceilings
    },
    
    // Helper function to convert hex number to CSS hex string
    toHexString(hexNumber) {
        return '#' + hexNumber.toString(16).padStart(6, '0');
    },
    
    // Helper function to get surface type color as hex string for CSS
    getSurfaceTypeHex(surfaceType) {
        const color = this.surfaceTypes[surfaceType] || this.surfaceTypes.DEFAULT;
        return this.toHexString(color);
    },
    
    // Helper function to get geometry type color as hex string for CSS
    getGeometryTypeHex(geometryType) {
        const color = this.geometryTypes[geometryType] || this.geometryTypes.floor;
        return this.toHexString(color);
    }
};
