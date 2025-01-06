<?php
require_once(dirname(__FILE__).'/vendor/autoload.php');
require_once(dirname(__FILE__).'/parts/loader.php');

?><!DOCTYPE html>
<html>
<head>
	<meta http-equiv="Content-Type" content="text/html;charset=UTF-8" >
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
@font-face {
  font-family: 'Icon';
  src: url(img/fontisto.php);
}
    </style>
    <style>
<?php
echo StringUtil::deleteNonCss(file_get_contents(dirname(__FILE__).'/css/style.css'));
?>
    </style>
    <style media="(prefers-color-scheme: dark)">
<?php
echo StringUtil::deleteNonCss(file_get_contents(dirname(__FILE__).'/css/dark-mode.css'));
?>
    </style>
    <script>
const SoundOwlProperty = {};
SoundOwlProperty.WebSocket = {
    status:false,
    retryCount:<?php echo WEBSOCKET_RETRY_COUNT_LIMIT;?>,
    retryInterval:<?php echo WEBSOCKET_RETRY_INTERVAL;?>
};
    </script>
    <link rel="icon" href="favicon.ico" sizes="any">
    <link rel="icon" href="favicon.svg" type="image/svg+xml">
    <link rel="manifest" href="manifest.json">
    <script src="js/main.bundle.js" defer></script>
</head>
<body id="app">

</body>
</html>
