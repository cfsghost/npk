"use strict";

var path = require('path');
var fs = require('fs');
var nld = require('nld');
var Array = require('node-array');

var NPK = module.exports = function() {
	var self = this;

	self.targets = {};
	self.targetPath = null;
	self.outputPath = null;
};

NPK.prototype.open = function(targetPath, callback) {
	var self = this;

	self.targetPath = targetPath;

	var jsonFile = path.join(targetPath, 'package.json');

	fs.readFile(jsonFile, 'utf8', function(err, data) {
		if (err) {
			callback(err);
			return;
		}

		var jsonData = JSON.parse(data);

		if (!('npk_target' in jsonData)) {
			callback(new Error('No target defined'));
			return;
		}

		self.targets = jsonData.npk_target;

		// Create directory for output
		self.outputPath = path.join(targetPath, 'out');
		fs.mkdir(self.outputPath, function() {
			callback(null);
		});
	});
};

NPK.prototype.processAll = function(opts, callback) {
	var self = this;

	var targets = Object.keys(self.targets);

	targets.forEachAsync(function(targetFile, index, targets, next) {
		var target = self.targets[targetFile];

		// Preparing options
		var options = {
			type: target.type
		};

		// Create target directory
		var targetDir = path.join(self.outputPath, targetFile);
		fs.mkdir(targetDir, function() {
			self.compile(targetFile, target, options, function() {
				self.package(targetFile, target, options, function() {
					next();
				});
			});
		});

		return true;
	}, function() {
		callback();
	});
};

NPK.prototype.compile = function(targetFile, target, opts, callback) {
	var self = this;

	var targetDir = self.targetPath
	var outputFile = path.join(self.outputPath, targetFile, targetFile);
	var entry = null;
	var files = [];

	// Preparing source list
	for (var index in target.sources) {
		if (index == 0) {
			entry = path.resolve(path.join(targetDir, target.sources[index]));
			files.push(path.join(targetDir, target.sources[index]));
			continue;
		}

		files.push(path.join(targetDir, target.sources[index]));
	}

	// Linking
	var linkOpts = {
		_: files,
		c: true,
		o: outputFile
	};

	if (opts.type == 'module') {
		linkOpts.e = entry;
	} else {
		linkOpts.x = entry;
	}

	nld.cli.exec(linkOpts);

	process.nextTick(function() {
		callback();
	});
};

NPK.prototype.package = function(targetFile, target, opts, callback) {
	var self = this;

	if (!target.data) {
		callback();
		return;
	}

	// Packaging files which are not source code
	var outputPath = path.join(self.outputPath, targetFile);
	target.data.forEachAsync(function(filePath, index, data, next) {
		var dirPath = path.dirname(filePath);
		var filename = path.basename(filePath);

		console.log(dirPath, filename);

		// Create directory
		fs.mkdir(path.join(outputPath, dirPath), function() {

			// Copying file
			fs.createReadStream(path.join(self.targetPath, filePath)).pipe(fs.createWriteStream(path.join(outputPath, dirPath, filename)));

			next();
		});

		return true;
	}, function() {

		// Create a new package.json
		callback();
	});
};
