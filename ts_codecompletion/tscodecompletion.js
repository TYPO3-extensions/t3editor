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

var TsCodeCompletion = function(codeMirror,outerdiv) {

  // private Vars
	var tsRef  = new TsRef();
	var mirror = codeMirror;
	var options = {ccWords : 10};
	// t3editor index (=0 if there is just one editor on the page, should be set from outside)
  var index = 0;
  
 
  var currWord = 0;
  var cc_up;
  var cc_down;
  var proposals;
  var compResult;
  var cc = 0;
  var filter = "";
  
  // load the external templates ts-setup into extTsObjTree
  var extTsObjTree = new Object();
  var parser = new TsParser(tsRef,extTsObjTree);
  loadExtTemplatesAsync();
    
  // plugin-array will be retrieved through AJAX from the conf array
  // plugins can be attached by regular TYPO3-extensions
  var plugins = [];

  // we add the description plugin here because its packed with the codecompletion currently
  // maybe we will swap it to an external plugin in future
  var plugin = new Object();
  plugin.extpath = PATH_t3e;
  plugin.classpath =  'ts_codecompletion/descriptionPlugin.js';
  plugin.classname = 'DescriptionPlugin';
  
  plugins.push(plugin);
  
  
  // to roll back linebreaks inserted by hitting enter, the current node has to be stored before the codecompletion outside of the eventlistener
  var nodeBeforeInsert;
  
  
  var codeCompleteBox = new Element("DIV", {
  	"class": "t3e_codeCompleteBox"
  });
  codeCompleteBox.hide();
  outerdiv.appendChild(codeCompleteBox);

  var toolbardiv = new Element("DIV", {
		"class": "t3e_toolbar"
	});
  toolbardiv.show();
  outerdiv.appendChild(toolbardiv);

  // load the external xml-reference
  tsRef.loadTsrefAsync();
  
  // plugins will be provided with the pluginContext
  var pluginContext = new Object();
  pluginContext.outerdiv = outerdiv;
  pluginContext.codeCompleteBox = codeCompleteBox;
  pluginContext.toolbardiv = toolbardiv;
  pluginContext.tsRef = tsRef;
  pluginContext.parser = parser;
  pluginContext.plugins = plugins;
  
  // should we use a pluginmanager so no for loops are required on each hook?
  // e.g. pluginmanager.call('afterKeyUp',....);
  loadPluginArray();                   
  
  /* loads the array of registered codecompletion plugins
   * to register a plugin you have to add an array to the localconf
   * $TYPO3_CONF_VARS['EXTCONF']['t3editor']['plugins'][] = array( 'extpath' => t3lib_div::getIndpEnv('TYPO3_SITE_URL').t3lib_extMgm::siteRelPath($_EXTKEY),
                                                              'classpath' => 'js/my_plugin.js',
                                                              'classname'=> 'MyPlugin');
   */
  function loadPluginArray(){
    var url = PATH_t3e+'ts_codecompletion/pluginLoader.php?action=getPlugins';
    new Ajax.Request(url, {
      method: 'get',
      onSuccess: function(transport) {
        var loadedPlugins = eval('('+ transport.responseText +')');
        plugins = plugins.concat(loadedPlugins);
        // register an internal plugin       
        loadPlugins();
      }
    });
  }
  /* instantiates all plugins and adds the instances to the plugin array
  */
  function loadPlugins(){
    for(var i=0;i<plugins.length;i++){
      var script = document.createElement('script');
      script.setAttribute('type','text/javascript');
      script.setAttribute('src',plugins[i].extpath+plugins[i].classpath);
      document.getElementsByTagName('head')[0].appendChild(script);
      window.setTimeout(makeInstance.bind(this,plugins[i],i),1000);
    } 
  }
  /* makes a single plugin instance
  */
  function makeInstance(plugin,i){
    try{
      var localname = "plugins[" + i + "].obj";
      eval(localname+' = new '+plugin.classname+'();');
      var obj = eval(localname);
      console.log("initialized a new "+plugin.classname+" in "+localname);
    }catch(e){
      throw("error occured while trying to make new instance of \""+plugin.classname+"\"! maybee synthax error or wrong filepath?");
      return;
    }
    obj.init(pluginContext,plugin);
  }
  /**
   * all external templates along the rootline have to be loaded, 
   * this function retrieves the JSON code by comitting a AJAX request
   */    
  function loadExtTemplatesAsync(){
    var url = PATH_t3e+'ts_codecompletion/ext_ts_templatesloader.php?id='+getGetVar('id');
    new Ajax.Request(url, {
      method: 'get',
      onSuccess: function(transport) {
        extTsObjTree.c = eval('('+ transport.responseText +')');
        resolveExtReferencesRec(extTsObjTree.c);
      }
    });
  }
  
  /**
   * since the references are not resolved server side we have to do it client-side
   * benefit: less loading time due to less data which has to be transmitted    
   */
  function resolveExtReferencesRec(childNodes){
    for(var key in childNodes){
      var childNode;
      // if the childnode has a value and there is a parto of a reference operator ('<') 
      // and it does not look like a html tag ('>') 
      if(childNodes[key].v && childNodes[key].v[0] == '<' && childNodes[key].v.indexOf('>') == -1 ){
        var path = childNodes[key].v.replace(/</,"").strip();
        // if there are still whitespaces its no path
        if(path.indexOf(' ') == -1){
          childNode = getExtChildNode(path);
          // if the node was found - reference it
          if(childNode != null){
            childNodes[key] = childNode;
          }
        }  
      }
      // if there was no reference-resolving then we go deeper into the tree
      if(!childNode && childNodes[key].c){
        resolveExtReferencesRec(childNodes[key].c);
      }
    }
  }
  
  function getExtChildNode(path){
    var extTree = extTsObjTree;
    var path = path.split('.');
    var pathSeg;
    var i;
    for(i=0;i<path.length;i++){
      pathSeg = path[i];
      if(extTree.c == null || extTree.c[pathSeg] == null) 
        return null;
      extTree = extTree.c[pathSeg];
    }
    return extTree;
  }
  
  this.click=function(event) {
    endAutoCompletion();
  }
  function getFilter(cursorPosNode){
    //var cursorPosNode = cursor.start.node.parentNode;
   // var filter = cursorPosNode.innerHTML.replace('.','');
    if(cursorPosNode.currentText) {
      var filter = cursorPosNode.currentText.replace('.','');
      return filter.replace(/\s/g,"");
    } else {
      return "";
    }
  }

  function getCurrentLine(cursor) {
    var line = "";
    var currentNode = cursor.start.node.parentNode;
    while (currentNode.tagName !='BR') {
      if(currentNode.hasChildNodes() && currentNode.firstChild.nodeType==3 && currentNode.currentText.length>0) {
        line = currentNode.currentText + line; 
      }
      if (currentNode.previousSibling == null) {
        break;
      } else {
        currentNode = currentNode.previousSibling;     
      }
    }
    return line;
  }
  
  this.keyUp = function(event) {
    var keycode = event.keyCode;
    if  (keycode == 190){
      refreshCodeCompletion();
    }else if(cc == 1){
      if(keycode != Event.KEY_DOWN && keycode != Event.KEY_UP){
        refreshCodeCompletion();
      }
    }

  }
  function method(obj, name) {
    return function() {obj[name].apply(obj, arguments);};
  }
  this.keyDown = function(event){
    var keycode = event.keyCode;
    // ensure that the current line is tokenized
    
    //tried to remove eventlisteners, does not work :(    
    /*
     if(keycode == 109){
        mirror.win.document.removeEventListener("keyup",method(mirror.editor,"keyUp"),true);
        mirror.win.document.removeEventListener("keydown",method(mirror.editor,"keyDown"),true);
        mirror.win.document.removeEventListener("keypress",method(mirror.editor,"keyPress"),true);
     }
     */
    if (cc == 1){
      if (keycode == Event.KEY_UP) {
  			// arrow up:  move up cursor in codecomplete box
  			event.stop();
        codeCompleteBoxMoveUpCursor();
   			for(var i=0;i<plugins.length;i++){
          if(plugins[i].obj && plugins[i].obj.afterKeyUp) plugins[i].obj.afterKeyUp(proposals[currWord],compResult);
        }
  		} else if (keycode == Event.KEY_DOWN) {
  			// Arrow down: move down cursor in codecomplete box
  			event.stop();
        codeCompleteBoxMoveDownCursor();
        for(var i=0;i<plugins.length;i++){
          if(plugins[i].obj && plugins[i].obj.afterKeyDown)plugins[i].obj.afterKeyDown(proposals[currWord],compResult);
        }
  		} else if (keycode == Event.KEY_ESC || keycode == Event.KEY_LEFT || keycode== Event.KEY_RIGHT) { 
  			// Esc, Arrow Left, Arrow Right: if codecomplete box is showing, hide it
  			endAutoCompletion();

  		} else if (keycode == Event.KEY_RETURN) {
  		  event.stop();
  		  if (currWord == -1) {
          endAutoCompletion();
        } else {
          insertCurrWordAtCursor();
    			// HACK: a linebreak gets inserted before the inserted word by an observer for KEY_RETURN in codemirror, so remove the linebreak (and the indentation too)
          mirror.editor.highlightAtCursor();
          var insertedNode = mirror.editor.win.select.selectionTopNode(mirror.editor.win.document.body, false);
          var brNode = insertedNode.previousSibling;
          while (brNode.currentText != nodeBeforeInsert.currentText) {
            var tempNode = brNode.previousSibling;
            brNode.parentNode.removeChild(brNode);
            brNode = tempNode;         
          }
          // HACK END
          endAutoCompletion();
        }
  		}else if(keycode == 32 && !event.ctrlKey){
  		  endAutoCompletion();
      }else if(keycode == 32 && event.ctrlKey){
  		  refreshCodeCompletion();
      }else if(keycode == Event.KEY_BACKSPACE){
        var cursorNode = mirror.editor.win.select.selectionTopNode(mirror.editor.win.document.body, false);
        if(cursorNode.innerHTML == '.'){
          // force full refresh at keyUp 
          compResult = null; 
        }
      }
  	} else { // if autocompletion is deactivated and ctrl+space is pressed
      if(keycode == 32 && event.ctrlKey){
        event.stop();
  		  refreshCodeCompletion();
      }   
    
    }
  }

  function refreshCodeCompletion() {
        //var proposals = [];
        // init vars for up/down moving in word list
        cc_up = 0;
        cc_down = options.ccWords-1;
        // clear the last completion wordposition
        currWord = -1;
        mirror.editor.highlightAtCursor();
        
        var cursorNode = mirror.editor.win.select.selectionTopNode(mirror.editor.win.document.body, false);
        
        nodeBeforeInsert = cursorNode;
        filter = getFilter(cursorNode);
        
        if(compResult == null || cursorNode.innerHTML == '.'){
 
            // TODO: implement cases: operatorCompletion reference/copy path completion (formerly found in getCompletionResults())
            var currentTsTreeNode = parser.buildTsObjTree(mirror.editor.container.firstChild, cursorNode);
            compResult = new CompletionResult(tsRef,currentTsTreeNode);
        }
        
        proposals = compResult.getFilteredProposals(filter);
       
        // if proposals are found - show box
        if (proposals.length > 0){
            
            // make UL list of completation proposals
  					var html = '<ul>';
  					for (i = 0; i < proposals.length; i++) {
  						html += '<li style="height:16px;vertical-align:middle;" ' +
  						        'id="cc_word_' + i + '" ' +
  						        'onclick="t3e_instances[' + index + '].tsCodeCompletion.insertCurrWordAtCursor(' + i + ');t3e_instances[' + index + '].tsCodeCompletion.endAutoCompletion();" ' +
  						        'onmouseover="t3e_instances[' + index + '].tsCodeCompletion.highlightCurrWord(' + i + ');">' +
  						        '<span class="word_' + proposals[i].cssClass + '">' +
  						        proposals[i].word +
  						        '</span></li>';
  		      }
  					html += '</ul>';
  
  					//put HTML and show box
  					codeCompleteBox.innerHTML = html;
  					codeCompleteBox.show();
  					codeCompleteBox.scrollTop = 0;
  
  					//  init styles
  					
						codeCompleteBox.style.overflowY = 'scroll';
						if (Prototype.Browser.Gecko) {
							codeCompleteBox.style.height = (options.ccWords * ($("cc_word_0").offsetHeight)) + 'px';
						} else {
							codeCompleteBox.style.height = (options.ccWords * ($("cc_word_0").offsetHeight)) + 4 + 'px';
							codeCompleteBox.style.width = codeCompleteBox.offsetWidth + 20 + 'px';
						}
  					
  					codeCompleteBox.setStyle({
  						left: (Position.cumulativeOffset($$('.t3e_iframe_wrap')[index])[0] + Position.cumulativeOffset(cursorNode)[0] + cursorNode.offsetWidth) + 'px',
  						top:  (Position.cumulativeOffset(cursorNode)[1] + cursorNode.offsetHeight - mirror.win.scrollY) + 'px'
  					});
            // set flag to 1 - needed for continue typing word. 
            cc = 1;    
            // highlight first word in list
            highlightCurrWord(0);
            for(var i=0;i<plugins.length;i++){
              if(plugins[i].obj && plugins[i].obj.afterCCRefresh)plugins[i].obj.afterCCRefresh(proposals[currWord],compResult);
            }
        }
        
  }
  

  
  
  // hide codecomplete box
	this.endAutoCompletion = function() {
    endAutoCompletion();
  }  
  function endAutoCompletion(){
    cc = 0;
  	codeCompleteBox.hide();
    // force full refresh  
  	compResult = null;
  	for(var i=0;i<plugins.length;i++){
       if(plugins[i].obj && plugins[i].obj.endCodeCompletion)plugins[i].obj.endCodeCompletion();
    }
  }
	

	// move cursor in autcomplete box up
	function codeCompleteBoxMoveUpCursor() {
		// if previous position was first or position not initialized - then move cursor to last word, else decrease position
		if (currWord == 0 || currWord == -1) {
			var id = proposals.length - 1;
		} else {
			var id = currWord - 1;
		}
		// hightlight new cursor position
		highlightCurrWord(id);
		// update id of first and last showing proposals and scroll box
		if (currWord < cc_up || currWord == (proposals.length - 1)) {
			cc_up = currWord;
			cc_down = currWord + (options.ccWords - 1);
			if (cc_up === proposals.length - 1) {
				cc_down = proposals.length - 1;
				cc_up = cc_down - (options.ccWords - 1);
			}
			codeCompleteBox.scrollTop = cc_up * 16;
		}
	}

	//move cursor in codecomplete box down
	function codeCompleteBoxMoveDownCursor() {
		// if previous position was last word in list - then move cursor to first word if not than  position ++
		if (currWord == proposals.length - 1) {
			var id = 0;
		} else {
			var id = currWord + 1;
		}
		// highlight new cursor position
		highlightCurrWord(id);

		// update id of first and last showing proposals and scroll box
		if (currWord > cc_down || currWord == 0) {
			cc_down = currWord;
			cc_up = currWord - (options.ccWords - 1);
			if (cc_down == 0) {
				cc_up = 0;
				cc_down = options.ccWords - 1;
			}
			codeCompleteBox.scrollTop = cc_up * 16;
		}
	}
	
	// highlightIng word in codecomplete box by id
	
  this.highlightCurrWord = function(id){
    highlightCurrWord(id);
  }
  function highlightCurrWord(id) {
		if (currWord != -1) {
			$('cc_word_' + currWord).className = '';
		}
		$('cc_word_' + id).className = 'active';
		currWord = id;
	}

  
  this.insertCurrWordAtCursor = function(){
    insertCurrWordAtCursor();
  }
    // insert selected word into text from codecompletebox
	function insertCurrWordAtCursor() {
	  
    var word = proposals[currWord].word;
	  word = word.substring(filter.length);
  	mirror.editor.win.select.insertTextAtCursor(mirror.editor.win, word);
  	mirror.win.focus();
	}
  /**
   * determines what kind of completion is possible and return a array of proposals
   * if we have no suggestions, the list will be empty
   */ 
   /*       
  function getCompletionResult(startNode, cursor) {
    var compResult;
    buildTsObjTree(startNode, cursor);
    
    // is there an operator left of the current curser Position (= in the currentLine)
    var op = getOperator(currentLine); 
    if (op != -1) {
      // is it a reference/copy operator?
      if (op.indexOf("<") != -1) {
        // show path completion
        compResult = getPathCompletion(currentTsTreeNode);
      } else {
        // show what ?????     
        // biggest mystery!!
        // think about!
      } 
    // no operator in the line
    } else {

      // whitespace after last characters? -> show operators
      if(currentLine.substr(-1,1) == " ") {
        compResult = getOperatorCompletion();
      // no whitespace? we're in a path!
      } else {
        compResult = getPathCompletion(currentTsTreeNode);
      }
    }
  
    return compResult;
  }*/

/**
   * retrieves the get-variable with the specified name
   */
        
  function getGetVar(name){
    var get_string = document.location.search;         
    var return_value = '';
    var value;
    do { //This loop is made to catch all instances of any get variable.
        var name_index = get_string.indexOf(name + '=');
        if(name_index != -1)
          {
          get_string = get_string.substr(name_index + name.length + 1, get_string.length - name_index);
          end_of_value = get_string.indexOf('&');
          if(end_of_value != -1)                
            value = get_string.substr(0, end_of_value);                
          else                
            value = get_string;                
            
          if(return_value == '' || value == '')
             return_value += value;
          else
             return_value += ', ' + value;
          }
    } while(name_index != -1)
        
     //Restores all the blank spaces.
     var space = return_value.indexOf('+');
     while(space != -1)
     { 
       return_value = return_value.substr(0, space) + ' ' + 
       return_value.substr(space + 1, return_value.length);	 
       space = return_value.indexOf('+');
     }
      
     return(return_value);        
  }
  


}

