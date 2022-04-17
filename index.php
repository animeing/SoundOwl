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
    <script src="js/base.js"></script>
    <script src="js/layout.js"></script>
    <script src="js/page.js"></script>
</head>
<body>
	<header>
        <!--リンク先は暫定-->
		<a href="#" class="page-title" title="Home">SoundOwl</a>
		<span id="main-menu">

		</span>
	</header>
</body>
</html>
