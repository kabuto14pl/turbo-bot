/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';
import * as util from 'util';

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
        } catch (installError: unknown) {
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
            } catch (alternativeError: unknown) {
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
        } catch (verifyError: unknown) {
            const verifyErrorMsg = verifyError instanceof Error ? verifyError.message : String(verifyError);
            console.error('Error verifying packages:', verifyErrorMsg);
            throw new Error('Failed to verify installed packages.');
        }
    } catch (error: unknown) {
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
        } else {
            console.error('Failed:', result.message);
            process.exit(1);
        }
    })
    .catch(error => {
        console.error('Unexpected error:', error);
        process.exit(1);
    });
