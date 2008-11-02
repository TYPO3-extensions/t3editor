<?php

########################################################################
# Extension Manager/Repository config file for ext: "t3editor"
#
# Auto generated 08-09-2008 16:37
#
# Manual updates:
# Only the data in the array - anything else is removed by next write.
# "version" and "dependencies" must not be touched!
########################################################################

$EM_CONF[$_EXTKEY] = array(
	'title' => 'Editor with syntax highlighting',
	'description' => 'JavaScript-driven editor with syntax highlighting and codecompletion for TS. Based on CodeMirror.',
	'category' => 'be',
	'shy' => 0,
	'dependencies' => '',
	'conflicts' => '',
	'priority' => '',
	'loadOrder' => '',
	'module' => '',
	'state' => 'alpha',
	'internal' => 0,
	'uploadfolder' => 0,
	'createDirs' => '',
	'modify_tables' => '',
	'clearCacheOnLoad' => 0,
	'lockType' => '',
	'author' => 'Tobias Liebig, Stephan Petzl, Christian Kartnig',
	'author_email' => 'mail_typo3@etobi.de, spetzl@gmx.at, office@hahnepeter.de',
	'author_company' => '',
	'CGLcompliance' => '',
	'CGLcompliance_note' => '',
	'version' => '0.0.11',
	'_md5_values_when_last_written' => 'a:33:{s:7:"LICENSE";s:4:"d8dd";s:21:"class.tx_t3editor.php";s:4:"a2ba";s:17:"ext_localconf.php";s:4:"8acb";s:14:"ext_tables.php";s:4:"1ff4";s:16:"css/t3editor.css";s:4:"3d5d";s:22:"css/t3editor_inner.css";s:4:"a33f";s:23:"icons/loader_eeeeee.gif";s:4:"83a4";s:17:"jslib/t3editor.js";s:4:"d59d";s:24:"jslib/codemirror/LICENSE";s:4:"2c10";s:23:"jslib/codemirror/README";s:4:"e540";s:30:"jslib/codemirror/codemirror.js";s:4:"8729";s:26:"jslib/codemirror/editor.js";s:4:"1e72";s:35:"jslib/codemirror/parsejavascript.js";s:4:"23f6";s:35:"jslib/codemirror/parsetyposcript.js";s:4:"4808";s:28:"jslib/codemirror/parsexml.js";s:4:"276a";s:41:"jslib/codemirror/patch.codemirror055.diff";s:4:"50ce";s:26:"jslib/codemirror/select.js";s:4:"6b76";s:32:"jslib/codemirror/stringstream.js";s:4:"665b";s:38:"jslib/codemirror/tokenizejavascript.js";s:4:"7ea7";s:38:"jslib/codemirror/tokenizetyposcript.js";s:4:"43b8";s:24:"jslib/codemirror/undo.js";s:4:"e078";s:24:"jslib/codemirror/util.js";s:4:"b96d";s:43:"jslib/ts_codecompletion/completionresult.js";s:4:"f6bc";s:44:"jslib/ts_codecompletion/descriptionPlugin.js";s:4:"ab97";s:43:"jslib/ts_codecompletion/tscodecompletion.js";s:4:"e39f";s:35:"jslib/ts_codecompletion/tsparser.js";s:4:"aead";s:32:"jslib/ts_codecompletion/tsref.js";s:4:"d42d";s:53:"lib/ts_codecompletion/class.ux_t3lib_tsparser_ext.php";s:4:"2e1b";s:48:"lib/ts_codecompletion/ext_ts_templatesloader.php";s:4:"8f98";s:38:"lib/ts_codecompletion/pluginLoader.php";s:4:"9c81";s:37:"lib/ts_codecompletion/tsrefLoader.php";s:4:"d1b2";s:25:"tsref/Kopie von tsref.xml";s:4:"f78b";s:15:"tsref/tsref.xml";s:4:"5944";}',
	'constraints' => array(
		'depends' => array(
			'php' => '5.1.0-0.0.0',
			'typo3' => '4.3.0-4.3.99',
		),
		'conflicts' => array(
		),
		'suggests' => array(
		),
	),
	'suggests' => array(
	),
);

?>
