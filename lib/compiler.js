"use strict";

var UglifyJS = require('uglify-js');

var Compiler = module.exports = function() {
};

Compiler.prototype.compile = function(code, opts, callback) {
	var self = this;

	var options = {
		fromString: true,
		mangle: true
	};

	var result = UglifyJS.minify(code, options);

	process.nextTick(function() {
		callback(null, result.code);
	});
};
