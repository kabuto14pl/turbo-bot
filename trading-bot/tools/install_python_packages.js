"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process = __importStar(require("child_process"));
const util = __importStar(require("util"));
const execAsync = util.promisify(child_process.exec);
/**
 * Install Python packages required for optimization
 */
async function installPythonPackages() {
    try {
        console.log('Checking Python installation...');
        // Check if Python is installed
        const pythonVersionResult = await execAsync('python --version');
        console.log('Python version:', pythonVersionResult.stdout.trim());
        // Path to requirements.txt
        const requirementsPath = path.join(__dirname, 'python', 'requirements.txt');
        // Create requirements.txt if it doesn't exist
        if (!fs.existsSync(requirementsPath)) {
            console.log('Creating requirements.txt...');
            const requirements = [
                '# Core optimization packages',
                'optuna==3.5.0',
                'ray[tune]==2.9.3  # Ray with Tune components',
                '',
                '# Data processing and visualization',
                'pandas>=2.0.0',
                'numpy>=1.24.0',
                'matplotlib>=3.7.0',
                'scikit-learn>=1.2.0',
                '',
                '# For graceful fallback when Ray is not available',
                '# Ray requires Python 3.8-3.11, but Optuna works with newer versions'
            ].join('\n');
            fs.writeFileSync(requirementsPath, requirements);
        }
        console.log('Installing Python packages...');
        console.log('This may take a few minutes...');
        // Attempt to install packages
        try {
            // Try to install with default pip
            const installResult = await execAsync(`pip install -r "${requirementsPath}"`);
            console.log('Installation output:', installResult.stdout);
            console.log('Packages installed successfully!');
        }
        catch (installError) {
            const errorMsg = installError instanceof Error ? installError.message : String(installError);
            console.warn('Error installing packages with pip. The error was:', errorMsg);
            console.log('Trying alternative installation without Ray (which may require Python 3.8-3.11)...');
            // Try installing just the essential packages without Ray
            try {
                const essentialPackages = [
                    'optuna==3.5.0',
                    'pandas>=2.0.0',
                    'numpy>=1.24.0',
                    'matplotlib>=3.7.0',
                    'scikit-learn>=1.2.0'
                ].join(' ');
                const alternativeInstallResult = await execAsync(`pip install ${essentialPackages}`);
                console.log('Alternative installation output:', alternativeInstallResult.stdout);
                console.log('Essential packages installed successfully!');
                console.log('Note: Ray was not installed. The optimizer will run in single-machine mode only.');
            }
            catch (alternativeError) {
                const altErrorMsg = alternativeError instanceof Error ? alternativeError.message : String(alternativeError);
                console.error('Error installing essential packages:', altErrorMsg);
                throw new Error('Failed to install required Python packages. Please check your Python installation.');
            }
        }
        // Verify packages
        console.log('Verifying installed packages...');
        try {
            const verifyScript = `
import sys
import pkg_resources

packages = [
    'optuna',
    'pandas',
    'numpy',
    'matplotlib',
    'scikit-learn'
]

# Try to import ray, but don't fail if it's not available
try:
    import ray
    packages.append('ray')
except ImportError:
    print("Ray is not available, optimizer will run in single-machine mode only")

# Print installed versions
for package in packages:
    try:
        version = pkg_resources.get_distribution(package).version
        print(f"{package}: {version}")
    except pkg_resources.DistributionNotFound:
        print(f"{package}: Not installed")
            `;
            const verifyResult = await execAsync(`python -c "${verifyScript}"`);
            console.log('Installed packages:');
            console.log(verifyResult.stdout);
            return {
                success: true,
                message: 'Python packages installation completed!'
            };
        }
        catch (verifyError) {
            const verifyErrorMsg = verifyError instanceof Error ? verifyError.message : String(verifyError);
            console.error('Error verifying packages:', verifyErrorMsg);
            throw new Error('Failed to verify installed packages.');
        }
    }
    catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error('Error installing Python packages:', errorMsg);
        return {
            success: false,
            message: `Error: ${errorMsg}`
        };
    }
}
// Run the installation
installPythonPackages()
    .then(result => {
    if (result.success) {
        console.log('Success:', result.message);
    }
    else {
        console.error('Failed:', result.message);
        process.exit(1);
    }
})
    .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
});
