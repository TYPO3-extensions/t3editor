
function matcher(regexp){
  return function(value){return regexp.test(value);};
}

function singleStringStream(string) {
  var pos = 0, start = 0;
  
  function peek() {
    if (pos < string.length)
      return string.charAt(pos);
    else
      return null;
  }

  function next() {
    if (pos >= string.length)
      throw StopIteration;
    return string.charAt(pos++);
  }

  function get() {
    var result = string.slice(start, pos);
    start = pos;
    return result;
  }

  return {peek: peek, next: next, get: get};
}

function multiStringStream(source){
  source = iter(source);
  var current = "", pos = 0;
  var lastPos = 0;
  var peeked = null, accum = "";
  var result = {peek: peek, next: next, get: get};
  
  function peek(){
    if (!peeked)
      peeked = nextOr(result, null);
    return peeked;
  }
  function next(){
    if (peeked){
      var temp = peeked;
      peeked = null;
      return temp;
    }
    while (pos == current.length){
      accum += current;
      current = ""; // In case source.next() throws
      pos = 0;
      current = source.next();
    }
    return current.charAt(pos++);
  }
  function get(){
    var temp = accum;
    var realPos = peeked ? pos - 1 : pos;
    accum = "";
    if (realPos > 0){
      temp += current.slice(0, realPos);
      current = current.slice(realPos);
      pos = peeked ? 1 : 0;
    }
    lastPos = realPos;
    return temp;
  }

  return result;
}



var keywords = function(){
  function result(type, style){
    return {type: type, style: style};
  }
  var atom = result("atom", "atom");
  var reserved_obj = {
  	"PAGE":1,
  	"FRAMESET":1,
  	"FRAME":1,
  	"META":1,
  	"COA":1,
  	"COA_INT":1,
	"COBJ_ARRAY":1,
	"CARRAY":1,
	"CONTEN":1,
	"TEXT":1,
	"HTML":1,
	"FILE":1,
	"IMAGE":1,
	"IMG_RESOURCE":1,
	"CLEARGIF":1,
	"RECORDS":1,
	"CTABLE":1,
	"OTABLE":1,
	"COLUMNS":1,
	"HRULER":1,
	"IMGTEXT":1,
	"CASE":1,
	"LOAD_REGISTER":1,
	"RESTORE_REGISTER":1,
	"FORM":1,
	"SEARCHRESULT":1,
	"USER":1,
	"USER_INT":1,
	"PHP_SCRIPT":1,
	"PHP_SCRIPT_INT":1,
	"PHP_SCRIPT_EXT":1,
	"TEMPLATE":1,
	"MULTIMEDIA":1,
	"EDITPANEL":1,
	"GIFBUILDER":1,
	"HMENU":1,
	"GMENU":1,
	"GMENU_LAYERS":1,
	"GMENU_FOLDOUT":1,
	"TMENU":1,
	"TMENU_LAYERS":1,
	"IMGMENU":1,
	"JSMENU":1,
	"_LOCAL_LANG":1,
	"_CSS_DEFAULT_STYLE":1,
	"_DEFAULT_PI_VARS":1
   };
  
  return reserved_obj;
}();




var keyprops = function(){
  function result(type, style){
    return {type: type, style: style};
  }
  var reserved_obj = {
  	"value":1,
  	"file":1,
  	"marks":1,
  	"subparts":1,
  	"workOnSubpart":1,
	"stdWrap":1
   };
  
  return reserved_obj;
}();


var isOperatorChar = matcher(/[\+\-\*\&\%\/=<>!\?]/);
var isDigit = matcher(/[0-9]/);
var isHexDigit = matcher(/[0-9A-Fa-f]/);
var isWordChar = matcher(/[a-zA-Z0-9_$]/); // matcher(/[\w\$_]/);
var nbsp = String.fromCharCode(160);

function isWhiteSpace(ch){
  // Unfortunately, IE's regexp matcher thinks non-breaking spaces
  // aren't whitespace.
  return ch != "\n" && (ch == nbsp || /\s/.test(ch));
}

