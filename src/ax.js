/** ax-5 is a collection of JS and DOM utilites.
	Dear Sublime Text user, press Ctrl+K, Ctrl+2 or Ctrl+K, Ctrl+3 for code overview. If you're use other editor/IDE please fold code to level 3.

		Why ax-5 tools are cool?
			Simplicity       : Thу code is self-documented. Just read and use. No manual.
			Ecology          : No change to browser native environment (but see ax-5-polyfill.js).
			Transparecy      : JS and DOM objects never exdended (they are manipulated via proxies).
			Independency     : ax-5 tools has no external dependencies (but see ax-5-polyfill.js).
			Express youself  : ax-5 tools is a toolset. Nether a library or a framework.
			Cut, copy, paste : ax-5 tools has almost no internal dependencies. You can pick some code and delete other.
			Fight zombies    : IE 8- are not suppoerted.

		Code conventions:
			Indent: Tabs at the line begins, spaces elsewhere. Code indent may be non-standard for overview readability purpose.
			Semicolon: No semicolons at the line ends (see my blog for detail).
			Var statement: No multiline var's, declare variable on first use
			Return statement: Mandatory, at the last line.

		(c) Anton Matviichuk 2004-2080
		**/

// AMD / window.ax definition section BEGIN
(function (scope, factory) {
	if (typeof define === 'function' && define.amd) {
		define(["ax/polyfill"], factory)
	} else {
		scope.ax = factory()
	}
} (this, function() {
// AMD / window.ax definition section END

	var ax = {}

	ax.version = 5.1

	/** Object helpers **/

	/** Iterate <obj>ect's own properties. Call <callback>(value, key) */
	ax.foreach = function (obj, callback) {
		if (obj) {
			if ("length" in obj) {
				for (var i = 0; i < obj.length; i++) {
					callback(obj[i], i)
				}
			}	else {
				for (var key in obj) {
					if (obj.hasOwnProperty(key)) {
						callback(obj[key], key)
					}
				}
			}
		}
		return obj
	}

	/** Iterate <obj>ect's own properties. Call <callback>(key, value) */
	ax.foreachKV = function (obj, callback) {
		if (obj) {
			if ("length" in obj) {
				for (var i = 0; i < obj.length; i++) {
					callback(i, obj[i])
				}
			}	else {
				for (var key in obj) {
					if (obj.hasOwnProperty(key)) {
						callback(key, obj[key])
					}
				}
			}
		}
		return obj
	}

	/** Extend <recieverObject> with <donorObject>'s own properties. */
	ax.extend = function (recieverObject, donorObject) {
		for (var key in donorObject) {
			if (donorObject.hasOwnProperty(key)) {
				recieverObject[key] = donorObject[key]
			}
		}
		return recieverObject
	}

	/** Extend <recieverObject> with <donorObject>'s own properties. All old properties of <recieverObject> will remain. */
	ax.complement = function (recieverObject, donorObject) {
		for (var key in donorObject) {
			if (donorObject.hasOwnProperty(key) && !(key in recieverObject)) {
				recieverObject[key] = donorObject[key]
			}
		}
		return recieverObject
	}

	/** Given empty <obj>ect with no own properties will result in true */
	ax.isEmptyObject = function (obj) {
		if (typeof obj !== "object") {
			return null
		}

		for (var key in obj) {
			if (obj.hasOwnProperty(key)) {
				return false
			}
		}
		return true
	}


	/** Function-related **/

	/** Executes <callback> after <timeout>. Calling again with same <timeoutId> will cancel old timeout and set a new one. */
	ax.resetTimeout = function (callback, timeout, timeoutId) {
		if (typeof ax._timeoutIds === "undefined") {
			ax._timeoutIds = []
		}

		clearTimeout(ax._timeoutIds[timeoutId])

		if (typeof callback === "function") {
			ax._timeoutIds[timeoutId] = setTimeout(callback, timeout || 1)
		}

		return timeoutId
	}

	/** Make a chain call over several async functions, passing right function as last param of left function */
	ax.chain = function () {
		var i = arguments.length

		while (i--) {
			arguments[i] = arguments[i].bind(this, arguments[i + 1])
		}

		return arguments[0]()
	}


	/** Window-related helpers **/

	/** Get variable from URL query */
	ax.getSearch = function (varName) {
		var query = window.location.search.substring(1)
		var vars = query.split("&")
		var searchValue = null

		for (var i = 0; i < vars.length; i++) {
			var pair = vars[i].split("=")
			if (decodeURIComponent(pair[0]) === varName) {
				searchValue = decodeURIComponent(pair[1])
				break
			}
		}
		return searchValue
	}


	/** Ajax **/

	/** Send a XMLHttpRequest to <url>. Pptional <post> = {key1: value1, ...} will produce POST request */
	ax.request = function(url, handle, post) {
		var	xh = new XMLHttpRequest()
		var	body = ""

		xh.open(post ? "POST" : "GET", url, true)
		xh.onreadystatechange = handle.bind(xh)

		if (post) {
			xh.setRequestHeader("Content-Type", "application/x-www-form-urlencoded")
			for (var i in post) {
				// if (post.hasOwnProperty(i)) {
					body += (body ? "&" : "") + i + "=" + encodeURIComponent(post[i])
				// }
			}
		}

		xh.send(body)
		return undefined
	}

	/** Bind object to a XmlHttpRequest response handler */
	ax.requestHandle = function (callback, bindToObject, presetArguments) {
		return function () {
			if (this.readyState === 4) {
				if (this.status === 200) {
					var	args = [], response, i, j
					var	cType = this.getResponseHeader("Content-Type")

					// add responseText to args
					if (presetArguments) {
						for (i = 0, j = presetArguments.length; i < j; i++) {
							args.push(presetArguments[i])
						}
					}

					if (cType.contains("application/json")) {
						response = JSON.parse(this.responseText)
					} else if (cType.contains("text/xml")) {
						response = this.responseXML
					} else {
						response = this.responseText
					}

					args.push(response)

					return callback.apply(bindToObject, args)
				} else {
					return callback.call(bindToObject, new Error(this.status + " " + this.statusText))
				}
			}
		}
	}


	/** Array proxy **/
	ax.array = function (arr) {
		return {
			array: arr,

			merge: function (donorArray) {
				/* Dependency: ax.array.include */
				if (donorArray.length) {
					for (var i = 0; i < donorArray.length; i++) {
						this.include(donorArray[i])
					}
				}
				return this
			},

			include: function (value) {
				if (arr.indexOf(value) === -1) {
					arr.push(value)
				}
				return this
			},

			remove: function (value) {
				for (var i = arr.length; i > 0; i--) {
					if (arr[i] === value) {
						arr.splice(i, 1)
					}
				}
				return this
			},

			swap: function (i1, i2) {
				if (i2 === undefined) {
					i2 = i1 + 1
				}

				if (i1 < arr.length && i2 < arr.length) {
					var tmp = arr[i1]
					arr[i1] = arr[i2]
					arr[i2] = tmp
				}
				return this
			},

			equals: function (array2) {
				for (var i = 0; i < arr.length; i++) {
					if (arr[i] !== array2[i]) {
						return false
					}
				}

				return true // if arrays are equal, false otherwise
			}
		}
	}


	/** DOM element proxy **/
	ax.element = function (el) {
		if (typeof el === "string") {
			el = ax.element.get(el)
		}

		if (!el) {
			return false
		}

		return {
			element: el,

			setText: function (text) {
				this.empty()

				if (typeof text === "string" && text && String.prototype.i18n) {
					text = text.i18n()
				}

				el.appendChild(document.createTextNode(text))
				return this
			},

			i18n: function() {
				/* Dependency: ax.element.setText */
				if (String.prototype.i18n) {
					// this.setText(el.innerHTML.i18n())
					el.innerHTML = el.innerHTML.i18n()
				}

				return this
			},

			empty: function () {
				while (el.hasChildNodes()) {
					el.removeChild(el.lastChild)
				}

				return this
			},

			remove: function () {
				if (el.parentNode) {
					el.parentNode.removeChild(el)
				}

				return this
			},

			replace: function (replaceWith) {
				if (el.parentNode) {
					el.parentNode.replaceChild(replaceWith, el)
				}

				return this
			},

			putInside: function (elementReference) {
				var el2 = ax.element.get(elementReference)

				if (el2) {
					el2.appendChild(el)
				}

				return this
			},

			putBefore: function (elementReference) {
				var el2 = ax.element.get(elementReference)

				if (el2) {
					el2.parentNode.insertBefore(el, el2)
				}

				return this
			},

			putAfter: function (elementReference) {
				var el2 = ax.element.get(elementReference)

				if (el2) {
					var sibling = ax.element(el2).findElement("nextSibling")
					if (sibling) {
						el2.parentNode.insertBefore(el, sibling)
					} else {
						el2.parentNode.appendChild(el)
					}
				}
				return this
			},

			/** Find Element node, i.e. findElement("nextSibling"); findElement("firstChild"); findElement("firstChild", "tagName", "A"); */
			findElement: function (direction, property, value) {
				var foundElement = null

				if (typeof direction === "string") {
					foundElement = el[direction]
				} else {
					throw "Direction must be string"
				}

				if (direction === "firstChild") {
					direction = "nextSibling"
				}

				if (direction === "lastChild")  {
					direction = "previuosSibling"
				}

				while (foundElement && (foundElement.nodeType !== 1 || property && foundElement[property] !== value)) {
					foundElement = foundElement[direction]
				}

				return foundElement
			},

			nextElement: function () {
				/* Dependency: ax.element.findElement */
				return this.findElement("nextSibling")
			},

			previuosElement: function () {
				/* Dependency: ax.element.findElement */
				return this.findElement("previousSibling")
			},

			hasChildElements: function () {
				return el.hasChildNodes() && el.getElementsByTagName("*").length > 0
			},

			hasClass: function (className) {
				var elementHasClass = el.className.contains(className, " ")
				return elementHasClass ? true : false
			},

			addClass: function (className) {
				/* Dependency: ax.element.hasClass */
				if (!this.hasClass(className)) {
					el.className = (el.className + " " + className)
				}
				return this
			},

			removeClass: function (className) {
				el.className = el.className.replace(new RegExp("(^|\\s)" + className + "(?:\\s|$)"), "$1")
				return this
			},

			toggleClass: function (className) {
				/* Dependency: ax.element.hasClass, ax.element.removeClass. ax.element.addClass */
				if (this.hasClass(className)) {
					this.removeClass(className)
				} else {
					this.addClass(className)
				}
				return this
			},

			condClass: function (condition, className) {
				/* Dependency: ax.element.removeClass. ax.element.addClass */
				if (condition) {
					this.addClass(className)
				}	else {
					this.removeClass(className)
				}
				return this
			},

			/** Bind <handle> to DOM <eventName>. Alternative syntax: on({event1:listener1, event2:listener2, ...}) */
			on: function (eventName, handle) {
				var handleSub
				if (arguments.length === 1) { ax.foreachKV(eventName, this.on); return this }

				if (eventName === "mouseleave") {
					handleSub = function () {
						var timer = window.setTimeout(handle, 10)
						this.on("mouseover", function () {
							window.clearTimeout(timer)
						})
					}
					eventName = "mouseout"
				}

				el.addEventListener(eventName, handleSub || handle, false)

				return this
			},

			/** Bind <handle> to DOM <eventName>. The <handle> listener is removed after event fire. Alternative syntax: once({event1:listener1, event2:listener2, ...}) */
			once: function (eventName, handle) {
				/* Dependency: ax.foreachKV (only for alternative syntax) */
				if (arguments.length === 1) {
					ax.foreachKV(eventName, this.once)
					return this
				}

				var handleSub = function (event) {
					handle(event)
					el.removeEventListener(eventName, handleSub, false)
				}

				el.addEventListener(eventName, handleSub, false)

				return this
			},

			/** Unbind <handle> from DOM <eventName>. Alternative syntax: removeListener({event1:listener1, event2:listener2, ...}) */
			removeListener: function (eventName, handle) {
				/* Dependency: ax.foreachKV (only for alternative syntax) */
				if (arguments.length === 1) {
					ax.foreachKV(eventName, this.removeListener)
					return this
				}

				el.removeEventListener(eventName, handle, false)

				return this
			},

			/** Emit bubling custom <eventName> with optional <detail> over DOM */
			emit: function (eventName, detail) {
				var evt = document.createEvent("CustomEvent")

				evt.initCustomEvent(eventName, true, true, detail)
				el.dispatchEvent(evt)

				return this
			}
		}
	}

	/** Get DOM element. Returns Element itself, not ax.element */
	ax.element.get = function(elementReference) {
		var element = null
		if (typeof elementReference === "string") {
			if (elementReference.match(/<\w*>/)) {
				element = document.getElementsByTagName(elementReference.substring(1, elementReference.length - 1)).item(0)
			} else {
				element = document.getElementById(elementReference)
			}
		} else if (elementReference.nodeType) {
			element = elementReference
		}
		return element
	}

	/** Create DOM element from <elementDefinition> like DIV#myId.myClassName with optional <attributes>. Returns ax.element */
	ax.element.create = function (elementDefinition, attributes) {
		var splitted, className, id, tagName
		attributes = attributes || {}

		// Extract className
		splitted = elementDefinition.split(".")
		tagName = splitted.shift()
		className = splitted.join(" ")
		if (className) {
			attributes.className = className
		}

		// Extract id
		splitted = tagName.split("#")
		tagName = splitted.shift()
		id = splitted.join()
		if (id) {
			attributes.id = id
		}

		var element = document.createElement(tagName)

		for (var i in attributes) {
			if (i === "className") {
				element.setAttribute("class", attributes[i])
			} else {
				element[i] = attributes[i]
				element.setAttribute(i, attributes[i])
			}
		}
		return ax.element(element)
	}

	/** Create DOM element from HTML string. Returns ax.element */
	ax.element.createFromHtml = function (html) {
		var div = document.createElement("DIV")
		div.innerHTML = html
		var element = div.firstChild
		return ax.element(element)
	}


	/** String proxy **/
	ax.string = function (str) {
		return {
			string: str,

			toString: function () {
				if (this.i18n) {
					this.i18n()
				}

				return str.toString()
			},

			/** Truncates string to <len>gth adding a <symbol> on truncation */
			truncate: function (len, symbol) {
				if (str.length > len) {
					str = str.slice(0, len - symbol.length) + symbol
				}
				return this
			},

			nl2br: function () {
				str = str.replace(/[\n]/g, "<br/>")
				return this
			},

			br2nl: function () {
				str = str.replace(/<br\/?>/ig, "\n")
				return this
			},

			i18n: function () {
				if (String.prototype.i18n) {
					str = str.i18n()
				}

				return this
			},

			decodeNumber: function (radix) {
				var number = 0, charpos = 0
				radix = radix || ax.string.dictionary.length

				for (var i = str.length - 1; i >= 0; i--) {
					number += ax.string.dictionary.indexOf(str.charAt(i)) * Math.pow(radix, charpos++);
				}
				return number
			}
		}
	}

	ax.string.dictionary = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
	ax.string.encodeNumber = function (N, radix) {
		var str = ""
		radix = radix || ax.string.dictionary.length

		do {
			str = ax.string.dictionary.charAt(N % radix) + str
			N = (N - N % radix) / radix
		} while (N)

		return ax.string(str)
	}

	return ax

}))