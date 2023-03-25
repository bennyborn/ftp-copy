const dotenv = require('dotenv');
const { Client } = require('basic-ftp');
const stream = require('stream');
const cliProgress = require('cli-progress');
let numCopied = 0;

dotenv.config();

function isValidFile(filename) {
    
    const allowedExt = process.env.SOURCE_EXTENSIONS.split(',');
    const fileExt = filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2);
    return allowedExt.includes(fileExt.toLowerCase());    
}

async function copyFiles(sourceClient, destClient, currentPath) {

    const sourceCurrentPath = (process.env.SOURCE_FOLDER + (currentPath?'/'+currentPath:'')).replace(/\/\//g, "/");
    const destCurrentPath = (process.env.DEST_FOLDER + (currentPath?'/'+currentPath:'')).replace(/\/\//g, "/");

    try {
        await destClient.ensureDir(destCurrentPath);
        await destClient.cd(destCurrentPath);
    } catch (error) {
        console.error("Error creating folder:", error.message);
    }

    await sourceClient.cd(sourceCurrentPath);

    const items = await sourceClient.list();

    for( const item of items ) {

        // traverse directory
        if( item.type === 2 ) {
            
            await copyFiles(sourceClient, destClient, item.name);

        // check if file has an allowed extension
        } else if (item.type === 1 && isValidFile(item.name)) {

            let shouldCopy = false;
            
            // check size differences
            try {
                const destSize = await destClient.size(item.name);
                if( destSize > 0 && destSize !== item.size ) {
                    shouldCopy = true;
                }
            } catch( e ) {
                shouldCopy = true;
            }

            if( shouldCopy ) {

                const readStream = new stream.PassThrough();
                const writeStream = new stream.PassThrough();
                
                readStream.on('error', (err) => {
                    console.error('Read stream error:', err);
                });

                writeStream.on('error', (err) => {
                    console.error('Write stream error:', err);
                });

                readStream.pipe(writeStream);
                
                // initialize progress bar
                const progress = new cliProgress.SingleBar({
                    hideCursor: true,
                    format: ' {bar} | {filename} | {percentage}% | ETA: {eta}s',
                }, cliProgress.Presets.shades_classic);
                
                // start progress bar and give it the total size
                progress.start(item.size, 0);

                // add handler to update the progress bar
                destClient.trackProgress(info => {
                    progress.update(info.bytesOverall,{filename: info.name});
                });

                // start actual file transfer
                await Promise.all([
                    sourceClient.download(readStream, item.name),
                    destClient.uploadFrom(writeStream, item.name),
                ]);

                // destroy update handler and progress bar
                destClient.trackProgress();
                progress.stop();

                numCopied++;
            }
        }
    }
}

async function main() {
    
    const sourceClient = new Client();
    const destClient = new Client();
    
    try {

        // connect to source FTP
        await sourceClient.access({
            host: process.env.SOURCE_HOST,
            user: process.env.SOURCE_USER,
            password: process.env.SOURCE_PASS,
            secure: false
        });

        // force library to use basic "LIST" command since our server does not work with "LIST -a"
        // we need to overwrite this property AFTER connecting to the source
        sourceClient.availableListCommands=['LIST'];
        
        // connect to destination FTP
        await destClient.access({
            host: process.env.DEST_HOST,
            user: process.env.DEST_USER,
            password: process.env.DEST_PASS,
            secure: false
        });

        console.log("Connections etablished, checking for files to copy...");
        
        await copyFiles(sourceClient, destClient, '');

        if( numCopied > 0 ) {
            console.log(`Finished successfully, copied ${numCopied} files.`);
        } else {
            console.log("Finished, nothing to copy.");
        }

    } catch (error) {

        console.error("Error: ", error.message);

    } finally {
        sourceClient.close();
        destClient.close();
    }
}

main();
