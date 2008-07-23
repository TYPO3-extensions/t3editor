<?php
/***************************************************************
*  Copyright notice
*
*  (c) 2008 Stephan Petzl <spetzl@gmx.at> and Christian Kartnig <office@hahnepeter.de> 
*  All rights reserved
*
*  This script is part of the TYPO3 project. The TYPO3 project is
*  free software; you can redistribute it and/or modify
*  it under the terms of the GNU General Public License as published by
*  the Free Software Foundation; either version 2 of the License, or
*  (at your option) any later version.
*
*  The GNU General Public License can be found at
*  http://www.gnu.org/copyleft/gpl.html.
*  A copy is found in the textfile GPL.txt and important notices to the license
*  from the author is found in LICENSE.txt distributed with these scripts.
*
*
*  This script is distributed in the hope that it will be useful,
*  but WITHOUT ANY WARRANTY; without even the implied warranty of
*  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
*  GNU General Public License for more details.
*
*  This copyright notice MUST APPEAR in all copies of the script!
***************************************************************/



unset($MCONF);
define('TYPO3_MOD_PATH', 'sysext/t3editor/lib/ts_codecompletion/');
$BACK_PATH='../../../../';

//$MCONF['script']='class.tsref.php';
$MCONF['access']='admin';		// If this is changed so not only admin-users can manipulate templates, there need to be done something with the constant editor that is not allowed to 'clear all cache' then!!
$MCONF['name']='web_ts';

require_once ($BACK_PATH."init.php");
require_once ($BACK_PATH."template.php");


class PluginLoader{
  public function PluginLoader(){
    
  }
  
  public function loadPlugins(){
    $pluginArr = array();
    //debug($GLOBALS['TYPO3_CONF_VARS']);
		if (is_array ($GLOBALS['TYPO3_CONF_VARS']['EXTCONF']['t3editor']['plugins'])) {
			foreach ($GLOBALS['TYPO3_CONF_VARS']['EXTCONF']['t3editor']['plugins'] as $plugin) {
				$pluginArr[] = $plugin;
			}
		}
		return t3lib_div::array2json($pluginArr);
  }
  
}
$action = t3lib_div::_GP('action');
$piLoader = new PluginLoader();
if($action == "getPlugins"){
  echo $piLoader->loadPlugins();  
}else echo("parameter \"action\" is missing!");

  
/*if(defined('TYPO3_MODE') && $TYPO3_CONF_VARS[TYPO3_MODE]['XCLASS']['sysext/t3editor/class.tsTemplateSetup.php']) {
	include_once($TYPO3_CONF_VARS[TYPO3_MODE]['XCLASS']['sysext/t3editor/class.tsTemplateSetup.php']);
}*/



?>
