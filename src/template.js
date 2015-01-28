/**
 * BorschPlate.js
 *
 * HTML template engine for backbone and stand-alone.
 *
 * Simple, fast, lightweight.
 *
 * KISS.
 */

// AMD / window.BorschPlate definition section BEGIN
(function (scope, factory) {
	if (typeof define === 'function' && define.amd) {
		define(["ax/ax", "ax/domCache", "ax/observer"], factory)
	} else {
		/* global ax, DomCache, Observer */
		scope.BorschPlate = factory(ax, DomCache, Observer)
	}
} (this, function (ax, DomCache, Observer) {
// AMD / window.BorschPlate definition section END


	// Separator for entity:value parser
	// i.e. <p ax:key="my/article:annotation"></p>
	//                           ^
	var EA_SEP = ":"

	// Prefix for processor directive attributes
	// i.e. <p ax:key="userId"></p>
	//         ^^^
	var DIRECTIVE_PREFIX = "ax:"

	// Prefix for attribute microtemplate attributes
	// i.e. <img tpl:src="$galleryImage:src" tpl:alt="$galleryImage:name" />
	//           ^^^^                        ^^^^
	var TEMPLATE_PREFIX = "tpl:"

	var DIRECTIVE = {
		// Assign key to element
		// It's not a binding, because template engine doesn't spy on anything
		// Each refresh must be enforced by a Model or Presenter
		KEY:      DIRECTIVE_PREFIX + "key",

		// Define collection
		// First child element is threated as a collection template, every next elements are ignored
		// List introduces magic $item variable inside subtree
		LIST:     DIRECTIVE_PREFIX + "list",

		// Totally exclude node and its descendants from parsing
		// Useful for some speed optimization
		// i.e. <table ax:reject>...</table>
		REJECT:   DIRECTIVE_PREFIX + "reject",

		// Include other template
		// i.e. <div ax:include="myTemplate"></div>
		// It will search for document.getElementById(myTemplate) first
		// Then if there's no such node it will try to load http://myTemplate next
		INCLUDE:  DIRECTIVE_PREFIX + "include",

		// Evaluates javascript expression
		// Hides subtree and rejects subtree parsing on false
		IF:       DIRECTIVE_PREFIX + "if",

		// Specify value render mode: value (default), key, entityKey, none (default for elements with ax:list and ax:include attrs)
		// i.e.
		// <p ax:key="my/artice:annotation">some text</p> will request for annotation (just request!)
		// <p ax:key="my/artice:annotation" ax:render="none">some text</p> will leave "some text" unaffected
		// <p ax:key="my/artice:annotation" ax:render="key">some text</p> will render "my/artice:annotation" inside
		// <p ax:key="my/artice:annotation" ax:render="entityKey">some text</p> will render "my/artice" inside
		RENDER:   DIRECTIVE_PREFIX + "render",

		// Enable 2-way binding on element change
		CONTROL:  DIRECTIVE_PREFIX + "control",

		// Just an evil javascript eval wrapper
		EVAL:     DIRECTIVE_PREFIX + "eval",

		// Evlauate modifier expression over vaue
		MODIFY:   DIRECTIVE_PREFIX + "modify",

		// Specify a default value if there's no value provided by Model
		DEFAULT:  DIRECTIVE_PREFIX + "default",

		// Assign value to new template variable
		ASSIGN:   DIRECTIVE_PREFIX + "assign",

		// Define a named or anonymous template
		// <div ax:template="myTemplate">...</div>
		// <template ax:template>...</tempalte>
		TEMPLATE: DIRECTIVE_PREFIX + "template"
	}

	// matches variable inside attribute microtemplate
	var matchVariable = /\$\w+\s?/g
	var matchExpression = /\(\((.*)\)\)/g


	/**
	 * Template constructor
	 * @param {Element} rootElement Template root element
	 * @return {Template} Created template class
	 * @constructor
	 */
	var BorschPlate = function (rootElement) {
		// EventEmitter features
		ax.extend(this, Observer.prototype)

		// initialize self
		if (typeof rootElement === "string") {
			this.rootElement = document.getElementById(rootElement);
		} else {
			this.rootElement = rootElement
		}

		// attribute precedence defined here
		this.processors = {}
		this.processors[DIRECTIVE.CONTROL] = this.pControl
		this.processors[DIRECTIVE.KEY]     = this.pKey
		this.processors[DIRECTIVE.IF]      = this.pIf
		this.processors[DIRECTIVE.MODIFY]  = this.pModify
		this.processors[DIRECTIVE.DEFAULT] = this.pDefault
		this.processors[DIRECTIVE.EVAL]    = this.pEval
		this.processors[DIRECTIVE.ASSIGN]  = this.pAssign
		this.processors[DIRECTIVE.INCLUDE] = this.pInclude
		this.processors[DIRECTIVE.LIST]    = this.pList

		// listen to events
		this.willTrigger(this, "setCollectionKeys", "setBulk", "setValue", "remove", "setEntityKey")

		this.resetCache()

		// for creating ids of anonymous plugins
		this._pluginsCount = 1

		return this
	}

	/**
	 * Template prototype
	 * @type {Template}
	 */
	BorschPlate.prototype = {
		version: 1.000,

		DIRECTIVE: DIRECTIVE,

		/**
		 * Register plugin
		 * @param  {Object} Plugin Plugin constructor
		 * @param  {String} pluginId Plugin id
		 * @return {Template} Self
		 * @chainable
		 */
		plugin: function (Plugin, pluginId) {
			// create unique id for
			if (!pluginId) {
				pluginId = "plugin" + this._pluginsCount++
			}

			// check for plugin name is avaliable
			if (typeof this[pluginId] === "undefined") {
				this[pluginId] = new Plugin(this)
			}
			return this
		},

		resetCache: function () {
			this.cacheByAttr = new DomCache()
			this.cacheByKey  = new DomCache()
		},

		/**
		 * TreeWalker filter generator
		 * @param  {Object} Options {
		 * 		attribute: "tag attribute name",
		 * 		value: "matching value for comparsion with tag attribute",
		 * 		test function(element) {return something},
		 * 		match: "matching value for comparsion with test function result",
		 * 		reject: false // (default) skip node only
		 * 		reject: true // skip node and reject subtree
		 * 	}
		 * @return {Function} TreeWalker Filter function
		 */
		filter: function (options) {
			var rejectCode = (options && options.reject) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP

			var triggers = [
				DIRECTIVE.EVAL,
				DIRECTIVE.INCLUDE,
				DIRECTIVE.LIST,
				DIRECTIVE.IF,
				DIRECTIVE.KEY
			]

			 // NodeFilter.FILTER_ACCEPT === 1
			 // NodeFilter.FILTER_REJECT === 2
			 // NodeFilter.FILTER_SKIP === 3
			return function (el) {
				// Hard skip tags w/o attributes
				if (el.attributes.length === 0) {return 3}

				// Hard reject subtrees under REJECT directive
				if (el.hasAttribute(DIRECTIVE.REJECT)) {return 2}

				// Check attribute
				if (typeof options === "object") {
					if ("attribute" in options) {
						if ("value" in options) {
							if (el[options.attribute] != options.value) {return rejectCode}
						} else if ("not" in options) {
							if (el[options.attribute] == options.not) {return rejectCode}
						} else {
							if (!el[options.attribute]) {return rejectCode}
						}
					}

					// Check test function
					if ("test" in options) {
						if ("match" in options) {
							if (options.test(el) != options.match) {return rejectCode}
						} else {
							if (!options.test(el)) {return rejectCode}
						}
					}
				}

				for (var i = triggers.length; i--;) {
					if (el.hasAttribute(triggers[i])) {
						return 1
					}
				}

				return 3 // NodeFilter.FILTER_SKIP
			}
		},

		/**
		 * Walk through template DOM and invoke callback for each filter-matching tag
		 * @param  {Function} callback Element processing function, element passed as argument
		 *                             If function return false walker skip parsing it's descendants
		 * @param  {Function} filter TreeWalker filter
		 * @param  {Element} rootElement
		 * @param  {Boolean} includeRootElement
		 */
		walk: function (callback, filter, rootElement, includeRootElement) {
			rootElement = rootElement || this.rootElement
			filter = filter || this.filter()

			var walker = document.createTreeWalker(rootElement, NodeFilter.SHOW_ELEMENT, filter, false)
			var el = walker.currentNode

			if (includeRootElement === false || filter(el) !== 1) {
				// Don't include root element
				el = walker.nextNode()
			}

			while (el) {
				if (callback(el) === false) {
					el = walker.nextOuterNode()
				} else {
					el = walker.nextNode()
				}
			}
		},

		/**
		 * Walk through template DOM cache and invoke callback for each key-matching tag
		 * @param  {Function} callback Element processing function
		 * @param  {String} key Matching key
		 */
		walkKey: function (callback, key) {
			this.cacheByKey.walk(callback.bind(this), key)
		},

		/**
		 * Walk through template DOM cache and invoke callback for each attribute-matching tag
		 * @param  {Function} callback Element processing function
		 * @param  {String} attrName Matching attribute name
		 */
		walkAttr: function (callback, attrName) {
			this.cacheByAttr.walk(callback.bind(this), attrName)
		},

		/**
		 * Returns parsed value of attribute
		 * @param  {Element} el Element
		 * @param  {String} attrName Attribute name
		 * @return {String} Parse attribute value
		 */
		getParsedAttribute : function (el, attrName) {
			var attrValue = el.getAttribute(attrName)
			var matches, i

			matches = attrValue.match(matchVariable)
			if (matches && el.variables) {
				for (i = matches.length; i--;) {
					console.log(el)
					attrValue = attrValue.replace(matches[i], el.variables[ matches[i].trim().substr(1) ])
				}
			}

			matches = attrValue.match(matchExpression)
			if (matches) {
				for (i = matches.length; i--;) {
					attrValue = attrValue.replace(matches[i], this.tryEval(matches[i], el))
				}
			}

			return attrValue
		},

		/**
		 * Get friendly element value
		 * @param  {Element} el Element
		 * @return {Mixed} value
		 */
		getValue: function (el) {
			switch (el.tagName) {
				case "SELECT":
				case "TEXTAREA":
				case "BUTTON":
					return el.value
				case "INPUT":
					switch (el.type) {
						case "checkbox":
							return el.checked ? true : false
						case "radio":
							if (el.value === "true")  {return true}
							if (el.value === "false") {return false}
							return el.value
						default:
							return el.value
					}
					break
				case "IMG":
					return el.src
				default:
					return el.innerHTML.trim()
			}
		},

		/**
		 * Get element's actual parsed full key
		 * @param  {Element} el Element
		 * @return {String} key
		 */
		getKey: function (el) {
			if (el.hasAttribute(DIRECTIVE.KEY)) {
				return this.buildHref(this.getParsedAttribute(el, DIRECTIVE.KEY))
			}
		},

		/**
		 * Get element's actual parsed entity part of a full key
		 * @param  {Element} el Element
		 * @return {String} entity part of a key
		 */
		getEntityKey: function (el) {
			var dataKey = this.getKey(el)
			var entityKey = dataKey ? dataKey.split(EA_SEP)[0] : false
			return entityKey
		},

		/**
		 * Get element's actual parsed attribute part of a full key
		 * @param  {Element} el Element
		 * @return {String} attribute part of a key
		 */
		getAttributeKey: function (el) {
			var attributeKey = false
			var dataKey = this.getKey(el)
			if (dataKey) {
				var dataKeySplitted = dataKey.split(EA_SEP, 2)
				if (dataKeySplitted.length === 2) {
					attributeKey = dataKeySplitted[1]
				}
			}
			return attributeKey
		},

		/**
		 * Get element's actual parsed collection key
		 * @param  {Element} el Element
		 * @return {String} collection key
		 */
		getCollectionKey: function (el) {
			return this.buildHref(this.getParsedAttribute(el, DIRECTIVE.LIST))
		},

		/**
		 * Set element variables
		 * @param  {Element} el Element
		 * @param  {Object} variables Variables hash
		 */
		setElementVariables: function (el, variables) {
			// loop variables
			for (var v in variables) {
				el.variables[v] = variables[v]
			}
		},

		/**
		 * Performance optimized combined setter for multiple values and collection keys
		 * @example
		 *  	[
		 *  		{event: "set", key: "my/key", value: "my value"},
		 * 			{event: "setCollectionKeys", key: "my/collectionKey", value: ["my/key1", "my/key2"]}
		 * 		]
		 * @param {Object} pairs Pairs hash
		 */
		setBulk: function (pairs) {
			this.walkAttr(function setBulk_setValue (el, key) {
				for (var i = 0; i < pairs.length; i++) {
					if (pairs[i].event === "set" && pairs[i].key === key) {
						this.processElement(el, {value: pairs[i].data})
					}
				}
			}.bind(this), DIRECTIVE.KEY)

			this.walkAttr(function setBulk_setCollectionKey (el, collectionKey) {
				for (var i = 0; i < pairs.length; i++) {
					if (pairs[i].event === "setCollectionKeys" && pairs[i].key === collectionKey) {
						this.renderListKeys(el, pairs[i].data, collectionKey)
					}
				}
			}.bind(this), DIRECTIVE.LIST)
		},

		/**
		 * Walk through the template and set value for all elements with given key
		 * @param {String} key
		 * @param {Mixed} value
		 */
		setValue: function (key, value) {
			if (value === null || value === undefined) {
				// null means don't set value
				return
			}

			this.walkKey(function (el) {
				this.processElement(el, {value: value})
			}.bind(this), key)
		},

		setCollection: function (collectionKey, model) {
			this.walkAttr(function (el, elementsCollectionKey) {
				if (elementsCollectionKey === collectionKey) {
					this.renderList(el, model, collectionKey)
				}
			}.bind(this), DIRECTIVE.LIST)
		},

		/**
		 * Walk through the template and draw items of all elements with given collection Key
		 * @param {String} collectionKey
		 * @param {Array} keys
		 */
		setCollectionKeys: function (collectionKey, keys) {
			this.walkAttr(function (el, elementsCollectionKey) {
				if (elementsCollectionKey === collectionKey) {
					this.renderListKeys(el, keys, collectionKey)
				}
			}.bind(this), DIRECTIVE.LIST)
		},

		/**
		 * Walk through the template and update keys
		 * @param {String} oldKey
		 * @param {String} addKey Relative pathkkey
		 */
		setEntityKey: function (oldKey, addKey) {
			this.walk(function (el) {
				var newKey = this.buildHref(oldKey, addKey) + EA_SEP + this.getAttributeKey(el)
				el.setAttribute(DIRECTIVE.KEY, newKey)
			}.bind(this), this.filter({
				attribute: DIRECTIVE.KEY,
				test: this.entityKey.bind(this),
				match: oldKey
			}))
		},

		/**
		 * Walk through the template and synchronize value with originElement
		 * @param {Element} originElement
		 */
		syncValue: function (originElement) {
			var key = this.getKey(originElement)
			var value = this.getValue(originElement)

			this.walkKey(function (el) {
				if (el !== originElement) {
					this.processElement(el, {value: value})
				}
			}.bind(this), key, false, false)

			this.emit("change", key, value)
		},

		/**
		 * Refresh part of the template
		 * @param  {Element} rootElement Root element of updated subtree
		 * @param  {Object} variables Variables hash
		 * @param  {Boolean} includeRootElement
		 * @return {[type]}
		 */
		refresh: function (rootElement, variables, includeRootElement) {
			this.walk(function refresh (el) {
				var propagatedVariables = ax.extend({}, variables)

				// Don't propagate key, entitykey, value if element has it's own ax:key
				if (includeRootElement === false && typeof variables === "object") {
					if (el.hasAttribute(DIRECTIVE.KEY) || el.hasAttribute(DIRECTIVE.LIST)) {
						delete propagatedVariables.key
						delete propagatedVariables.entityKey
						delete propagatedVariables.value
					}
				}

				return this.processElement(el, propagatedVariables)

			}.bind(this), null, rootElement, includeRootElement)

			this.emit("refresh", rootElement, variables)
		},

		/**
		 * Process element
		 * @param  {Element} el Root element of updated subtree
		 * @param  {Object} variables Variables hash
		 * @return {Boolean} Allow update descendants on true, or reject subtree on false
		 */
		processElement: function (el, variables) {
			if (!el.variables) {
				el.variables = []
			}

			if (variables) {
				// console.log(variables)
				this.setElementVariables(el, variables)
			}

			var renderMode = this.getElementRenderMode(el)

			// iterate over processors
			for (var i in this.processors) {
				if (el.hasAttribute(i)) {
					if (this.processors[i].call(this, el, variables) === false) {
						// immediately break refresh propagation and wait
						// if (DEBUG) console.log("Processing chain breaked by " + i, el)
						return false
					}
				}
			}

			this.renderAttributes(el)

			// render content if key not changed and value changed or no value needed
			if (el.hasAttribute(DIRECTIVE.KEY) && (variables && "value" in variables || renderMode === "key" || renderMode === "entityKey")) {
				this.renderContent(el, renderMode)
			}

			return true
		},

		/**
		 * Process KEY directive
		 * @param  {Element} el
		 * @return {Boolean} Allow further processing on true, or break on false
		 */
		pKey : function (el, variables) {
			var key = this.getKey(el)
			var renderMode = this.getElementRenderMode(el)

			// Key changed
			if (el.variables.key !== key) {
				el.variables.key = key
				el.variables.entityKey = key.split(EA_SEP)[0]

				this.cacheByKey.push(key, el)
				this.cacheByAttr.push(DIRECTIVE.KEY, el, key)

				if (variables && "value" in variables) {
					// Direct variable render
					// console.log(variables, el)
				} else {
					if (renderMode !== "key" && renderMode !== "entityKey" && renderMode !== "skip") {
						this.emit("requestValue", key)
						return false
					}
				}
			}
		},

		/**
		 * Process IF directive
		 * @param  {Element} el
		 * @return {Boolean} Allow further processing on true, or break on false
		 */
		pIf : function (el) {
			var expr = this.getParsedAttribute(el, DIRECTIVE.IF)

			if (expr) {
				if (expr === "true" || expr === true || !!this.tryEval(expr, el)) {
					// We have to force subtree refresh when it chenge state from hidden to visible
					if (el.hidden) {
						this.refresh(el, el.variables, false)
						el.hidden = false
						return false
					}
					el.hidden = false
				} else {
					el.hidden = true
					return false
				}
			}
		},

		/**
		 * Process EVAL directive
		 * @param  {Element} el
		 */
		pEval : function (el) {
			return this.tryEval(this.getParsedAttribute(el, DIRECTIVE.EVAL), el)
		},

		/**
		 * Process MODIFY directive
		 * @param  {Element} el
		 */
		pModify : function (el) {
			el.variables.value = this.tryEval(this.getParsedAttribute(el, DIRECTIVE.MODIFY), el)
		},

		/**
		 * Process DEFAULT directive
		 * @param  {Element} el
		 * @return {Boolean} Allow further processing on true, or break on false
		 */
		pDefault : function (el) {
			if (!el.variables.value) {
				el.variables.value = this.getParsedAttribute(el, DIRECTIVE.DEFAULT)
			}
		},

		/**
		 * Process ASSIGN directive,
		 * @param  {Element} el
		 */
		pAssign : function (el) {
			console.log(el, el.variables)
			var assign = {}
			var variableName = this.getParsedAttribute(el, DIRECTIVE.ASSIGN)

			assign[variableName] = el.variables.value
			this.setElementVariables(el, assign)
		},

		/**
		 * Process INCLUDE directive
		 * @param  {Element} el
		 * @return {Boolean} Allow further processing on true, or break on false
		 */
		pInclude : function (el) {
			var templateName = this.getParsedAttribute(el, DIRECTIVE.INCLUDE)

			// Template changed
			if (el.variables.template !== templateName) {
				var random = "" // "?random=" + Math.random()
				var prefetchedTemplate = document.getElementById(templateName)
				var renderInclude = function (el, htmlContent) {
					el.variables.template = templateName
					el.innerHTML = htmlContent
					this.refresh(el, el.variables, false)
					this.emit("include", el)
				}.bind(this)

				if (!this._includeCache)	{
					this._includeCache = {}
				}

				ax.element(el).empty()

				if (prefetchedTemplate) {
					// Render template from document HTML by id
					renderInclude(el, prefetchedTemplate.innerHTML)
				} else if (this._includeCache[templateName]) {
					// Render template from URL (already cached before)
					renderInclude(el, this._includeCache[templateName])
				} else {
					// Render template from URL (already cached before)
					ax.request(templateName + random, ax.requestHandle(function (htmlContent) {
						renderInclude(el, htmlContent)
						this._includeCache[templateName] = htmlContent
					}.bind(this)))
				}
				return false
			}
		},

		/**
		 * Process LIST directive
		 * @param  {Element} el
		 * @return {Boolean} Allow further processing on true, or break on false
		 */
		pList : function (el) {
			if (!el.listItemTemplate) {
				el.listItemTemplate = ax.element(el).findElement("firstChild")
			}

			var collectionKey = this.getCollectionKey(el)

			// Key changed
			if (el.variables.collectionKey !== collectionKey) {
				el.variables.collectionKey = collectionKey

				ax.element(el).empty()

				this.cacheByAttr.push(DIRECTIVE.LIST, el, collectionKey)
				this.emit("requestCollectionKeys", collectionKey)

				return false
			}
		},

		/**
		 * Process CONTROL directive and bind combined change listener to element
		 * @param  {Element} el
		 * @return {Boolean} Allow further processing on true, or break on false
		 */
		pControl : function (el) {
			el.addEventListener("change", this.pControl_listener.bind(this))
			el.addEventListener("keyup", this.pControl_listener.bind(this))
			el.addEventListener("click", this.pControl_listener.bind(this))
		},
		pControl_listener: function(event) {
			this.syncValue(event.target)
		},

		/**
		 * Render element's attributes using attribute microtemplates
		 * @param {Element}
		 */
		renderAttributes: function (el) {
			var attrName
			for (var i = el.attributes.length; i--;) {
				attrName = el.attributes[i].name
				if (attrName.substr(0,4) === TEMPLATE_PREFIX) {
					el.setAttribute(attrName.substr(4), this.getParsedAttribute(el, attrName))
				}
			}
		},

		renderContent: function (el, renderMode) {
			var value

			switch (renderMode) {
				case "key":       value = el.variables.key; break
				case "entityKey": value = el.variables.entityKey; break
				case "skip":      break
				case "none":      break
				default:          value = el.variables ? el.variables.value : null; break
			}

			if (typeof value !== "undefined") {
				if (el.tagName !== "SELECT" && el.tagName !== "IMG") {
					el.innerHTML = value
				}
			} else {
				this.refresh(el, el.variables, false)
			}

			// tagName-related behaviour
			switch (el.tagName) {
				case "IMG":
					el.src = value
					break
				case "SELECT":
					el.value = value
					break
				case "INPUT":
					switch (el.type) {
						case "checkbox":
							el.checked = !!value
							break
						case "radio":
							// any value including false but not null or undefined
							el.checked = (value || value === false) ? (value.toString() === el.value.toString()) : false
							break
						default:
							el.value = value
					}
					break;
				case "OPTION":
					var selectElement = ax.element(el).findElement("parentElement", "tagName", "SELECT")
					if (selectElement) {
						el.selected = selectElement.variables.value === el.value
					}
					break
				case "A":
					el.href = el.variables.entityKey
					break
			}

			this.emit("renderContent", el)
		},

		/**
		 * Find element render mode
		 * @param {Element} el
		 * @return {String} Render mode: "none", "value", "key" or "entitiKey"
		 */
		getElementRenderMode: function (el) {
			var renderMode = el.getAttribute(DIRECTIVE.RENDER)

			if (!renderMode) {
				if (el.hasAttribute(DIRECTIVE.INCLUDE)) {
					renderMode = "none"
				} else if (el.hasAttribute(DIRECTIVE.LIST)) {
					renderMode = "none"
				} else if (el.hasAttribute(DIRECTIVE.KEY)) {
					renderMode = "value"
				} else {
					renderMode = "none"
				}
			}

			return renderMode
		},

		renderList: function (el, collection, collectionKey) {
			ax.element(el).empty()
			if (collection) {
				if (typeof collection.forEach === "function") {
					collection.forEach(function (value, key) {
						this.renderListItem(el, collectionKey + key, value)
					}.bind(this))
				} else {
					for (var key in collection) {
						this.renderListItem(el, key, collection[key])
					}
				}
			}
		},

		/**
		 * Render list content regarding to geven collection of keys
		 * @param {Element} el List element
		 * @param {Array} collection Collection of keys
		 */
		renderListKeys: function (el, keys) {
			if (keys) {
				for (var i = 0, l = keys.length; i < l; i++) {
					this.renderListItem(el, keys[i])
				}
			}
		},

		/**
		 * Render single list item
		 * @param {Element} el List element
		 * @param {String} key Assigned key
		 * @return {Element} New list item
		 */
		renderListItem: function (el, key, valueModel) {
			var value
			var newItem = el.listItemTemplate.cloneNode(true)
			el.appendChild(newItem)

			if (valueModel === "object" && valueModel) {
				// TODO: Optimize to reduce excessive calls
				var attrName = this.getAttributeKey(el)
				if (typeof valueModel.get === "function") {
					// try use getter first
					value = valueModel.get(attrName)
				} else {
					value = valueModel[attrName]
				}
			} else {
				value = valueModel
			}

			if (value) {
				this.refresh(newItem, ax.extend(el.variables, {item: key, value: value}))
			} else {
				this.refresh(newItem, ax.extend(el.variables, {item: key}))
			}

			return newItem
		},

		/**
		 * Remove element from DOM on next tick
		 * @param {String} key Element key
		 */
		remove: function (key) {
			this.walkKey(function (el) {
				setTimeout(ax.element(el).remove, 0)
			}.bind(this), key)
		},

		/**
		 * Builds and merges relative URL
		 * @param {String} URL part
		 * @return {String} Computed URL
		 */
		buildHref: function () {
			var parts, eParts, href = [], attr = "", SEP = EA_SEP || ":"

			// merge arguments in one string
			for (var i in arguments) {
				if (!arguments[i]) {continue;}

				parts = arguments[i].split(SEP)
				eParts = parts[0].split("/")
				attr = parts[1] ? SEP + parts[1] : ""

				for (var p = 0; p < eParts.length; p++) {
					switch (eParts[p]) {
					case "":
						if (p === 0) {href = [""];} // result of leading slash symbol
						if (href[href.length - 1] !== "") {href.push(eParts[p]);}
						break
					case ".":
						break
					case "..":
						if (p === 0) {href.pop();}
						href.pop()
						break
					default:
						if (p === 0) {href.pop();}
						href.push(eParts[p])
						break
					}
				}
			}
			return (href.join("/").replace("\/\/", "/") + attr).replace("/" + SEP, "/index" + SEP)
		},

		/**
		 * Debug-friendly evaluation
		 * @param  {String} expr Expression
		 * @param  {Element} el Element
		 * @return {Mixed} Evaluation result
		 */
		tryEval: function (expr, el) {
			// jshint unused:false
			// magic variables
			var value = el.variables.value
			var key = el.variables.key

			if (expr) {
				try {
					return eval(expr)
				} catch (e) {
					console.warn("Wrong expression (" + e.message + ") in ", el)
				}
			}
		},
	}

	/**
	 * Create templates from Document HTML in global scope
	 * (no-scripting mode)
	 * @param {Element} rootElement Root Element
	 * @return {Array} Created templates
	 */
	BorschPlate.scanDocument = function (rootElement, scope) {
		var selector = "[" + DIRECTIVE.TEMPLATE.replace(":", "\\:") + "]"
		var elements = (rootElement || document).querySelectorAll(selector)
		var templates = {}

		for (var i = 0; i < elements.length; i++) {
			var templateName = elements[i].getAttribute(DIRECTIVE.TEMPLATE)

			templates[i] = new BorschPlate(elements[i])
			templates[i].refresh()

			if (templateName) {
				(scope || window)[templateName] = templates[i]
			}
		}

		return templates
	}

	window.addEventListener("load", function () {
		BorschPlate.scanDocument()
	})

	return BorschPlate

}))