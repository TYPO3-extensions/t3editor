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
//define('TYPO3_MOD_PATH', 'sysext/tstemplate/ts/');
define('TYPO3_MOD_PATH', 'sysext/t3editor/lib/ts_codecompletion/');
$BACK_PATH='../../../../';

$MLANG['default']['tabs_images']['tab'] = 'ts1.gif';
$MLANG['default']['ll_ref']='LLL:EXT:tstemplate/ts/locallang_mod.php';

$MCONF['script']='class.extTsTemplatesLoader.php';
$MCONF['access']='admin';                // If this is changed so not only admin-users can manipulate templates, there need to be done something with the constant editor that is not allowed to 'clear all cache' then!!
$MCONF['name']='web_ts';

require_once ($BACK_PATH."init.php");
require_once ($BACK_PATH."template.php");
require_once(PATH_t3lib.'class.t3lib_page.php');


require_once ('class.ux_t3lib_tsparser_ext.php');

/**
 * loads the templates from the database so the codecompletion can display the predefined
 * properties from other templates. All templates along the rootline are accumulated and sent
 * in JSON to the client
 */
class extTsTemplatesLoader{
    
  // cache for the ts-setup in JSON-Format
  private $jsonTS;
  //private $finalArr = array();
  
  public function getJSONTree($pageId,$template_uid=0){
    global $tmpl,$tplRow;
    
    if(!$this->jsonTS){
        $tmpl = t3lib_div::makeInstance("t3lib_tsparser_ext");        
        $tmpl->tt_track = 0;        // Do not log time-performance information
        $tmpl->init();
    
                        // Gets the rootLine
        $sys_page = t3lib_div::makeInstance("t3lib_pageSelect");
        $rootLine = $sys_page->getRootLine($pageId);
        
        $tplRow = $tmpl->ext_getFirstTemplate($pageId,0);        // Get the row of the first VISIBLE template of the page. whereclause like the frontend.
        if (!is_array($tplRow))        {        // if there is no template...
                throw new Exception("no template found on this page!");
        }
        
        $templatesOnPage = $tmpl->ext_getAllTemplates($pageId,"");
        $templatesOnPageArr = explode(",",$templatesOnPage);
        if(count($templatesOnPageArr)== 0){
           return ""; 
        }
        
        // determine which template on the current page is currently edited
        // but how can we tell the parser not to include this template?
        /* 
        else if(count($templatesOnPageArr)>1){
            $settings = $GLOBALS['BE_USER']->getModuleData("web_ts","");
            $templateUid = $settings['templatesOnPage'];
        }else{
            $templateUid = $templatesOnPage[0]['uid'];
        }*/
        
        $tmpl->runThroughTemplates($rootLine,0);        // This generates the constants/config + hierarchy info for the template.
        
        // ts-setup & ts-constants of the currently edited template should not be included
        // therefor we have to delete the last template from the stack
        array_pop($tmpl->config);
        array_pop($tmpl->constants);

          
        // some of the lines are not clear to me... do we need them?
        //$tmpl->matchAlternative[] = 'dummydummydummydummydummydummydummydummydummydummydummy';        // This is just here to make sure that at least one element is in the array so that the tsparser actually uses this array to match.
        //$tmpl->regexMode = $this->pObj->MOD_SETTINGS["ts_browser_regexsearch"];
        // ??
        //$tmpl->fixedLgd=$this->pObj->MOD_SETTINGS["ts_browser_fixedLgd"];
        //$tmpl->matchAlternative = $this->pObj->MOD_SETTINGS['tsbrowser_conditions'];
        $tmpl->linkObjects = TRUE;
        $tmpl->ext_regLinenumbers = FALSE;
        $tmpl->bType=$bType;
        $tmpl->resourceCheck=1;
        $tmpl->uplPath = PATH_site.$tmpl->uplPath;
        $tmpl->removeFromGetFilePath = PATH_site;
        $tmpl->generateConfig();
        $this->jsonTS = $this->buildJSONTree($tmpl->setup);
    }
    return $this->jsonTS;
                
  }
  private function buildJSONTree($setupArr){
    $arr = $this->shrinkTreeRec($setupArr);
    $json = t3lib_div::array2json($arr);
    return $json;
  }
  
  // there is a lot of information in the templates which we do not need (linenumbers,...)
  // so we dont add them to the output
  private function shrinkTreeRec($arr){
    $sarr = array();
    while(list($key,$val)=each($arr)){
        $i = substr_count($key, ".");
        if($i == 0){  //type definition or value-assignment 
          if($val != ""){
            if(strlen($val) > 20)
              $val = substr($val, 0, 20);
            if(!is_array($sarr[$key])) 
              $sarr[$key] = array(); 
            $sarr[$key]['v'] = $val;
          }
        }else if($i == 1){ // subtree (definition of properties)
          $subTree = $this->shrinkTreeRec($val); 
          if($subTree != null){
            $key = str_replace(".","",$key);
            if(!is_array($sarr[$key])) 
              $sarr[$key] = array();
            $sarr[$key]['c'] = $subTree;
          }   
        } //in other cases do nothing (this information (lineNo,..) is not needed in the editor)
    }
    if(count($sarr)==0)return null;
    else return $sarr;
  }
}

$pageId = intval(t3lib_div::_GP('id'));
$extTsTempl = new extTsTemplatesLoader();
if($pageId){
  echo($extTsTempl->getJSONTree($pageId));
}else echo("parameter \"id\" is missing!");


if(defined('TYPO3_MODE') && $TYPO3_CONF_VARS[TYPO3_MODE]['XCLASS']['sysext/t3editor/lib/codecompletion/ext_ts_templatesloader.php']) {
        include_once($TYPO3_CONF_VARS[TYPO3_MODE]['XCLASS']['sysext/t3editor/lib/codecompletion/ext_ts_templatesloader.php']);
}
?>