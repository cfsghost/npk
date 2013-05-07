"use strict";

var Array = require('node-array');
var path = require('path');
var fs = require('fs');
var nld = require('nld');
var Compiler = require('./compiler');
var Linker = require('./linker');
var SymbolTable = require('./symbol_table');

var NPK = module.exports = function() {
	var self = this;

	self.targets = {};
	self.sourcePath = null;
	self.outputPath = null;
	self.objPath = null;
	self.compiler = new Compiler();
};

NPK.prototype.open = function(sourcePath, callback) {
	var self = this;

	self.sourcePath = sourcePath;

	// Reading and parsing package.json
	var jsonFile = path.join(sourcePath, 'package.json');
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

		// Create directories for output
		self.outputPath = path.join(sourcePath, 'out');
		self.objPath = path.join(self.outputPath, 'target.obj');
		var dirs = [
			self.outputPath,
			self.objPath
		];

		dirs.forEachAsync(function(dir, index, dirs, next) {

			fs.mkdir(dir, function() {
				next();
			});

			return true;
		}, function() {
			callback(null);
		});
	});
};

NPK.prototype.processAll = function(opts, callback) {
	var self = this;

	// Process all targets
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

			// Compile this target
			self.compile(targetFile, target, options, function() {
//				self.package(targetFile, target, options, function() {
					next();
//				});
			});
		});

		return true;
	}, function() {
		callback();
	});
};

NPK.prototype.compile = function(targetFile, target, opts, callback) {
	var self = this;

	var linker = new Linker();
	var symTable = linker.symTable = new SymbolTable();
	var sourceDir = self.sourcePath;
	var outputFile = path.join(self.outputPath, targetFile, targetFile);
	var entry = null;
	var files = [];

	// Preparing source list
	target.sources.forEachAsync(function(source, index, sources, next) {
		var sourceFile = path.join(sourceDir, source);

		if (index == 0) {
			entry = path.resolve(path.join(sourceDir, source));
			files.push(sourceFile);
			return;
		}

		files.push(sourceFile);

		// Read source file
		fs.readFile(sourceFile, function(err, code) {
			if (err)
				throw new Error('No such file ' + sourceFile);

			// Compile it
			self.compiler.compile(code.toString(), {}, function(err, data) {
				symTable.addSymbol(source, data);
				next();
			});
		});

		return true;
	}, function() {

		// Generate object file
		symTable.save(path.join(self.objPath, targetFile + '.no'), function() {

			linker.link(outputFile, {}, function() {
				callback();
			});
		});
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
