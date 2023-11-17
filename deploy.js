const fs = require('fs');
const archiver = require('archiver');
const { exec } = require('child_process');

// File name of the archive
const archiveName = 'Archive.zip';

// Delete existing archive if it exists
if (fs.existsSync(archiveName)) {
	fs.unlinkSync(archiveName);
	console.log(`${archiveName} deleted.`);
}

// Create a file to stream archive data to.
const output = fs.createWriteStream(archiveName);
const archive = archiver('zip', {
	zlib: { level: 9 } // Sets the compression level
});

// Listen for archive completion
archive.on('end', () => {
	console.log('Archive created successfully.');

	exec('open .', (error, stdout, stderr) => {
		if (error) {
			console.error(`Error: ${error.message}`);
			return;
		}
		if (stderr) {
			console.error(`Stderr: ${stderr}`);
			return;
		}
		console.log(`Stdout: ${stdout}`);
	});

});

// Pipe archive data to the file
archive.pipe(output);

// Add specific files
archive.file('index.js', { name: 'index.js' });
archive.file('flight.service.js', { name: 'flight.service.js' });
archive.file('utils.js', { name: 'utils.js' });
archive.file('package.json', { name: 'package.json' });

// Add contents of node_modules
archive.directory('node_modules/', 'node_modules');

// Finalize the archive
archive.finalize();
