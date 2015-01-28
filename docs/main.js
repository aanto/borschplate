/* global requirejs */
window.DEBUG = true

if (window.DEBUG) {
	window.requirejs.config({urlArgs: "bust=" +  (new Date()).getTime()})
}

requirejs.config({
	baseUrl: "/axite.client/",
	shim: {
		"ldt/Parser" : {
			exports: 'Parser'
		},
		"ldt/TextareaDecorator" : {
			exports: 'TextareaDecorator'
		}
	}
})

function loadCss(url) {
	var link = document.createElement("link");
	link.type = "text/css";
	link.rel = "stylesheet";
	link.href = require.toUrl(url);
	document.getElementsByTagName("head")[0].appendChild(link);
}

require(
	["ax/template", "ldt/Parser", "ldt/TextareaDecorator", "backbone"],
	function (BorschPlate, Parser, TextareaDecorator, Backbone) {
	loadCss("ldt/TextareaDecorator.css")

	// generic syntax parser
	var parser = new Parser({
		whitespace: /\s+/,
		tagAx: /ax:\w+/,
		comment: /\/\*([^\*]|\*[^\/])*(\*\/?)?|(\/\/|#)[^\r\n]*/,
		string: /"(\\.|[^"\r\n])*"?|'(\\.|[^'\r\n])*'?/,
		number: /0x[\dA-Fa-f]+|-?(\d+\.?\d*|\.\d+)/,
		keyword: /(and|as|case|catch|class|const|def|delete|die|do|else|elseif|esac|exit|extends|false|fi|finally|for|foreach|function|global|if|new|null|or|private|protected|public|published|resource|return|self|static|struct|switch|then|this|throw|true|try|var|void|while|xor)(?!\w|=)/,
		variable: /[\$\%\@](\->|\w)+(?!\w)|\${\w*}?/,
		define: /[$A-Z_a-z0-9]+/,
		op: /[\+\-\*\/=<>!]=?|[\(\)\{\}\[\]\.\|]/,
		other: /\S+/,
	})

	// wait for the page to finish loading before accessing the DOM
	var textarea = document.getElementsByTagName('TEXTAREA')
	for (var i=0; i < textarea.length; i++) {
		textarea[i].innerHTML = textarea[i].innerHTML.trim()
		new TextareaDecorator( textarea[i], parser )
	}

	window.tryThis = function (what) {

		var html = document.getElementById(what + "-tpl").value
		var js = document.getElementById(what + "-js").value
		var output = document.getElementById(what + "-output")

		output.innerHTML = html

		BorschPlate.scanDocument(output)

		eval(js)
	}
})