define(["ax/ax"], function (ax) {

	var TemplateHypernav = function  (template) {

		var clickHandle = function (event) {
			var el = event.target
			if (!el.isContentEditable) {
				template.emit("navigate", event, el.getAttribute("href"))
				this.markAll()
			}
		}.bind(this)

		template.on("renderContent", function (el) {
			if (el.tagName === "A") {
				this.markCurrentLink(el)
				el.addEventListener("click", clickHandle)
			}
		}.bind(this))

		this.markAll()
		window.addEventListener("popstate", this.markAll.bind(this))
	}

	TemplateHypernav.prototype = {
		markAll: function () {
			for (var i = document.links.length; i--;) {
				this.markCurrentLink(document.links[i])
			}
		},

		markCurrentLink: function (el) {
			ax.element(el)
			.condClass(el.href === document.location.toString(), "current")
			.condClass(el.href === document.location.toString().substr(0, el.href.length), "ancestor")
		}
	}

	return TemplateHypernav

})