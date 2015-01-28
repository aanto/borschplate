define(function () {

	var TemplateI18n = function (template) {
		this.process(template.rootElement)
		template.on("include", this.process)
	}

	TemplateI18n.prototype = {
		process : function (rootElement) {
			var tags = ["BUTTON", "LABEL", "OPTION", "H1", "H2", "H3", "H4", "H5", "SPAN", "A"]

			for (var els = rootElement.getElementsByTagName('*'), j = els.length; j--;) {
				if (tags.indexOf(els[j].tagName) !== -1) {
					var translated = els[j].innerHTML.i18n()
					if (translated !== els[j].innerHTML) {
						els[j].innerHTML = translated
					}

					var accesskey = els[j].getAttribute("accesskey")
					if (accesskey) {
						els[j].innerHTML = els[j].innerHTML.replace(accesskey, "<u>" + accesskey + "</u>")
					}
				}
			}
		}
	}

	return TemplateI18n

})