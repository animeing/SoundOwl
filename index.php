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
    <script src="https://cdn.jsdelivr.net/npm/vue@2.6.14/dist/vue.js"></script>
    <script src="https://unpkg.com/vue-router@3.0.7/dist/vue-router.js"></script>
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
const Initalize = {
    websocket_retry_count:<?php echo WEBSOCKET_RETRY_COUNT_LIMIT;?>,
    websocket_retry_interval:<?php echo WEBSOCKET_RETRY_INTERVAL;?>
};
    </script>
    <script src="js/base.js"></script>
    <script src="js/layout.js"></script>
    <script src="js/page.js"></script>
</head>
<body>
	<header>
		<a href="#" name="home" class="page-title" title="Home">SoundOwl</a>
        <span id='view-name'></span>
		<span id="main-menu">

		</span>
	</header>
    <div id="controller" class="audio-play-controller analyser">
        <audio-controller></audio-controller>
    </div>
    <div id="base" class="layout-base">
        <router-view></router-view>
    </div>

</body>
</html>
