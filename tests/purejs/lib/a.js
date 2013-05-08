"use strict";

var B = require('./b');

var name = 'Test variable';
var A = module.exports = function() {
	var x = name;
	console.log('a.js: A function');
	console.log(__dirname);
	console.log(x);
};

console.log('Entry point!');
