grunt-ziti
==========

> Subsetting, optimizing and converting large font files to smaller web fonts.

[![Status](https://travis-ci.org/caiguanhao/grunt-ziti.svg?branch=master)](
https://travis-ci.org/caiguanhao/grunt-ziti)

This grunt plugin:

* can **gettext** from your HTML, JavaScript and CSS files
* **includes** source files of [font-optimizer](
https://bitbucket.org/philip/font-optimizer/src) (by Philip Taylor) -
to subset and optimize TTF font file
* will **download** [webify](https://github.com/ananthakumaran/webify)
(by Anantha Kumaran) binary file - to generate web font

## Getting Started

This plugin requires Grunt `~0.4.0`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out
the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains
how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as
install and use Grunt plugins. Once you're familiar with that process, you may
install this plugin with this command:

```shell
npm install grunt-ziti --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile
with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-ziti');
```

## Options

### subset

Type: `Boolean`
Default: `true`

Whether to make a subset of the source TTF font.

### optimize

Type: `Boolean`
Default: `true`

Whether to delete font data that is not necessary for their use in web
browsers. It will strip font name strings and PostScript glyph names. This
option works only when `subset` is `true`.

### convert

Type: `Boolean`
Default: `true`

Whether to convert the TTF font to three other web font formats, namely the
WOFF, EOT and SVG. If `subset` is `true`, it will convert the subsetted font.
Otherwise, it will convert the original font.

### deleteCharsFile

Type: `Boolean`
Default: `true`

Whether to remove the text file contains characters used when subsetting the
font.

### html

Type: `Object`

Options to be used when processing HTML files.

#### html.pattern

Type: `String`
Default: `'\\.html?$'`

RegExp to find HTML files.

#### html.classes

Type: `Array of Strings`

Get inner texts from HTML elements which have one of these class names.

#### html.attributes

Type: `Array of Strings`

Get attribute values from these attributes.

#### html.elements

Type: `Array of Strings`

Get inner texts from these HTML elements.

#### html.comments

Type: `Array of Strings`

If you set this option to `[ 'example' ]`, it will get texts between
`example {` and `}` in comments.

### js

Type: `Object`

Options to be used when processing JavaScript files.

#### js.pattern

Type: `String`
Default: `'\\.js$'`

RegExp to find JavaScript files.

#### js.functions

Type: `Array of Strings`

Get texts from these functions.
For example, `$ziti$('字'+'体');` will have `字体`.

#### js.comments

Type: `Array of Strings`

If you set this option to `[ 'example' ]`, it will get texts between
`example {` and `}` in comments.

### css

Type: `Object`

Options to be used when processing CSS files.

#### css.pattern

Type: `String`
Default: `'\\.css$'`

RegExp to find CSS files.

#### css.selectors

Type: `Array of Strings`

Get values from the last valid `content` property of each of these selectors.

#### css.comments

Type: `Array of Strings`

If you set this option to `[ 'example' ]`, it will get texts between
`example {` and `}` in comments.

### font

Type: `Object`

Options to be used when processing TTF font files.

#### font.pattern

Type: `String`
Default: `'\\.ttf$'`

#### font.chars

Type: `String`

Extra characters to be included when subsetting the font.

#### font.charsFilePattern

Type: `String`

RegExp to find text files. All characters in these text files will be included
when subsetting the font.

---

font-optimizer, webify and grunt-ziti use the MIT license:

* Copyright (c) 2009 Philip Taylor
* Copyright (c) 2013 Anantha Kumaran &lt;ananthakumaran@gmail.com&gt;
* Copyright (c) 2014 Cai Guanhao (Choi Goon-ho)

