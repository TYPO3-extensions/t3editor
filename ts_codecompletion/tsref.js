var TsRefProperty = function(parentType,name,value){
    this.parentType = parentType;
    this.name = name;
    this.value = value;
    var descriptionCache = null;
    this.getDescription = function(callBack){
      if(descriptionCache == null){
        var url = PATH_t3e+'ts_codecompletion/tsrefLoader.php?action=getDescription&typeId='+this.parentType+'&parameterName='+this.name;
        new Ajax.Request(url, {
            method: 'get',
            onSuccess: function(transport) {
              descriptionCache = transport.responseText;
              callBack(transport.responseText);
            }
          });
      }else callBack(descriptionCache);
    }
}

var TsRefType = function(typeId){
  this.typeId = typeId;       		
  this.properties = new Array();
  
  // todo: types can have descriptions too!
  this.getDescription = function(){
    
  }
}
var TsRef = function(){
      
    var typeTree = new Array();    
    
    var doc;
    
    this.loadTsrefAsync = function(){
      var url = PATH_t3e+'ts_codecompletion/tsrefLoader.php?action=getTypes';
      new Ajax.Request(url, {
        method: 'get',
        onSuccess: function(transport) {
          doc = eval('('+ transport.responseText +')');
          buildTree();
        }
      });
    }
    
    
    
    function buildTree() { 
      
      typeTree = new Array();
      for (var typeId in doc){
          var arr = doc[typeId];
      		typeTree[typeId] = new TsRefType(typeId);
      		

      		if(arr.extends != null)
      		  typeTree[typeId].extends = arr.extends; 
          for(propName in arr.properties){
      		  var propType = arr.properties[propName].type;
      		  typeTree[typeId].properties[propName] = new TsRefProperty(typeId,propName,propType); 
          }
      		
    	}
    	for(var typeId in typeTree){
        if(typeTree[typeId].extends != null){          
          addPropertiesToType(typeTree[typeId],typeTree[typeId].extends,100);
        }
      }
    	
    }
    
    
    function addPropertiesToType(addToType,addFromTypeNames,maxRecDepth){
      if(maxRecDepth<0){
        throw "Maximum recursion depth exceeded while trying to resolve the extends in the TSREF!";
        return;
      }
      var exts = addFromTypeNames.split(',');
      var i;
      for(i=0;i<exts.length;i++){ 
        if(typeTree[exts[i]]==null) throw "Type '"+exts[i]+"' which is used to extend '"+addToType.id+"', was not found in the TSREF!";
        if(typeTree[exts[i]].extends != null)   
          addPropertiesToType(typeTree[exts[i]],typeTree[exts[i]].extends,maxRecDepth-1);
        var properties = typeTree[exts[i]].properties;
        for(propName in properties)
          addToType.properties[propName] = properties[propName];
      }
    }
    
    this.getPropertiesFromTypeId = function(tId){
      if(typeTree[tId] != null) {
         // clone is needed to assure that nothing of the tsref is overwritten by user setup
         typeTree[tId].properties.clone = function() {
          	var result = new Array();
          	for(key in this){
              result[key] = new TsRefProperty(this[key].parentType,this[key].name,this[key].value);
            }
          	return result;
         }     
      
         return typeTree[tId].properties;
      }
      else return new Array(); 
    }
    
    this.typeHasProperty = function(typeId,propertyName){
      if(typeTree[typeId] != null && typeTree[typeId].properties[propertyName] != null)
        return true;
      else 
        return false;  
    }
    
    this.getType = function(typeId){
      return typeTree[typeId];
    }
    this.isType = function(typeId){
      return (typeTree[typeId] != null);
    }
}
