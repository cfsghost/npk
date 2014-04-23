"use strict";

var Array = require('node-array');
var path = require('path');
var fs = require('fs');
var Compiler = require('./compiler');
var Linker = require('./linker');
var SymbolTable = require('./symbol_table');
var glob = require('glob')

var NPK = module.exports = function() {
	var self = this;

	self.packageInfo = null;
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

		var jsonData = self.packageInfo = JSON.parse(data);

		if (!('npk_target' in jsonData)) {
			callback(new Error('No target defined'));
			return;
		}

		self.targets = jsonData.npk_target;
		delete jsonData['npk_target'];

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
			type: target.type,
			level: opts.level || 1
		};

		// Create target directory
		var targetDir = path.join(self.outputPath, targetFile);
		fs.mkdir(targetDir, function() {

			// Compile this target
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

	var linker = new Linker();
	var symTable = linker.symTable = new SymbolTable();
	var sourceDir = self.sourcePath;
	var outputFile = path.join(self.outputPath, targetFile, targetFile);
	var entry = null;
	var files = [];
	var _sources = [];

	target.sources.forEach(function(source){
		_sources = _sources.concat(glob(source, {mark: true, cwd: sourceDir, sync: true}))
	})

	// Preparing source list
	_sources.forEachAsync(function(source, index, sources, next) {

		var sourceFile = path.join(sourceDir, source);

		if (index == 0) {
			//entry = path.resolve(path.join(sourceDir, source));
			entry = source;
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
			var linkOpts = {
				entry: entry,
				level: opts.level || 1
			};

			// bundle all object files
			linker.link(outputFile, linkOpts, function() {

				// Setting entry point in package information
				self.packageInfo.main = targetFile;

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

	var outputPath = path.join(self.outputPath, targetFile);

	// Generated package.json
	fs.writeFile(path.join(outputPath, 'package.json'), JSON.stringify(self.packageInfo), function(err) {

		// Packaging files which are not source code
		target.data.forEachAsync(function(filePath, index, data, next) {
			var dirPath = path.dirname(filePath);
			var filename = path.basename(filePath);

			// Create directory
			fs.mkdir(path.join(outputPath, dirPath), function() {

				// Copying file
				fs.createReadStream(path.join(self.sourcePath, filePath)).pipe(fs.createWriteStream(path.join(outputPath, dirPath, filename)));

				next();
			});

			return true;
		}, function() {

			// Create a new package.json
			callback();
		});
	});
};
