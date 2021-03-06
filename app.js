const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { program } = require('commander');

// Store starting time
const timeStarted = Date.now();

program
    .option('-s, --size <integer>', 'set desired size in KB, max allowed value is 2048')
    .option('-v, --verbose', 'launch in verbose mode');


program.parse();

const options = program.opts();
const requestedSize = Number.parseInt(options.size);
let totalImages = 0;
let imagesProcessed = 0;

main();

function main() {
    spinner();

    // Check if size parameter exists and if it's a number
    if (requestedSize) {
        if (requestedSize <= 2048) {
            console.log('\x1b[35m%s\x1b[0m', '\nDesired size =>', `~ ${requestedSize} KB`);
        } else {
            console.log('\x1b[31m%s\x1b[0m', `\nError: max allowed KB value is 2048"\n`);
            process.exit();
        }
    } else {
        console.log('\x1b[31m%s\x1b[0m', `\nError: you must provide a size in KB. Example: node app.js -s 500"\n`);
        process.exit();
    }

    // Get images path
    const sourcePath = path.join(__dirname, 'input');
    const destinationPath = path.join(__dirname, 'output');

    // Read images path
    fs.readdir(sourcePath, (err, files) => {
        if (err)
            return console.log('\x1b[31m%s\x1b[0m', `\nUnable to scan directory: ${err}`);
        
        // Parse files
        if (files.length) {
            // Store all images (jpegs)
            const images = Object.values(files).filter(file => file.split('.')[1] == 'jpg');

            if (images.length) {
                console.log('\x1b[36m%s\x1b[0m', `\nProcessing ${images.length} files...`);

                images.forEach(file => {
                    totalImages = images.length;
                    // Get path
                    const filePath = `${sourcePath}/${file}`;

                    // Get file statistics
                    fs.stat(filePath, (error, stats) => {
                        if (error)
                            console.log('\x1b[31m%s\x1b[0m', `Unable to process file ${file}: ${error}`);

                        // Parse file
                        fs.readFile(filePath, (err, data) => {
                            if (err)
                                return console.error(err);

                            // If original file size is smaller than requested size, skip process
                            if (stats.size <= requestedSize * 1000) {
                                imagesProcessed++;
                                console.log('\x1b[33m%s\x1b[0m', `\n${file} is equal or smaller than requested size , skipping file...`);
                            } else {
                                let initialQuality = 100;
                                compressImage(file, stats, data, destinationPath, initialQuality);
                            }
                        })
                    });
                });
            } else {
                console.log('\x1b[33m%s\x1b[0m', '\nWarning: No jpegs found \n');
                process.exit();
            }
        } else {
            console.log('\x1b[33m%s\x1b[0m', '\nWarning: Images folder is empty \n');
            process.exit();
        }
    });
}

async function compressImage(file, stats, data, destinationPath, quality) {
    sharp(data)
    .jpeg({
        quality: quality,
        chromaSubsampling: '4:2:0'
    })
    .resize(1500)
    .toFile(`${destinationPath}/${file}`, (err, info) => {
        if (err)
            return console.log('\x1b[31m%s\x1b[0m', `Unable to process file ${file}: ${err}`);

        let threshold = getPercentage(getBytes(requestedSize), parseInt(info.size));

        if (threshold < 95) {
            quality--;

            if (options.verbose) {
                clearLine();
                
                console.log(`${file} still too big, with a size of ${formatBytes(info.size)}, decreasing quality to: ${quality}`);
            }

            compressImage(file, stats, data, destinationPath, quality);
        } else {
            clearLine();

            console.log('\n\x1b[36m%s\x1b[0m', 'Done!');
            console.log('\x1b[34m%s\x1b[0m', `Filename: ${file}`);
            console.log('\x1b[33m%s\x1b[0m', `Quality: ${quality}`);
            console.log('\x1b[32m%s\x1b[0m',`${formatBytes(stats.size)} => ${formatBytes(info.size)} \n`);

            // Increase image processed counter
            imagesProcessed++;

            // When all images are processed, print elapsed time
            if (imagesProcessed == totalImages) {
                const elapsedTime = parseInt((Date.now() - timeStarted) / 1000);

                if (elapsedTime > 60) {
                    console.log('\x1b[35m%s\x1b[0m', `All done! Process took about ${Math.round(elapsedTime / 60)} minutes.\n`);
                } else {
                    console.log('\x1b[35m%s\x1b[0m', `All done! Process took ${elapsedTime} seconds.\n`);
                }
                process.exit();
            }

            return;
        }
    });
}

// Convert from bytes
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Convert to bytes
function getBytes(value) {
    return value * 1024;
}

// Get percentage
function getPercentage(partialValue, totalValue) {
    return parseInt((100 * partialValue) / totalValue);
} 

// Animated spinner
function spinner() {
    const symbols = ['-', '\\', '|', '/'];
    let i = 0;
    
    return setInterval(() => {
        process.stdout.write('\r' + symbols[i++] + ' ');
        i &= 3;
    }, 100);
}

function clearLine() {
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
}
