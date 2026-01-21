// Build script for AegisDesk - Creates deployment-ready folder
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BUILD_DIR = 'dist';
const SOURCE_DIR = __dirname;

// Files/folders to copy
const COPY_PATTERNS = [
    // HTML files
    '*.html',
    // CSS files
    'styles/**/*',
    // JavaScript files
    'js/**/*',
    // Vendor files
    'vendor/**/*',
    // Config files
    'manifest.json',
    'vercel.json',
    // API files (for serverless)
    'api/**/*',
    // Service worker
    'sw.js'
];

// Files/folders to exclude
const EXCLUDE_PATTERNS = [
    'node_modules',
    '.git',
    '.gitignore',
    'package.json',
    'package-lock.json',
    'server.js',
    'build.js',
    '*.md',
    '*.bat',
    'aws-config.json',
    'START_SERVER.*',
    'start-server.*'
];

function shouldExclude(filePath) {
    const relativePath = path.relative(SOURCE_DIR, filePath);
    return EXCLUDE_PATTERNS.some(pattern => {
        if (pattern.includes('**')) {
            const regex = new RegExp(pattern.replace(/\*\*/g, '.*'));
            return regex.test(relativePath);
        }
        return relativePath.includes(pattern) || path.basename(filePath).match(pattern.replace('*', '.*'));
    });
}

function copyFile(src, dest) {
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(src, dest);
}

function copyDirectory(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (shouldExclude(srcPath)) {
            console.log(`⏭️  Skipping: ${path.relative(SOURCE_DIR, srcPath)}`);
            continue;
        }

        if (entry.isDirectory()) {
            copyDirectory(srcPath, destPath);
        } else {
            copyFile(srcPath, destPath);
            console.log(`✅ Copied: ${path.relative(SOURCE_DIR, srcPath)}`);
        }
    }
}

function build() {
    console.log('🚀 Building AegisDesk for production...\n');

    // Clean build directory
    const buildPath = path.join(SOURCE_DIR, BUILD_DIR);
    if (fs.existsSync(buildPath)) {
        console.log('🧹 Cleaning existing build directory...');
        fs.rmSync(buildPath, { recursive: true, force: true });
    }

    // Create build directory
    fs.mkdirSync(buildPath, { recursive: true });

    // Copy files
    console.log('\n📦 Copying files...\n');

    // Copy root HTML files
    const htmlFiles = fs.readdirSync(SOURCE_DIR).filter(f => f.endsWith('.html'));
    htmlFiles.forEach(file => {
        if (!shouldExclude(path.join(SOURCE_DIR, file))) {
            copyFile(path.join(SOURCE_DIR, file), path.join(buildPath, file));
        }
    });

    // Copy directories
    const dirsToCopy = ['styles', 'js', 'vendor', 'api'];
    dirsToCopy.forEach(dir => {
        const srcDir = path.join(SOURCE_DIR, dir);
        if (fs.existsSync(srcDir)) {
            copyDirectory(srcDir, path.join(buildPath, dir));
        }
    });

    // Copy individual files
    const filesToCopy = ['manifest.json', 'vercel.json', 'sw.js'];
    filesToCopy.forEach(file => {
        const srcFile = path.join(SOURCE_DIR, file);
        if (fs.existsSync(srcFile) && !shouldExclude(srcFile)) {
            copyFile(srcFile, path.join(buildPath, file));
        }
    });

    console.log('\n✅ Build complete!');
    console.log(`📁 Output folder: ${BUILD_DIR}/`);
    console.log(`\n📋 Next steps:`);
    console.log(`   1. Review ${BUILD_DIR}/ folder`);
    console.log(`   2. Upload ${BUILD_DIR}/ folder to your hosting service`);
    console.log(`   3. Make sure to set environment variables for API keys\n`);
}

build();
