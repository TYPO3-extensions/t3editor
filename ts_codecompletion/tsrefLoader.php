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
define('TYPO3_MOD_PATH', 'sysext/t3editor/ts_codecompletion/');
$BACK_PATH='../../../';

$MLANG['default']['tabs_images']['tab'] = 'ts1.gif';
$MLANG['default']['ll_ref']='LLL:EXT:tstemplate/ts/locallang_mod.php';

$MCONF['script']='class.tsref.php';
$MCONF['access']='admin';		// If this is changed so not only admin-users can manipulate templates, there need to be done something with the constant editor that is not allowed to 'clear all cache' then!!
$MCONF['name']='web_ts';

require_once ($BACK_PATH."init.php");
require_once ($BACK_PATH."template.php");


class tsref{
  
  var $types; 
    
  public function getTypesJSON(){
    if(!$this->types)throw new exception('you have to load a tsref specification!');
    $res = array();
    foreach($this->types as $typeId => $typeArr){
      $res[$typeId] = array();
      $res[$typeId]['properties'] = array();
      if($typeArr[0]['ch']['property']){
        foreach($typeArr[0]['ch']['property'] as $i => $propArr){
          $propName = $propArr['attrs']['name'];
          $propType = $propArr['attrs']['type'];
          $res[$typeId]['properties'][$propName] = array();
          $res[$typeId]['properties'][$propName]['type'] = $propType;          
          
        }
      }
      //t3lib_div::debug($typeArr);
      if($typeArr[0]['attrs']['extends'])
        $res[$typeId]['extends'] = $typeArr[0]['attrs']['extends'];
    }
    //t3lib_div::debug($res);    
    return t3lib_div::array2json($res);
  }
  
  public function getDescription($typeId,$parameterName){
    $type = $this->getType($typeId);
    $propsArr = $type['ch']['property'];
    
    foreach($propsArr as $i=>$propArr){
      if($propArr['attrs']['name'] == $parameterName)
        if($propArr['ch'] && $propArr['ch']['description'])
          return $propArr['ch']['description'][0]['values'][0];
    } 
    return "";
  }
  
  public function getType($typeId){
    if(!$this->types)throw new exception('you have to load a tsref specification!');
    return $this->types[$typeId][0];
  }
  public function loadFile($filepath){
    $xml = t3lib_div::getURL($filepath);
    $tsrefArr = t3lib_div::xml2tree($xml,2);
    $this->types = $tsrefArr['tsref'][0]['ch'];
    //t3lib_div::debug($this->types);    
  }
  // temp conversion function- not needed in future
  public function transformOld2NewTsrefXml($filepath){
    $xml = t3lib_div::getURL($filepath);
    $cfgArr = t3lib_div::xml2tree($xml,2);
    $xml2;
    $typesArr = $cfgArr['tsref'][0]['ch']['type'];
    foreach($typesArr as $i => $typeArr){
      $xml2 .= '<'.$typeArr['attrs']['id'].' name="'.$typeArr['attrs']['name'].'" ';
      if($typeArr['attrs']['extends'])$xml2 .= 'extends="'.$typeArr['attrs']['extends'].'" ';
      $xml2 .= '>';  
      $xml2 .= $typeArr['XMLvalue'];      
      $xml2 .= '</'.$typeArr['attrs']['id'].'>';
    }
    $xml2 = '<tsref>'.$xml2.'</tsref>';
    t3lib_div::writeFile('generated.xml',$xml2);
    //t3lib_div::debug($cfgArr);    
  }
  
}
$action = t3lib_div::_GP('action');
$tsref = new tsref();
$tsref->loadFile('tsref.xml');
$typeArr = $tsref->getType('TEXT');
if($action == "getTypes"){
  echo($tsref->getTypesJSON());
}else if ($action == "getDescription"){
  $typeId = t3lib_div::_GP('typeId');
  $parameterName = t3lib_div::_GP('parameterName');
  if($typeId && $parameterName){
    echo($tsref->getDescription($typeId,$parameterName));
  }else
    echo("parameters \"typeId\" and \"parameterName\" have to be supplied!");
}else echo("parameter \"action\" is missing!");

  
/*if(defined('TYPO3_MODE') && $TYPO3_CONF_VARS[TYPO3_MODE]['XCLASS']['sysext/t3editor/class.tsTemplateSetup.php']) {
	include_once($TYPO3_CONF_VARS[TYPO3_MODE]['XCLASS']['sysext/t3editor/class.tsTemplateSetup.php']);
}*/



?>
