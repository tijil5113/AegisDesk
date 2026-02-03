// ENVIRONMENT DETECTION
// Detects if app is running in file:// mode vs http:// mode

class EnvironmentDetector {
    constructor() {
        this.protocol = window.location.protocol;
        this.hostname = window.location.hostname;
        this.isFileProtocol = this.protocol === 'file:';
        this.isHttpProtocol = this.protocol === 'http:' || this.protocol === 'https:';
        this.isLocalhost = this.hostname === 'localhost' || this.hostname === '127.0.0.1' || this.hostname === '';
    }

    /**
     * Check if running in file:// mode
     * @returns {boolean}
     */
    isFileMode() {
        return this.isFileProtocol;
    }

    /**
     * Check if running in HTTP mode (localhost or production)
     * @returns {boolean}
     */
    isHttpMode() {
        return this.isHttpProtocol;
    }

    /**
     * Check if running on localhost
     * @returns {boolean}
     */
    isLocalhost() {
        return this.isLocalhost;
    }

    /**
     * Check if environment supports full SPA features
     * @returns {boolean}
     */
    supportsSPA() {
        return this.isHttpMode();
    }

    /**
     * Check if OAuth/auth features are available
     * @returns {boolean}
     */
    supportsAuth() {
        return this.isHttpMode();
    }

    /**
     * Get environment info for debugging
     * @returns {object}
     */
    getInfo() {
        return {
            protocol: this.protocol,
            hostname: this.hostname,
            isFileMode: this.isFileMode(),
            isHttpMode: this.isHttpMode(),
            supportsSPA: this.supportsSPA(),
            supportsAuth: this.supportsAuth()
        };
    }
}

// Create global instance
const envDetector = new EnvironmentDetector();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnvironmentDetector;
}
