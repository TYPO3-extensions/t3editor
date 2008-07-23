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

require_once(PATH_t3lib."class.t3lib_tsparser_ext.php");
class ux_t3lib_tsparser_ext extends t3lib_tsparser_ext {
  
  var $currentTemplateUid;
  
  /**
	 * Checks if the template ($row) has some included templates and after including them it fills the arrays with the setup
	 * Builds up $this->rowSum
	 *
	 * @param	array		A full TypoScript template record (sys_template/static_template/forged "dummy" record made from static template file)
	 * @param	string		A list of already processed template ids including the current; The list is on the form "[prefix]_[uid]" where [prefix] is "sys" for "sys_template" records, "static" for "static_template" records and "ext_" for static include files (from extensions). The list is used to check that the recursive inclusion of templates does not go into circles: Simply it is used to NOT include a template record/file which has already BEEN included somewhere in the recursion.
	 * @param	array		The PID of the input template record
	 * @param	string		The id of the current template. Same syntax as $idList ids, eg. "sys_123"
	 * @param	string		Parent template id (during recursive call); Same syntax as $idList ids, eg. "sys_123"
	 * @return	void
	 * @see runThroughTemplates()
	 */
	function processTemplate($row, $idList,$pid,$templateID='',$templateParent='')	{

  
  		// Adding basic template record information to rowSum array
		$this->rowSum[]=Array($row['uid'],$row['title'],$row['tstamp']);

			// Processing "Clear"-flags
		if ($row['clear'])	{
			$clConst = $row['clear']&1;
			$clConf = $row['clear']&2;
			if ($clConst)	{
				$this->constants = Array();
				$this->clearList_const=array();
			}
			if ($clConf)	{
				$this->config = Array();
				$this->hierarchyInfoToRoot = Array();
				$this->clearList_setup=array();

				$this->editorcfg = Array();
				$this->clearList_editorcfg=array();
			}
		}

			// Include static records (static_template) or files (from extensions) (#1/2)
		if (!$row['includeStaticAfterBasedOn'])		{		// NORMAL inclusion, The EXACT same code is found below the basedOn inclusion!!!
			$this->includeStaticTypoScriptSources($idList,$templateID,$pid,$row);
		}

			// Include "Based On" sys_templates:
		if (trim($row['basedOn']))	{		// 'basedOn' is a list of templates to include
				// Manually you can put this value in the field and then the based_on ID will be taken from the $_GET var defined by '=....'.
				// Example: If $row['basedOn'] is 'EXTERNAL_BASED_ON_TEMPLATE_ID=based_on_uid', then the global var, based_on_uid - given by the URL like '&based_on_uid=999' - is included instead!
				// This feature allows us a hack to test/demonstrate various included templates on the same set of content bearing pages. Used by the "freesite" extension.
			$basedOn_hackFeature = explode('=',$row['basedOn']);
			if ($basedOn_hackFeature[0]=='EXTERNAL_BASED_ON_TEMPLATE_ID' && $basedOn_hackFeature[1])		{
				$id = intval(t3lib_div::_GET($basedOn_hackFeature[1]));
				if ($id && !t3lib_div::inList($idList,'sys_'.$id))	{	// if $id is not allready included ...
					$res = $GLOBALS['TYPO3_DB']->exec_SELECTquery('*', 'sys_template', 'uid='.$id.' '.$this->whereClause);
					if ($subrow = $GLOBALS['TYPO3_DB']->sql_fetch_assoc($res))	{	// there was a template, then we fetch that
						$this->versionOL($subrow);
						if (is_array($subrow))	{
							$this->processTemplate($subrow,$idList.',sys_'.$id,$pid, 'sys_'.$id,$templateID);
						}
					}
					$GLOBALS['TYPO3_DB']->sql_free_result($res);
				}
			} else {	// NORMAL OPERATION:
				$basedOnArr = t3lib_div::intExplode(',',$row['basedOn']);
				while(list(,$id)=each($basedOnArr))	{	// traversing list
					if (!t3lib_div::inList($idList,'sys_'.$id))	{	// if $id is not allready included ...
						$res = $GLOBALS['TYPO3_DB']->exec_SELECTquery('*', 'sys_template', 'uid='.intval($id).' '.$this->whereClause);
						if ($subrow = $GLOBALS['TYPO3_DB']->sql_fetch_assoc($res))	{	// there was a template, then we fetch that
							$this->versionOL($subrow);
							if (is_array($subrow))	{
								$this->processTemplate($subrow,$idList.',sys_'.$id,$pid, 'sys_'.$id,$templateID);
							}
						}
						$GLOBALS['TYPO3_DB']->sql_free_result($res);
					}
				}
			}
		}

			// Include static records (static_template) or files (from extensions) (#2/2)
		if ($row['includeStaticAfterBasedOn'])		{
			$this->includeStaticTypoScriptSources($idList,$templateID,$pid,$row);
		}

			// Creating hierarchy information; Used by backend analysis tools
		$this->hierarchyInfo[] = $this->hierarchyInfoToRoot[] = array(
			'root'=>trim($row['root']),
			'next'=>$row['nextLevel'],
			'clConst'=>$clConst,
			'clConf'=>$clConf,
			'templateID'=>$templateID,
			'templateParent'=>$templateParent,
			'title'=>$row['title'],
			'uid'=>$row['uid'],
			'pid'=>$row['pid'],
			'configLines' => substr_count($row['config'], chr(10))+1
		);

			// Adding the content of the fields constants (Constants), config (Setup) and editorcfg (Backend Editor Configuration) to the internal arrays.
		// stoefln: just add the config & constants if its not the template which is currently edited
		//debug($this->currentTemplateUid."=>".$row['uid']);
		if($this->currentTemplateUid != $row['uid']){
		  $this->constants[] = $row['constants'];
      $this->config[] = $row['config'];
    }//else
      //debug($row['config']);
		// stoefln end
		
    if ($this->parseEditorCfgField)		$this->editorcfg[] = $row['editorcfg'];

			// For backend analysis (Template Analyser) provide the order of added constants/config/editorcfg template IDs
		$this->clearList_const[]=$templateID;
		$this->clearList_setup[]=$templateID;
		if ($this->parseEditorCfgField)		$this->clearList_editorcfg[]=$templateID;

			// Add resources and sitetitle if found:
		if (trim($row['resources']))	{
			$this->resources = $row['resources'].','.$this->resources;
		}
		if (trim($row['sitetitle']))	{
			$this->sitetitle = $row['sitetitle'];
		}
			// If the template record is a Rootlevel record, set the flag and clear the template rootLine (so it starts over from this point)
		if (trim($row['root']))	{
			$this->rootId = $pid;
			$this->rootLine = Array();
		}
			// If a template is set to be active on the next level set this internal value to point to this UID. (See runThroughTemplates())
		if ($row['nextLevel'])	{
			$this->nextLevel = $row['nextLevel'];
		} else {
			$this->nextLevel = 0;
		}
	}

}
if (defined('TYPO3_MODE') && $TYPO3_CONF_VARS[TYPO3_MODE]['XCLASS']['ext/t3editor/class.ux_t3lib_tsparser_ext.php']) {
	include_once($TYPO3_CONF_VARS[TYPO3_MODE]['XCLASS']['ext/t3editor/class.ux_t3lib_tsparser_ext.php']);
}
?>
