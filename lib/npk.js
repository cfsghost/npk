"usr strict";

var path = require('path');
var fs = require('fs');
var nld = require('nld');

var NPK = module.exports = function() {
};

NPK.prototype.open = function(targetPath, callback) {
	var jsonFile = path.join(targetPath, 'package.json');

	fs.readFile(jsonFile, 'utf8', function(err, data) {
		if (err) {
			callback(err);
			return;
		}

		callback(null, JSON.parse(data));
	});
};
