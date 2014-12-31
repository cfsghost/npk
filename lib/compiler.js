"use strict";

var fs = require('fs');
var util = require('util');
var child_process = require('child_process');
var path = require('path');
var fsextra = require('fs-extra');
var UglifyJS = require('uglify-js');

var Compiler = module.exports = function() {
};

Compiler.prototype.compile = function(code, opts, callback) {
	var self = this;

	function convertCodeToHex(code) {
		var data = [];
		var buffer = new Buffer(code);

		for (var index = 0; index < buffer.length; index++) {
			data.push('0x' + buffer[index].toString(16));
		}

		return data.join(',');
	}
	
	var options = {
		fromString: true,
		mangle: true
	};

	var result = UglifyJS.minify(code, options);

	// Level 3 for generating binary file
	if (opts.level == 3) {
		var workingPath = path.dirname(opts.output)

		// Generate C++ code
		var output = [];
		output.push(util.format('#include <v8.h>'));
		output.push(util.format('#include <node.h>'));
		output.push(util.format('namespace NPK {'));
		output.push(util.format('using namespace node;'));
		output.push(util.format('using namespace v8;'));

		var hexCode = convertCodeToHex(util.format('(function() { %s return module.exports; })()', result.code));
		output.push(util.format('static char code[] = { %s };', hexCode));
		output.push(util.format('static void init(Handle<Object> target) {'));
		output.push(util.format('Handle<String> source = String::New(code);'));
		output.push(util.format('Handle<Value> argv[1] = { source };'));
		output.push(util.format('Handle<Value> value = MakeCallback(Context::GetCurrent()->Global(), "eval", 1, argv);'));
		output.push(util.format('Handle<Object> exports = value->ToObject();'));
		output.push(util.format('Local<Array> names = exports->GetOwnPropertyNames();'));
		output.push(util.format('for (uint32_t i = 0; i < names->Length(); ++i) {'));
		output.push(util.format('target->Set(names->Get(i), exports->Get(names->Get(i)->ToString()));'));
		output.push(util.format('}'));
		output.push(util.format('}'));

		output.push(util.format('NODE_MODULE(npk, init);'));
		output.push(util.format('}'));

		var sourceFile = path.join(workingPath, 'output.cpp');
		var makefile = path.join(workingPath, 'binding.gyp');
		fs.writeFile(sourceFile, output.join('\n'), function(err) {

			// Preparing makefile
			self.generateMakefile(makefile, function() {

				// Compile it node
				var gyp = child_process.spawn('node-gyp', [ 'configure', 'build' ], { cwd: workingPath });
	
				// Standard output
				gyp.stdout.pipe(process.stdout);
				gyp.stderr.pipe(process.stderr);

				gyp.on('close', function() {

					// Copying binary file
					fs.createReadStream(path.join(workingPath, 'build', 'Release', 'npk.node'))
						.on('close', function() {

							// Remove uneccessary files
							fs.unlinkSync(sourceFile);
							fs.unlinkSync(makefile);
							fsextra.remove(path.join(workingPath, 'build'), function() {

								// Generate app.js
								var appjs = [
									'global.require = require;',
									'global.module = module;',
									'require(\'./npk.node\');'
								];

								fs.writeFile(path.join(workingPath, 'app.js'), appjs.join(''), function(err) {
									callback(err);
								});
							});
						})
						.pipe(fs.createWriteStream(path.join(workingPath, 'npk.node')));
				});
			});
		});

		return;
	}

	process.nextTick(function() {
		callback(null, result.code);
	});
};

Compiler.prototype.generateMakefile = function(filename, callback) {
	var self = this;

	var binding = {
		'targets': [
			{
				'target_name': 'npk',
				'sources': [ 'output.cpp' ]
			}
		]
	};

	fs.writeFile(filename, JSON.stringify(binding), function(err) {
		callback(err);
	});
};
