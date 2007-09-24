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
 * Browser checks
 *  inspired by tinyMCE
 */
var ua = navigator.userAgent;
var isMSIE = (navigator.appName == "Microsoft Internet Explorer");
var isMSIE5 = this.isMSIE && (ua.indexOf('MSIE 5') != -1);
var isMSIE5_0 = this.isMSIE && (ua.indexOf('MSIE 5.0') != -1);
var isMSIE7 = this.isMSIE && (ua.indexOf('MSIE 7') != -1);
var isGecko = ua.indexOf('Gecko') != -1; // Will also be true on Safari
var isSafari = ua.indexOf('Safari') != -1;
var isOpera = window['opera'] && opera.buildNumber ? true : false;
var isMac = ua.indexOf('Mac') != -1;
var isNS7 = ua.indexOf('Netscape/7') != -1;
var isNS71 = ua.indexOf('Netscape/7.1') != -1;



var t3e_instances = {};


/* inspired by marijn.haverbeke.nl (JSEditor) */
var t3eOptions = {
	newlineElements: setObject("P", "DIV", "LI"),
    safeKeys: setObject("KEY_ARROW_UP", "KEY_ARROW_DOWN", "KEY_ARROW_LEFT", "KEY_ARROW_RIGHT", "KEY_END", "KEY_HOME",
                        "KEY_PAGE_UP", "KEY_PAGE_DOWN", "KEY_SHIFT", "KEY_CTRL", "KEY_ALT", "KEY_SELECT"),
    stylesheet: PATH_t3e+"css/t3editor.css",
    indentOnClosingBrace: true
    };

