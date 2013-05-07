"use strict";

var fs = require('fs');

var SymbolTable = module.exports = function() {
	var self = this;

	self.table = {};
};

SymbolTable.prototype.addSymbol = function(symPath, data) {
	var self = this;

	var sym = self.table[symPath] = {
		data: data
	};

	return sym;
};

SymbolTable.prototype.save = function(filename, callback) {
	var self = this;

	fs.writeFile(filename, JSON.stringify(self.table), function(err) {
		callback(err);
	});
};
