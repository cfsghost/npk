"use strict";

var fs = require('fs');
var util = require('util');

var Linker = module.exports = function() {
	var self = this;

	self.symTable = null;
};

Linker.prototype.link = function(filename, opts, callback) {
	var self = this;

	var output = [];

	function _gen(s) {
		output.push(s);
	}

	_gen(util.format('(function() {'));
	_gen(util.format('var _npk = this;'));
	_gen(util.format('_npk.syms = %s;', JSON.stringify(self.symTable.table)));
	_gen(util.format('_npk.load = %s;', function(symbol) {

		if (!_npk.syms[symbol])
			throw new Error('Undefined symbol \'' + symbol + '\'');

		var vm = require("vm");
		var path = require("path");
		var sym = _npk.syms[symbol];

		var module = {
			id: symbol,
			exports: {},
			loaded: false,
			exited: false,
			children: [],
			paths: []
		};

		var sandbox = {};

		for (var k in global) {
			sandbox[k] = global[k];
		}

		sandbox.exports = module.exports;
		sandbox.__filename = symbol;
		sandbox.__dirname = path.dirname(symbol);
		sandbox.module = module;
		sandbox.global = sandbox;
		sandbox.root = root;

		// TODO: override require function

		vm.runInNewContext(sym.data.replace(/^\#\!.*/, ""), sandbox, symbol);

		return module.exports;
	}));

	_gen(util.format('module.exports = %s;', function(symbol) {

		return _npk.load(symbol);
	}));
	_gen(util.format('})();'));

	fs.writeFile(filename, output.join(''), function(err) {
		callback(err);
	});
};