function tokenize(source){
  function result(type, style, base){
    nextWhile(isWhiteSpace);
    var value = {type: type, style: style, value: (base ? base + source.get() : source.get())};
    if (base) value.name = base;
    return value;
  }

  function nextWhile(test){
    var next;
    while((next = source.peek()) && test(next))
      source.next();
  }
  function nextUntilUnescaped(end){
    var escaped = false;
    var next;
    while((next = source.peek()) && next != "\n"){
      source.next();
      if (next == end && !escaped)
        break;
      escaped = next == "\\";
    }
  }

  function readHexNumber(){
    source.next(); // skip the 'x'
    nextWhile(isHexDigit);
    return result("number", "atom hexnumber");
  }
  
  function readNumber(){
    nextWhile(isDigit);
    if (source.peek() == "."){
      source.next();
      nextWhile(isDigit);
    }
    if (source.peek() == "e" || source.peek() == "E"){
      source.next();
      if (source.peek() == "-")
        source.next();
      nextWhile(isDigit);
    }
    return result("number", "atom number");
  }
  
  function readWord(){
    nextWhile(isWordChar);
    var word = source.get();
    var known = keywords.hasOwnProperty(word) && keywords.propertyIsEnumerable(word) && result("keyword", "reserved", word);
    
    // if (!known) known = keyprops.hasOwnProperty(word) && keyprops.propertyIsEnumerable(word) && result("keyword", "props", word);
    
    return known ? result(known.type, known.style, word) : result("unknown", "other", word);
  }
  
    
  
  
  function readRegexp(){
    nextUntilUnescaped("/");
    nextWhile(matcher(/[gi]/));
    return result("regexp", "string");
  }
  
  function readMultilineComment(start){
    this.inComment = true;
    var maybeEnd = (start == "*");
    while(true){
      var next = source.peek();
      if (next == "\n")
        break;
      source.next();
      if (next == "/" && maybeEnd){
        this.inComment = false;
        break;
      }
      maybeEnd = next == "*";
    }
    return result("comment", "comment");
  }

  function next(){
    var token = null;
    var ch = source.next();
    if (ch == "\n")
      token = {type: "newline", style: "whitespace", value: source.get()};
    else if (this.inComment)
      token = readMultilineComment.call(this, ch);
    else if (isWhiteSpace(ch))
      token = nextWhile(isWhiteSpace) || result("whitespace", "whitespace");
    else if (ch == "\"")
      token = nextUntilUnescaped("\"") || result("string", "string");
    else if (ch == "'")
      token = nextUntilUnescaped("'") || result("string", "string");
    else if (ch == "(" && source.peek() == "\n")
      token = nextUntilUnescaped(")") || result("string", "string");
 	/* else if (ch == "{" && source.peek() == "$") {
      nextWhile(matcher(/[\}\n]/));
      source.next();
      token = result("constant", "constant");
 	} */ else if (/[\[\]{}\(\),;\:\.]/.test(ch))
	      token = result(ch, "punctuation");
	    else if (ch == "0" && (source.peek() == "x" || source.peek() == "X"))
	      token = readHexNumber();
	    else if (isDigit(ch))
	      token = readNumber();
	    else if (ch == "/") {
	      next = source.peek();
	      if (next == "*")
	        token = readMultilineComment.call(this, ch);
	      else if (next == "/")
	        token = nextUntilUnescaped(null) || result("comment", "comment");
	      else if (this.regexp)
	        token = readRegexp();
	      else
	        token = nextWhile(isOperatorChar) || result("operator", "operator");
	    } else if (ch == "#")
	        token = nextUntilUnescaped(null) || result("comment", "comment");
	    else if (isOperatorChar(ch))
	      token = nextWhile(isOperatorChar) || result("operator", "operator");
	    else
	      token = readWord();
	
    if (token.style != "whitespace" && token != "comment")
      this.regexp = token.type == "operator" || token.type == "keyword c" || token.type.match(/[\[{}\(,;:]/);
    return token;
  }

  return {next: next, regexp: true, inComment: false};
}
