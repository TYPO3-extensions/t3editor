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



/**
 * @property DOMDocument $xmlDoc
 *
 */
class TsrefLoader{
  
    private $xmlDoc;
    
  
    public function loadFile($filepath){
        $this->xmlDoc = new DOMDocument( "1.0", "utf-8" );
        $this->xmlDoc->load($filepath);
        
        $this->xmlDoc->saveXML();
    }
    public function getTypes(){
        $types = $this->xmlDoc->getElementsByTagName('type');
        $typeArr = array();
        foreach($types as $type){
            $typeId = $type->getAttribute('id');
            $properties = $type->getElementsByTagName('property');
            $propArr = array();
            foreach($properties as $property){
                $p = array();
                $p['name'] = $property->getAttribute('name');
                $p['type'] = $property->getAttribute('type');
                $propArr[$property->getAttribute('name')] = $p;
            }
            $typeArr[$typeId] = array();
            $typeArr[$typeId]['properties'] = $propArr;
            $typeArr[$typeId]['name'] = $type->getAttribute('name');
            if($type->hasAttribute('extends')){
                $typeArr[$typeId]['extends'] = $type->getAttribute('extends');
            }
        }
        return $this->array2json($typeArr);
    }
    
    public function getDescription($typeId,$parameterName=""){
        // getElementById does only work with schema
        $type = $this->getType($typeId);
        if($parameterName){  //retrieve propertyDescription
            $properties = $type->getElementsByTagName('property');
            foreach($properties as $propery){
              $propName = $propery->getAttribute('name');
              if($propName == $parameterName){
                  $descriptions = $propery->getElementsByTagName('description');
                  if($descriptions->length){
                        $description = $descriptions->item(0)->textContent;
                        $description = htmlspecialchars($description);
                        $description = str_replace("\n","<br/>",$description);
                      return $description;
                  }
              }
            
            }
        }else{  // retrieve typedescription
            /*
            $descriptions = $type->getElementsByTagName('description');
            if($descriptions->length){
                $description = $descriptions->item(0)->textContent;

                return htmlspecialchars($description);
            }*/
        }
        
        return "";
    }
    
    private function getType($typeId){
        $types = $this->xmlDoc->getElementsByTagName('type');
        foreach($types as $type){
            if($type->getAttribute('id')==$typeId)
                return $type;
        }
    }
    
    public function array2json($arr) {
        if(function_exists('json_encode'))
            return json_encode($arr); //Lastest versions of PHP already has this functionality.
        $parts = array();
        $is_list = false;
    
        //Find out if the given array is a numerical array
        $keys = array_keys($arr);
        $max_length = count($arr)-1;
        if(($keys[0] == 0) and ($keys[$max_length] == $max_length)) {//See if the first key is 0 and last key is length - 1
            $is_list = true;
            for($i=0; $i<count($keys); $i++) { //See if each key correspondes to its position
                if($i != $keys[$i]) { //A key fails at position check.
                    $is_list = false; //It is an associative array.
                    break;
                }
            }
        }
    
        foreach($arr as $key=>$value) {
            if(is_array($value)) { //Custom handling for arrays
                if($is_list) $parts[] = array2json($value); /* :RECURSION: */
                else $parts[] = '"' . $key . '":' . array2json($value); /* :RECURSION: */
            } else {
                $str = '';
                if(!$is_list) $str = '"' . $key . '":';
    
                //Custom handling for multiple data types
                if(is_numeric($value)) $str .= $value; //Numbers
                elseif($value === false) $str .= 'false'; //The booleans
                elseif($value === true) $str .= 'true';
                else $str .= '"' . addslashes($value) . '"'; //All other things
                // :TODO: Is there any more datatype we should be in the lookout for? (Object?)
    
                $parts[] = $str;
            }
        }
        $json = implode(',',$parts);
        
        if($is_list) return '[' . $json . ']';//Return numerical JSON
        return '{' . $json . '}';//Return associative JSON
    } 
}
?>
