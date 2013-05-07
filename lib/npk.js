"use strict";

var path = require('path');
var fs = require('fs');
var nld = require('nld');

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
		self.outputPath = path.join(targetPath, 'out');

		fs.mkdir(self.outputPath, function() {
			callback(null);
		});
	});
};

NPK.prototype.link = function(opts, callback) {
	var self = this;

	for (var targetFile in self.targets) {
		var target = self.targets[targetFile];
		var entry = null;
		var files = [];

		// Preparing source list
		for (var index in target.sources) {
			if (index == 0) {
				entry = path.resolve(path.join(self.targetPath, target.sources[index]));
				files.push(path.join(self.targetPath, target.sources[index]));
				continue;
			}

			files.push(path.join(self.targetPath, target.sources[index]));
		}

		// Linking
		nld.cli.exec({
			_: files,
			e: entry,
			c: true,
			o: path.join(self.outputPath, targetFile)
		});
	}
};
