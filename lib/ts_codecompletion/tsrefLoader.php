<?
require_once("class.tsrefloader.php");

$action = $_GET['action'];
$tsref = new TsrefLoader();
$tsref->loadFile('../../tsref/tsref.xml');
//$typeArr = $tsref->getType('TEXT');
if($action == "getTypes"){
  echo($tsref->getTypes());
}else if ($action == "getDescription"){
  $typeId = $_GET['typeId'];
  $parameterName = $_GET['parameterName'];
  if($typeId && $parameterName){
    echo($tsref->getDescription($typeId,$parameterName));
  }else{
    echo("parameters \"typeId\" and \"parameterName\" have to be supplied!");
  }
}else{
    echo("parameter \"action\" is missing!");
}

?>