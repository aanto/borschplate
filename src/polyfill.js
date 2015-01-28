/* global TreeWalker, I18N_TABLE */

if (String.prototype.contains) {
	void "It's ok"
} else {
	String.prototype.contains = function (string, s) {
		return (s) ? (s + this + s).indexOf(s + string + s) > -1 : this.indexOf(string) > -1
	}
}


if (String.prototype.i18n) {
	console.info("Can't extend String.prototype with i18n() because it is already defined.")
} else {
	String.prototype.i18n = function () {
		if (typeof I18N_TABLE === "undefined") {
			return this.toString()
		}

		var tr = this.toLowerCase()
		var lastChar = tr.charAt(this.length - 1)
		var c = this.charAt(0)

		if (lastChar.match(/\W/)) {
			tr = tr.slice(0, -1)
		} else {
			lastChar = ""
		}

		tr = I18N_TABLE[tr]
		if (!tr) {
			return this.toString()
		}

		if (c === c.toUpperCase()) {
			tr = tr.charAt(0).toUpperCase() + tr.substr(1)
		}

		return tr + lastChar
	}
}


if (TreeWalker.prototype.nextOuterNode) {
	console.info("Can't extend TreeWalker.prototype with nextOuterNode() because it is already defined.")
} else {
	TreeWalker.prototype.nextOuterNode = function () {
		var rootNode = this.currentNode
		while (true) {
			if (!this.nextNode()) {
				return false
			}
			if (!rootNode.contains(this.currentNode)) {
				return this.currentNode
			}
		}
	}
}
