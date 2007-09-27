<?php
/***************************************************************
*  Copyright notice
*
*  (c) 2007 Tobias Liebig <mail_typo3@etobi.de>
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
 * Provides a javascript-driven codeeditor with syntax highlighting for TS, HTML, CSS and more
 *
 * @author	Tobias Liebig <mail_typo3@etobi.de>
 *
 */


class tx_t3editor {
	
	var $filepath_editorlib = 'jslib/t3editor.js';
	var $filepath_editorcss = 'css/t3editor.css';
	
	
	var $editorCounter = 0;
	
	var $isEnabled = true;
	
	function tx_t3editor() {
		//  $this->checkEnabled();
	}
	
	function checkEnabled() {
		if (!$GLOBALS['BE_USER']->uc['disableT3Editor']) {
			$this->isEnabled = false;
		}
	}
	
	
	function setBEUCdisableT3Editor($state) {
		if ($GLOBALS['BE_USER']->uc['disableT3Editor'] != $state) {
			$GLOBALS['BE_USER']->uc['disableT3Editor'] = $state;
			$GLOBALS['BE_USER']->writeUC();
		}
	}
	
	
	function getCodeJS() {

		if ($this->isEnabled)	{
			
				// disable the obsolete tab.js to avoid conflict
			$GLOBALS['BE_USER']->uc['disableTabInTextarea'] = '1';
			
			$path_t3e = $GLOBALS['BACK_PATH'].
				t3lib_extmgm::extRelPath('t3editor');
			
			$code = '';
			$code.= '<script type="text/javascript">'.
				'var PATH_t3e = "'.$GLOBALS['BACK_PATH']. t3lib_extmgm::extRelPath('t3editor').'"; '.
				$debug.
				'</script>';
			
			$code.= '<script src="'.$path_t3e.'/jslib/Mochi.js" type="text/javascript"></script>'.
     			'<script src="'.$path_t3e.'/jslib/util.js" type="text/javascript"></script>'.
     			'<script src="'.$path_t3e.'/jslib/select.js" type="text/javascript"></script>'.
     			'<script src="'.$path_t3e.'/jslib/tokenize_ts.js" type="text/javascript"></script>'.
     			'<script src="'.$path_t3e.'/jslib/autocomplete.js" type="text/javascript"></script>';

				// include prototype-js-lib 
			$code.= '<script src="'.
				$GLOBALS['BACK_PATH'].
				'contrib/prototype/prototype.js'.
				'" type="text/javascript" id="prototype-script"></script>';
			
				// include editor-css
        	$code.= '<link href="'.
				$GLOBALS['BACK_PATH'].
				t3lib_extmgm::extRelPath('t3editor').
				 $this->filepath_editorcss.
				'" type="text/css" rel="stylesheet" />';
			
				// include editor-js-lib
			$code.= '<script src="'.
				$GLOBALS['BACK_PATH'].
				t3lib_extmgm::extRelPath('t3editor').
				$this->filepath_editorlib.
				'" type="text/javascript" id="t3editor-script"></script>';
						
			return $code;
		} else {
			return '';
		}
	}
	
	
	function getCodeEditor($name, $class='', $content='', $additionalParams='', $alt='') {
		$code = '';
		
		if ($this->isEnabled) {
			
			$this->editorCounter++;
			
			$class .= ' t3editor';
					
			$code.= '<div><textarea '.
				'id="t3editor_'.$this->editorCounter.'" '.
				'name="'.$name.'" '.
				(!empty($class)?'class="'.$class.'" ':'').
				$additionalParams.
				($alt!=''?' alt="'.$alt.'"':'').
				'>'.
				$content.
				'</textarea></div>';
			
			$code.= '<br/><br/><input type="checkbox" onchange="t3editor_toggleEditor(this,'.$this->editorCounter.');" onclick="t3editor_toggleEditor(this,'.$this->editorCounter.');" '.
				' id="t3editor_toggleEditor_'.$this->editorCounter.'_checkbox" />'.
				'<label for="t3editor_toggleEditor_'.$this->editorCounter.'_checkbox">'.
				'deactivate t3editor</label><br/><br/>';
				
			
		} else {
				// Fallback
			$code.= '<textarea '.
				'name="'.$name.'" '.
				(!empty($class)?'class="'.$class.'" ':'').
				$additionalParams.
				'>'.
				$content.
				'</textarea>';
		}
		
		return $code;
	}

}


// Include extension?
if (defined('TYPO3_MODE') && $TYPO3_CONF_VARS[TYPO3_MODE]['XCLASS']['sysext/t3editor/class.tx_t3editor.php'])   {
        include_once($TYPO3_CONF_VARS[TYPO3_MODE]['XCLASS']['sysext/t3editor/class.tx_t3editor.php']);
}


?>