var t3editor = function()	{
  function simplifyDOM(root) 	{
    var doc = root.ownerDocument;
    var current = root;
    var result = [];
    var leaving = false;

    function simplifyNode(node) 	{
      leaving = false;

      if (node.nodeType == 3) {
        node.nodeValue = node.nodeValue.replace(/[\n\r]/g, "").replace(/[\t ]/g, nbsp);
        result.push(node);
      }
      else if (node.nodeName == "BR" && node.childNodes.length == 0) {
        result.push(node);
      }
      else {
        forEach(node.childNodes, simplifyNode);
        if (!leaving && t3eOptions.newlineElements.hasOwnProperty(node.nodeName)) {
          leaving = true;
          result.push(withDocument(doc, BR));
        }
      }
    }

    simplifyNode(root);
    return result;
  }

  function traverseDOM(start)	{
    function yield(value, c){
    	cc = c; return value;
    }
    function push(fun, arg, c){
    	return function(){	return fun(arg, c);	};
    }
    function stop(){
    	cc = stop; throw StopIteration;
    };
    
    var cc = push(scanNode, start, stop);
    var owner = start.ownerDocument;

    function pointAt(node){
      var parent = node.parentNode;
      var next = node.nextSibling;
      if (next)
        return function(newnode){	parent.insertBefore(newnode, next);	};
      else
        return function(newnode){	parent.appendChild(newnode);	};
    }
    var point = null;

    function insertPart(part){
      var text = "\n";
      if (part.nodeType == 3) {
        var text = part.nodeValue;
        part = withDocument(owner, partial(SPAN, {"class": "part"}, part));
        part.currentText = text;
      }
      part.dirty = true;
      point(part);
      return text;
    }

    function writeNode(node, c){
      var toYield = [];
      forEach(simplifyDOM(node), function(part) {
        toYield.push(insertPart(part));
      });
      return yield(toYield.join(""), c);
    }

    function partNode(node){
      if (node.nodeName == "SPAN" && node.childNodes.length == 1 && node.firstChild.nodeType == 3){
        node.currentText = node.firstChild.nodeValue;
        return true;
      }
      return false;
    }

    function scanNode(node, c){
      if (node.nextSibling)
        c = push(scanNode, node.nextSibling, c);

      if (partNode(node)){
        return yield(node.currentText, c);
      }
      else if (node.nodeName == "BR") {
        return yield("\n", c);
      }
      else {
        point = pointAt(node);
        removeElement(node);
        return writeNode(node, c);
      }
    }

    return {	next: function(){	return cc();}	};
  } // traverseDOM

  var atomicTypes = setObject("atom", "number", "variable", "string", "regexp");  

  function parse(tokens)	{
    var cc = [statements];
    var consume, marked;
    var context = null;
    var lexical = {indented: -2, column: 0, type: "block", align: false};
    var column = 0;
    var indented = 0;

    var parser = {next: next, copy: copy};

    function next()	{
      while(cc[cc.length - 1].lex)
        cc.pop()();

      var token = tokens.next();
      if (token.type == "whitespace" && column == 0)
        indented = token.value.length;
      column += token.value.length;
      if (token.type == "newline"){
        indented = column = 0;
        if (!("align" in lexical))
          lexical.align = false;
        token.lexicalContext = lexical;
      }
      if (token.type == "whitespace" || token.type == "newline" || token.type == "comment")
        return token;
      if (!("align" in lexical))
        lexical.align = true;

      while(true){
        consume = marked = false;
        cc.pop()(token.type, token.name);
        if (consume){
          if (marked)
            token.style = marked;
          else if (token.type == "variable" && inScope(token.name))
            token.style = "localvariable";
          return token;
        }
      }
    }
    
    function copy()	{
      var _context = context, _lexical = lexical, _cc = copyArray(cc), _regexp = tokens.regexp, _comment = tokens.inComment;

      return function(_tokens){
        context = _context;
        lexical = _lexical;
        cc = copyArray(_cc);
        column = indented = 0;
        tokens = _tokens;
        tokens.regexp = _regexp;
        tokens.inComment = _comment;
        return parser;
      };
    }

    function push(fs)	{
      for (var i = fs.length - 1; i >= 0; i--)
        cc.push(fs[i]);
    }
    function cont()	{
      push(arguments);
      consume = true;
    }
    function pass()	{
      push(arguments);
      consume = false;
    }
    function mark(style)	{
      marked = style;
    }

    function pushcontext()	{
      context = {prev: context, vars: {"this": true, "arguments": true}};
    }
    function popcontext()	{
      context = context.prev;
    }
    function register(varname)	{
      if (context){
        mark("variabledef");
        context.vars[varname] = true;
      }
    }
    function inScope(varname)	{
      var cursor = context;
      while (cursor) {
        if (cursor.vars[varname])
          return true;
        cursor = cursor.prev;
      }
      return false;
    }

    function pushlex(type)	{
      var result = function(){
        lexical = {prev: lexical, indented: indented, column: column, type: type};
      };
      result.lex = true;
      return result;
    }
    function poplex()	{
      lexical = lexical.prev;
    }
    poplex.lex = true;

    function expect(wanted)	{
      return function(type){
        if (type == wanted) cont();
        else cont(arguments.callee);
      };
    }

    function statements(type)	{
      return pass(statement, statements);
    }
    function statement(type)	{
      if (type == "var") cont(pushlex("vardef"), vardef1, expect(";"), poplex);
      else if (type == "keyword a") cont(pushlex("stat"), expression, statement, poplex);
      else if (type == "keyword b") cont(pushlex("stat"), statement, poplex);
      else if (type == "{") cont(pushlex("}"), block, poplex);
      else if (type == "function") cont(functiondef);
      else if (type == "for") cont(pushlex("stat"), expect("("), pushlex(")"), forspec1, expect(")"), poplex, statement, poplex);
      else if (type == "case") cont(expression, expect(":"));
      else if (type == "variable") cont(pushlex("stat"), maybelabel);
      else if (type == "catch") cont(pushlex("stat"), pushcontext, expect("("), funarg, expect(")"), statement, poplex, popcontext);
      else pass(pushlex("stat"), expression, expect(";"), poplex);
    }
    function expression(type)	{
      if (atomicTypes.hasOwnProperty(type)) cont(maybeoperator);
      else if (type == "function") cont(functiondef);
      else if (type == "keyword c") cont(expression);
      else if (type == "(") cont(pushlex(")"), expression, expect(")"), poplex);
      else if (type == "operator") cont(expression);
      else if (type == "[") cont(pushlex("]"), commasep(expression), expect("]"), poplex);
      else if (type == "{") cont(pushlex("}"), commasep(objprop), expect("}"), poplex);
    }
    function maybeoperator(type)	{
      if (type == "operator") cont(expression);
      else if (type == "(") cont(pushlex(")"), expression, commasep(expression), expect(")"), poplex);
      else if (type == ".") cont(property, maybeoperator);
      else if (type == "[") cont(pushlex("]"), expression, expect("]"), poplex);
    }
    function maybelabel(type)	{
      if (type == ":") cont(poplex, statement);
      else pass(maybeoperator, expect(";"), poplex);
    }
    function property(type)	{
      if (type == "variable") {mark("property"); cont();}
    }
    function objprop(type)	{
      if (type == "variable") mark("property");
      if (atomicTypes.hasOwnProperty(type)) cont(expect(":"), expression);
    }
    function commasep(what)	{
      function proceed(type) {
        if (type == ",") cont(what, proceed);
      };
      return function() {
        pass(what, proceed);
      };
    }
    function block(type)	{
      if (type == "}") cont();
      else pass(statement, block);
    }
    function vardef1(type, value)	{
      if (type == "variable"){register(value); cont(vardef2);}
      else cont();
    }
    function vardef2(type)	{
      if (type == "operator") cont(expression, vardef2);
      else if (type == ",") cont(vardef1);
    }
    function forspec1(type, value)	{
      if (type == "var") cont(vardef1, forspec2);
      else cont(expression, forspec2);
    }
    function forspec2(type)	{
      if (type == ",") cont(forspec1);
      if (type == ";") cont(expression, expect(";"), expression);
    }
    function functiondef(type, value)	{
      if (type == "variable"){register(value); cont(functiondef);}
      else if (type == "(") cont(pushcontext, commasep(funarg), expect(")"), statement, popcontext);
    }
    function funarg(type, value)	{
      if (type == "variable"){register(value); cont();}
    }

    return parser;
  }

  function indentation(lexical, closing)	{
    if (lexical.type == "vardef")
      return lexical.indented + 4;
    if (lexical.type == "stat")
      return lexical.indented + 2;
    else if (lexical.align)
      return lexical.column - (closing ? 1 : 0);
    else
      return lexical.indented + (closing ? 0 : 2);
  }






  function t3editor(theTextarea, index) {

    content = '';
    
	this.textarea = $(theTextarea);
    this.index = index;
    
    content = this.textarea.value;
    
    
    this.outerdiv = $(createDOM("DIV", {
    	"class": 	"t3e_outerdiv",
    	"id":		"t3e_"+this.textarea.getAttribute('id')
    	}));
    // this.outerdiv.hide();
    this.textarea.parentNode.insertBefore(this.outerdiv,$(this.textarea));

	this.modalOverlay = $(createDOM("DIV", {
    	"class": 	"t3e_modalOverlay"
    	}));
    this.modalOverlay.hide();
    this.modalOverlay.setStyle(this.outerdiv.getDimensions());
    this.modalOverlay.setStyle({opacity: 0.5});
    this.outerdiv.appendChild(this.modalOverlay);
    
    this.linenum_wrap = $(createDOM("DIV", {
    	"class": 	"t3e_linenum_wrap"
    	}));
    this.linenum = $(createDOM("DL", {
    	"class": 	"t3e_linenum"
    	}));
    this.linenum_wrap.appendChild(this.linenum);
    this.outerdiv.appendChild(this.linenum_wrap);
        
    this.iframe_wrap = $(createDOM("DIV", {
    	"class": 	"t3e_iframe_wrap"
    	}));

    this.iframe = $(createDOM("IFRAME", {
    	"style": "border: 0; display: block;",
    	"class": "t3e_iframe" //,
    	// "frameborder": "0"
    	}));

    this.iframe_wrap.appendChild(this.iframe);
    this.outerdiv.appendChild(this.iframe_wrap);
    
    this.footer_wrap = $(createDOM("DIV", {
    	"class": 	"t3e_footer_wrap"
    	}));
    this.outerdiv.appendChild(this.footer_wrap);
    
    this.fitem_demo = this.createFooterItem('Demonstration'); // , true, 'footeritem_demo_click');
    this.footer_wrap.appendChild(this.fitem_demo);

	this.fitem_options_overlay = $(createDOM("DIV", {
    	"class": 	"t3e_footer_overlay",
    	"id":		"t3e_footer_overlay_options"
    	}));
    this.fitem_options_overlay.innerHTML = '<ul>'+
				'<li style="color:grey"><input type="checkbox" disabled="disabled" /> Syntax highlighting</li>'+
				'<li style="color:grey"><input type="checkbox" disabled="disabled" /> AutoCompletion</li>'+
				'<li><span onclick="t3e_instances['+this.index+'].fitem_options_overlay.hide();t3e_instances['+this.index+'].footeritem_demo_click();">Test snippets</span></li>'+
				'<li><input type="checkbox" onclick="t3e_instances['+this.index+'].fitem_options_overlay.hide();t3e_instances['+this.index+'].toggleFullscreen();" id="t3e_fullscreen" /> <label for="t3e_fullscreen">Fullscreen</label></li>'+
				'<li style="color:grey"><input type="checkbox" disabled="disabled" /> other fancy stuff</li>'+
				'</ul>';;
    this.fitem_options_overlay.hide();
    this.fitem_options = this.createFooterItem('Options', true, this.fitem_options_overlay);
    this.footer_wrap.appendChild(this.fitem_options);
    this.footer_wrap.appendChild(this.fitem_options_overlay);
    
    this.fitem_status = this.createFooterItem('', false);
    this.footer_wrap.appendChild(this.fitem_status);
    
    
    this.fitem_name = this.createFooterItem(this.textarea.readAttribute('alt'), false);
    this.footer_wrap.appendChild(this.fitem_name);
    
    this.win = this.iframe.contentWindow;
    this.doc = this.win.document;
    this.doc.designMode = "on";
    
    this.doc.open();
    this.doc.write("<html><head><link rel=\"stylesheet\" type=\"text/css\" href=\"" + t3eOptions.stylesheet + "\"/></head>" +
                   "<body class=\"editbox\" spellcheck=\"false\"></body></html>");
    this.doc.close();

    this.dirty = [];

    this.width   = $(this.textarea).getDimensions().width;
    this.height  = $(this.textarea).getDimensions().height;

    this.textarea.hide();

    if (this.doc.body) {
      this.init(content);
    } else {
      connect(this.iframe, "onload", bind(function(){disconnectAll(this.iframe, "onload"); this.init(content);}, this));
    }
  }

  var nbspRegexp = new RegExp(nbsp, "g");




  t3editor.prototype = {

    linesPerShot: 10,
    shotDelay: 200,

	textModified: false,

	saveAjaxEvent: null,

    init: function (code) {
      this.container = this.doc.body;
      
      this.textModified = false;
     
      this.importCode(code);
     
      connect(this.doc, "onkeydown", method(this, "keyDown"));
      connect(this.doc, "onkeyup", method(this, "keyUp"));
      connect(this.doc, "onscroll", method(this, "scroll"));
      connect(this.win, "onscroll", method(this, "scroll"));
    
      
      var form = $(this.textarea.form)
	  this.saveButtons = form.getInputs('submit', 'submit');
     
      this.saveAjaxEvent = this.saveAjax.bind(this);
      
      this.saveButtons.each(function(button) {
      	Event.observe(button,'click',this.saveAjaxEvent);
      }.bind(this));
      
      this.resize(this.width, this.height);
      
    },
    
	toggleView: function(enable) {
		if (enable) {
			this.textarea.value = this.getCode();
			this.outerdiv.hide();
			this.textarea.show();
			this.saveButtons.each(function(button) {
      			Event.stopObserving(button,'click',this.saveAjaxEvent);
      		}.bind(this));
		} else {
			this.importCode(this.textarea.value);
			this.textarea.hide();
			this.outerdiv.show();
			this.saveButtons.each(function(button) {
      			Event.observe(button,'click',this.saveAjaxEvent);
      		}.bind(this));
		}
	},

    createFooterItem: function(title, mouseover, clickAction) {
    	item = $(createDOM("DIV", {
    		"class": 	"t3e_footer_item"
    	}));
    	item.innerHTML = title;
    	
    	if (mouseover) {
    		Event.observe(item, "mouseover", function(e){Event.element(e).addClassName('t3e_footeritem_active');} );
    		Event.observe(item, "mouseout",  function(e){Event.element(e).removeClassName('t3e_footeritem_active');} );
		}
		
		if (typeof clickAction == 'object') {
			Event.observe(item, "click",  function(e){ clickAction.toggle(); } );
			/*
			pos = Position.positionedOffset(item);
    		pos_l = (pos[0] + item.getDimensions().width - clickMenu.getDimensions().width - 13);
    		clickMenu.setStyle({left:pos_l+'px'});
    		*/
		}
		
		if (typeof clickAction == 'string' && clickAction != '') {
			connect(item, "onclick", method(this, clickAction+''));
		}
		
    	return item;
    },
    
    resize: function(w,h) {
		if (this.outerdiv) {
			nh = (h - 1);
			nw = (w + 11);
			if (isMSIE) nw = nw + 8;

			this.outerdiv.setStyle({
					height: nh,
            		width: nw
                });

			this.linenum_wrap.setStyle({
				height: (h - 22)
			});

			lw = this.linenum_wrap.getWidth();
			if (isMSIE) lw = lw - 17;
			if (!isMSIE) lw = lw - 11;	

			this.iframe.setStyle({
	            height: (h - 22),
				width: (w - lw)
			});
			
			this.modalOverlay.setStyle(this.outerdiv.getDimensions());
		}
	},

	/**
	 *
	 */
	footeritem_demo_click: function() {
		// insertNewlineAtCursor(this.win);
		insertTextAtCursor(this.win, "page = PAGE");insertNewlineAtCursor(this.win);
		insertTextAtCursor(this.win, "page {");		insertNewlineAtCursor(this.win);
		insertTextAtCursor(this.win, "  10 = TEXT");insertNewlineAtCursor(this.win);
		insertTextAtCursor(this.win, "  10.value = Hello World!");		insertNewlineAtCursor(this.win);
		insertTextAtCursor(this.win, "}");			insertNewlineAtCursor(this.win);
		
		this.markCursorDirty();
		this.scheduleHighlight();
	},
	
	
	toggleFullscreen : function() {
		if (this.outerdiv.hasClassName('t3e_fullscreen')) {
			this.outerdiv.removeClassName('t3e_fullscreen');
			$$('body')[0].setStyle({overflow : ''});
			h = this.textarea.getDimensions().height;
			w = this.textarea.getDimensions().width;
		} else {
			this.outerdiv.addClassName('t3e_fullscreen');
			h = window.innerHeight ? window.innerHeight : $$('body')[0].getHeight();
			w = window.innerWidth ? window.innerWidth : $$('body')[0].getWidth();
			w = w - 13;
			$$('body')[0].setStyle({overflow : 'hidden'});
		}

		this.resize(w,h);
	},


	/**
	 * update the line numbers (called from inside the iframe)
	 */
    updateLinenum: function()      {
    		var theMatch = this.container.innerHTML.match(/<br/gi);
            if (theMatch) {
	            var bodyContentLineCount = theMatch.length;
	            disLineCount = this.linenum.childNodes.length;
	            while (disLineCount != bodyContentLineCount)    {
	                    if (disLineCount > bodyContentLineCount)        {
	                            this.linenum.removeChild(this.linenum.lastChild);
	                            disLineCount--;
	                    } else if (disLineCount < bodyContentLineCount) {
	                            ln = $(document.createElement('dt'));
	                            ln.update(disLineCount+1+'.');
	                            ln.addClassName(disLineCount%2==1?'even':'odd');
	                            ln.setAttribute('id','ln'+(disLineCount+1));
	                            this.linenum.appendChild(ln);
	                            disLineCount++;
	                    }
	            }
	            
				this.fitem_status.update(
					(this.textModified?'* ':'')+
					bodyContentLineCount + ' Lines');
			}
    },

	/**
	 * scroll the line numbers
	 */
    scroll: function()  {
		var scrOfX = 0, scrOfY = 0;
  		if( typeof( this.win.pageYOffset ) == 'number' ) {
		    // Netscape compliant
		    scrOfY = this.win.pageYOffset;
		    scrOfX = this.win.pageXOffset;
		} else if( this.doc.body && ( this.doc.body.scrollLeft || this.doc.body.scrollTop ) ) {
		    // DOM compliant
		    scrOfY = this.doc.body.scrollTop;
		    scrOfX = this.doc.body.scrollLeft;
		} else if( this.doc.documentElement && ( this.doc.documentElement.scrollLeft || this.doc.documentElement.scrollTop ) ) {
		    // IE6 standards compliant mode
		    scrOfY = this.doc.documentElement.scrollTop;
		    scrOfX = this.doc.documentElement.scrollLeft;
		}
        this.linenum_wrap.scrollTop = scrOfY;
    },


    importCode: function(code) {
          
      replaceChildNodes(this.container);
      var lines = code.replace(/[ \t]/g, nbsp).replace(/\r\n?/g, "\n").split("\n");
      for (var i = 0; i != lines.length; i++) {
        if (i > 0)
          this.container.appendChild(withDocument(this.doc, BR));
        var line = lines[i];
        if (line.length > 0)
          this.container.appendChild(this.doc.createTextNode(line));
      }
      
      if (code == "") {
      	this.container.appendChild($(document.createElement('BR')));
      }
      // console.debug(this.container.innerHTML);
      
      if (this.container.firstChild){
        this.addDirtyNode(this.container.firstChild);
        this.scheduleHighlight();
      }
     
      this.updateLinenum();
    },

    getCode: function() {
      if (!this.container.firstChild)
        return "";

      var accum = [];
      forEach(traverseDOM(this.container.firstChild), method(accum, "push"));
      return accum.join("").replace(nbspRegexp, " ");
    },

    keyDown: function(event) {
      var name = event.key().string; 
	  /*
 TODO: the mac firefox behaves very strange here. The Mac version inserts a BR on itself
 in oposite to the Linux version. Windows has to be checked for this behavior!!!
 */
      if (name == "KEY_ENTER") {
			event.stop();
			if (!isMac)	insertNewlineAtCursor(this.win);
        	// console.debug(this.container.innerHTML);
        	// this.indentAtCursor();
    		this.updateLinenum();
   	  }
	  /* else if (name == "KEY_TAB" || ((name == "KEY_SPACEBAR" || name == "KEY_I") && event.modifier().ctrl)) {
        this.indentAtCursor();
        event.stop();
      } */ 
      else if (name == "KEY_S" && event.modifier().ctrl) {
      		this.saveAjax();
      		event.stop();
      		return;
      } else if (name == "KEY_F11" && event.modifier().ctrl) {
      		this.toggleFullscreen();
      		event.stop();
      		return;
      }
	  this.checkTextModified();
    },

    keyUp: function(event) {
      var name = event.key().string;
      /* if (t3eOptions.indentOnClosingBrace && name == "KEY_RIGHT_SQUARE_BRACKET")
         this.indentAtCursor();
      else */ if (!t3eOptions.safeKeys.hasOwnProperty(name))
        this.markCursorDirty();
    },
    
    checkTextModified: function() {
      if (!this.textModified) {
      	if (this.getCode() != this.textarea.value) {
      		this.textModified = true;
      	}
      }
    },


	saveAjax: function(event) {
		if (event) {
			// event = new Event(event);
			Event.stop(event);
		}
		
		this.modalOverlay.show();
		this.textarea.value = this.getCode();
		
		/* erst ab prototype 1.5.1
		Form.request($(this.textarea.form),{
  			onComplete: function(){ alert('Form data saved!'); }
		});
		*/
		
		formdata = "submitAjax=1&" + Form.serialize($(this.textarea.form));

		var myAjax = new Ajax.Request(
			$(this.textarea.form).action, 
			{ method: "post",
			  parameters: formdata, 
			  onComplete: this.saveAjaxOnSuccess.bind(this)
			});
	},

	saveAjaxOnSuccess: function(ajaxrequest) {
		// console.debug(ajaxrequest);
		if (ajaxrequest.status == 200
			&& ajaxrequest.responseText == "OK") {
			this.textModified = false;
			this.updateLinenum();
		} else {
			// TODO: handle if session is timed out
			alert("An error occured while saving the data.");
		};
		this.modalOverlay.hide();
	},


    highlightAtCursor: function(cursor) {
      if (cursor.valid) {
        var node = cursor.start || this.container.firstChild;
        if (node) {
          if (node.nodeType != 3)
            node.dirty = true;
          var sel = markSelection(this.win);
          this.highlight(node, true);
          selectMarked(sel);
          cursor = new Cursor(this.container);
        }
      }
      return cursor;
    },

    indentAtCursor: function() {
      var cursor = new Cursor(this.container)
      cursor = this.highlightAtCursor(cursor);
      if (!cursor.valid)
        return;

      var start = cursor.startOfLine();
      var whiteSpace = start ? start.nextSibling : this.container.lastChild;
      if (whiteSpace && !hasClass(whiteSpace, "whitespace"))
        whiteSpace = null;

      var firstText = whiteSpace ? whiteSpace.nextSibling : start ? start.nextSibling : this.container.firstChild;
      var closing = start && firstText && firstText.currentText && firstText.currentText.charAt(0) == start.lexicalContext.type;
      var indent = start ? indentation(start.lexicalContext, closing) : 0;
      var indentDiff = indent - (whiteSpace ? whiteSpace.currentText.length : 0);

      if (indentDiff < 0) {
        whiteSpace.currentText = repeatString(nbsp, indent);
        whiteSpace.firstChild.nodeValue = whiteSpace.currentText;
      }
      else if (indentDiff > 0) {
        if (whiteSpace) {
          whiteSpace.currentText += repeatString(nbsp, indentDiff);
          whiteSpace.firstChild.nodeValue = whiteSpace.currentText;
        }
        else {
          whiteSpace = withDocument(this.doc, function(){return SPAN({"class": "part whitespace"}, repeatString(nbsp, indentDiff))});
          if (start)
            insertAfter(whiteSpace, start);
          else
            insertAtStart(whiteSpace, this.containter);
        }
        if (cursor.start == start)
          cursor.start = whiteSpace;
      }
      if (cursor.start == whiteSpace)
        cursor.focus();
    },

    highlight: highlight,

    markCursorDirty: function() {
      var cursor = new Cursor(this.container);
      if (cursor.valid) {
        var node = cursor.start || this.container.firstChild;
        if (node) {
          this.scheduleHighlight();
          this.addDirtyNode(node);
        }
      }
    },

    addDirtyNode: function(node) {
      if (!member(this.dirty, node)){
        if (node.nodeType != 3)
          node.dirty = true;
        this.dirty.push(node);
      }
    },

    scheduleHighlight: function() {
      if (this.highlightTimeout) clearTimeout(this.highlightTimeout);
      this.highlightTimeout = setTimeout(bind(this.highlightDirty, this, this.linesPerShot), this.shotDelay);
      
    },

    getDirtyNode: function() {
      while (this.dirty.length > 0) {
        var found = this.dirty.pop();
        if ((found.dirty || found.nodeType == 3) && found.parentNode)
          return found;
      }
      return null;
    },

    highlightDirty: function(lines) {
      var sel = markSelection(this.win);
      var start;
      while (lines > 0 && (start = this.getDirtyNode())){
        var result = this.highlight(start, true, lines);
        if (result) {
          lines = result.left;
          if (result.node && result.dirty)
            this.addDirtyNode(result.node);
        }
      }
      selectMarked(sel);
      if (start)
        this.scheduleHighlight();
    }
  }

  function highlight(from, onlyDirtyLines, lines){
    var container = this.container;
    var document = this.doc;

	this.updateLinenum();

    if (!container.firstChild)
      return;
    while (from && !from.parserFromHere)
      from = from.previousSibling;
    if (from && !from.nextSibling)
      return;

    function correctPart(token, part){
      return !part.reduced && part.currentText == token.value && hasClass(part, token.style);
    }
    function shortenPart(part, minus){
      part.currentText = part.currentText.substring(minus);
      part.reduced = true;
    }
    function tokenPart(token){
      var part = withDocument(document, partial(SPAN, {"class": "part " + token.style}, token.value));
      part.currentText = token.value;
      return part;
    }

    var parsed = from ? from.parserFromHere(tokenize(multiStringStream(traverseDOM(from.nextSibling))))
      : parse(tokenize(multiStringStream(traverseDOM(container.firstChild))));

    var parts = {
      current: null,
      forward: false,
      get: function(){
        if (!this.current)
          this.current = from ? from.nextSibling : container.firstChild;
        else if (this.forward)
          this.current = this.current.nextSibling;
        this.forward = false;
        // console.debug(this.current);
        return this.current;
      },
      next: function(){
        if (this.forward)
          this.get();
        this.forward = true;
      },
      remove: function(){
        this.current = this.get().previousSibling;
        container.removeChild(this.current ? this.current.nextSibling : container.firstChild);
        this.forward = true;
      },
      nextNonEmpty: function(){
        var part = this.get();
        while (part.nodeName == "SPAN" && part.currentText == ""){
          var old = part;
          this.remove();
          part = this.get();
          replaceSelection(old.firstChild, part.firstChild || part, 0, 0);
        }
        return part;
      }
    };

    var lineDirty = false;

    forEach(parsed, function(token){
     // console.debug(['t',token]);
      var part = parts.nextNonEmpty();
     // console.debug(['p',part]);
      if (token.type == "newline"){
        // if (part.nodeName != "BR") {
        //  throw "Parser out of sync. Expected BR.";
        // }
        if (part.nodeName != "BR") {
        	return;
        }
        if (part.dirty || !part.lexicalContext)
          lineDirty = true;
        part.parserFromHere = parsed.copy();
        part.lexicalContext = token.lexicalContext;
        part.dirty = false;
        if ((lines !== undefined && --lines <= 0) ||
            (onlyDirtyLines && !lineDirty))
          throw StopIteration;
        lineDirty = false;
        parts.next();
      }
      else {
        if (part.nodeName != "SPAN")
          throw "Parser out of sync. Expected SPAN.";
        if (part.dirty)
          lineDirty = true;

        if (correctPart(token, part)){
          part.dirty = false;
          parts.next();
        }
        else {
          lineDirty = true;
          var newPart = tokenPart(token);
          container.insertBefore(newPart, part);
          var tokensize = token.value.length;
          var offset = 0;
          while (tokensize > 0) {
            part = parts.get();
            // if (part==null) continue;
            var partsize = part.currentText.length;
            replaceSelection(part.firstChild, newPart.firstChild, tokensize, offset);
            if (partsize > tokensize){
              shortenPart(part, tokensize);
              tokensize = 0;
            }
            else {
              tokensize -= partsize;
              offset += partsize;
              parts.remove();
            }
          }
        }
      }
    });

    return {left: lines,
            node: parts.get(),
            dirty: lineDirty};
  }

  return t3editor;
}();

// ------------------------------------------------------------------------



function t3editor_toggleEditor(checkbox,index) {
	var t3e = t3e_instances[index - 1];
	t3e.toggleView(checkbox.checked);
}

// ------------------------------------------------------------------------


/**
 * everything ready: turn textareas into fancy editors
 */
Event.observe(window,'load',function() {
	$$('textarea.t3editor').each(
		function(textarea,i) {
			var t3e = new t3editor(textarea,i);
			t3e_instances[i] = t3e;
		}
	);
});
