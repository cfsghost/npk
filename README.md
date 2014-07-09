NPK
===

Node.js packaging utility to bundle javascript and resource files.

Usage
-

Install NPK globally via NPM:

    npm install npk -g

Using command to package your project:

    npk tests/purejs/

Then you can find out the package in there:

    tests/purejs/out/app.js/

You can run packaged application directly:

    node tests/purejs/out/app.js/app.js

Three levels for packaging
-

__Remove Mock-up (default)__

    npk [project path]

__Mom doesn't recognize__

    npk [project path] --mom-doesnt-recognize

__Dad doesn't recognize__

At this level, NPK is packaging your project with C/C++ compiler, to generate a Node.js native module.

    npk [project path] --dad-doesnt-recognize

Note: Node.js native module has machine code inside, there is no way to work on cross-platform. If you need to support several various platform for your project, it must re-package on target platform what you want.

Note for Windows Users
-

Generating Node.js native module requires C/C++ compiler and Python development. You must install Visual Studio(Express version is fine) and Python 2.7(NOT 3.x) before using "Dad doesn' recognize" option.

How it works
-

NPK is similar to general compiler for computer language. With linking and managing symbol table, NPK can bundle multiple JavaScript source code files, that's just like that compiler is getting objects for making a single binary file.

Actual mechanism to package JavaScript source code files:

1. Getting source files defined in the 'npk_target' property in package.json.
2. Generating symbol table for storing source code files.
3. Linking and bundling symbol table files to generate a single file.

License
-
Licensed under the MIT License

Authors
-
Copyright(c) 2013 Fred Chien <<cfsghost@gmail.com>>
