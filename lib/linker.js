"use strict";

var fs = require('fs');
var util = require('util');
var Compiler = require('./compiler');

var Linker = module.exports = function() {
	var self = this;

	self.symTable = null;
	self.compiler = new Compiler();
};

Linker.prototype.link = function(filename, opts, callback) {
	var self = this;

	var output = [];

	function _gen(s) {
		output.push(s);
	}

//	_gen(util.format('(function() {'));
	_gen(util.format('var _npk = this;'));
	_gen(util.format('_npk.cache = {};'));
	_gen(util.format('_npk.syms = %s;', JSON.stringify(self.symTable.table)));
	_gen(util.format('_npk.load = %s;', function(symbol) {

		if (!_npk.syms[symbol])
			throw new Error('Undefined symbol \'' + symbol + '\'');

		if (_npk.cache[symbol])
			return _npk.cache[symbol];

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

		// Override require function
		sandbox.require = function(mod) {
			if (mod.slice(0, 1) === '.') {
				var modPath = path.join(sandbox.__dirname, mod);
				try {
					return _npk.load(modPath);
				} catch(e) {
					return _npk.load(modPath + '.js');
				}
			} else {
				return require(mod);
			}
		};

		vm.runInNewContext(sym.data.replace(/^\#\!.*/, ""), sandbox, symbol);

		// Cache
		_npk.cache[symbol] = module.exports;

		return module.exports;
	}));

	// Entry point
	if (opts.entry) {
		_gen(util.format('module.exports = _npk.load(\'%s\');', opts.entry));
	} else {
		_gen(util.format('module.exports = %s;', function(symbol) {

			return _npk.load(symbol);
		}));
	}


//	if (opts.level < 3)
//		_gen(util.format('})();'));

	// Compile and compress
	self.compiler.compile(output.join(''), {
		output: filename,
		level: opts.level || 1
	}, function(err, data) {

		if (data) {
			fs.writeFile(filename, data, function(err) {
				callback(err);
			});
			return;
		}

		callback(err);
	});
};
