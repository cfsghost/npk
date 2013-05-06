"use strict";

var path = require('path');
var fs = require('fs');
var nld = require('nld');

var NPK = module.exports = function() {
	var self = this;

	self.targets = {};
};

NPK.prototype.open = function(targetPath, callback) {
	var self = this;
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

		callback(null);
	});
};

NPK.prototype.link = function(opts, callback) {
	var self = this;

	for (var file in self.targets) {
		var target = self.targets[file];
		var entry = null;
		var files = [];

		// Preparing source list
		for (var index in target.sources) {
			if (index == 0) {
				entry = target.sources[index];
				continue;
			}

			files.push(target.sources[index]);
		}

		console.log(entry);
		console.log(files);

		// Linking
//		nld.cil();
	}
};
