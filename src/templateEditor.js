// AMD / window.Observer definition section BEGIN
(function (scope, factory) {
	if (typeof define === 'function' && define.amd) {
		define(["ax/ax"], factory)
	} else {
		scope.Observer = factory()
	}
} (this, function Observer_factory (ax) {
// AMD / window.Observer definition section END


	var BorschPlateEditor = function (template) {
		this.template = template
		template.on("switchEditableMode", this.switchEditableMode.bind(this))
		template.on("setValueSuccess",    this.markElement.bind(this, "saved"))
		template.on("setValueFail",       this.markElement.bind(this, "error"))
		template.on("deleteFail",         this.markElement.bind(this, "error"))
		template.on("markDelete",         this.markElement.bind(this, "delete"))
		return undefined
	}

	BorschPlateEditor.prototype = {
		markElement: function (how, key) {
			this.template.walkKey(function (el) {
				this.markOwnElement(el, how)
			}.bind(this), key)
		},

		switchEditableMode: function (mode, rootElement) {
			if (!this.switchEditableMode._listeners) {
				this.switchEditableMode._listeners = {
					change: function (event) {
						var el = event.currentTarget
						this.template.syncValue(el)
						this.markOwnElement(el, "changed")
					}.bind(this),
					focus: function (event) {
						var el = event.target
						this.template.emit("contentEditableFocus", el)
					}.bind(this),
					blur: function (event) {
						var el = event.target
						this.template.emit("contentEditableBlur", el)
					}.bind(this)
				}
			}

			this.template.walk(function (el) {
				// console.log(el)
				// Render list controls
				if (el.hasAttribute(this.template.DIRECTIVE.LIST)) {
					if (!el.listSpacerElement) {
						el.listSpacerElement = ax.element.create("SPAN.axEmptyListSpacer").setText(el.getAttribute("title")).element
					}
					el.appendChild(el.listSpacerElement)
					this.renderListControlElement(el, mode)
				}

				// Render list item controls
				// TODO att! list item can possibly be non-ax element
				if (el.parentNode && el.parentNode.hasAttribute && el.parentNode.hasAttribute(this.template.DIRECTIVE.LIST)) {
					if (mode === "edit") {
						this.template.emit("listItemSwitchedEditable", el)
					}
				}

				// Render editable item controls
				if (this.template.getElementRenderMode(el) === "value" || el.tagName === "IMG" || el.tagName === "SELECT") {
					if (mode === "view") {
						if (el.setContentEditable) {
							el.setContentEditable(false)
						}
						ax.element(el).removeListener(this.switchEditableMode._listeners)
					}

					if (mode === "edit") {
						el.setAttribute("placeholder", this.template.getAttributeKey(el).toString().i18n())
						if (el.tagName === "IMG" && !(el instanceof ax.ContentEditableImage)) {
							el = new ax.ContentEditableImage(el)
						}
						if (el.tagName !== "IMG" && !(el instanceof ax.ContentEditable)) {
							el = new ax.ContentEditable(el)
						}
						if (el.setContentEditable) {
							el.setContentEditable(true)
						}
						this.template.emit("elementSwitchedEditable", el)
						ax.element(el).on(this.switchEditableMode._listeners)
					}
				}
			}.bind(this), this.template.filter({
				attribute: "hidden",
				not: true
			}), rootElement)
		},

		markOwnElement: function (el, how) {
			if (how === "changed" || how === "delete") {
				this.template.emit("documentChanged")
			}

			if (how === "delete") {
				ax.element(el).removeClass("changed").removeClass("saved").toggleClass(how)
			} else {
				ax.element(el).removeClass("changed").removeClass("saved").addClass(how)
			}

			return undefined
		},

		renderListControlElement: function (el, mode) {
			if (el.getAttribute("ax:showListTemplate")) {
				if (!el.newItem) {
					el.newItem = this.addNew(el)
					ax.element(el.newItem).once("change", function () {
						el.newItem = null
						this.renderListControlElement(el, mode)
					}.bind(this))
				}
			} else {
				if (!el.listControlElement) {
					el.listControlElement = ax.element.create("BUTTON.axButton.axButtonCreateListItem").setText("Add more".i18n()).on("click", this.addNew.bind(this, el)).element
				}
				if (mode === "view") {
					ax.element(el.listControlElement).remove()
				}
				if (mode === "edit") {
					el.appendChild(el.listControlElement)
				}
			}
			return undefined
		},

		setExtraControls: function (el, controlsElement) {
			if (el.controlsElement) {
				ax.element(el.controlsElement).remove()
			}

			el.controlsElement = controlsElement
			el.appendChild(controlsElement)

			this.template.refresh(controlsElement, el.variables)
			this.switchEditableMode("edit", controlsElement)
			return undefined
		},

		addNew: function (listElement) {
			// Prepare temporary key for new item
			var temporaryKey = this.template.getCollectionKey(listElement) + "/" + ax.string.encodeNumber(new Date().getTime()).string
			var newItem = this.template.renderListItem(listElement, temporaryKey)

			if (listElement.listSpacerElement && listElement.listSpacerElement.parentNode === listElement) {
				listElement.removeChild(listElement.listSpacerElement)
			}

			// Put new element into DOM
			if (listElement.listControlElement) {
				ax.element(newItem).putBefore(listElement.listControlElement)
			} else {
				listElement.appendChild(newItem)
			}

			// Make new item and it"s descendants editable
			this.switchEditableMode("edit", newItem)

			this.template.walk(function (el) {
				el.addEventListener("change", function () {
					this.template.emit("setEntityKey", this.template.getEntityKey(el), this.guessUrl(el.textContent))
				}.bind(this))
				el.focus()
			}.bind(this), this.template.filter({
				test  : this.template.attributeKey.bind(this.template),
				match : "name"
			}), newItem)

			return newItem
		},

		guessUrl: function (text) {
			var pairs = {
				"а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "yo", "є": "ye", "ж": "zh", "з": "z",
				"и": "y", "й": "j", "ї": "ji", "і": "i", "ы": "y", "к": "k", "л": "l", "м": "m", "н": "n", "о": "o",
				"п": "p", "р": "r", "с": "s", "т": "t", "у": "u", "ф": "f", "х": "h", "ц": "ts", "ч": "ch", "ш": "sh",
				"щ": "sch", "ъ": "", "ь": "", "э": "e", "ю": "yu", "я": "ya",
				"А": "A", "Б": "B", "В": "V", "Г": "G", "Д": "D", "Е": "E", "Ё": "YO", "Є": "YE", "Ж": "ZH", "З": "Z",
				"И": "I", "Й": "J", "Ї": "JI", "І": "I", "Ы": "Y", "К": "K", "Л": "L", "М": "M", "Н": "N", "О": "O",
				"П": "P", "Р": "R", "С": "S", "Т": "T", "У": "U", "Ф": "F", "Х": "H", "Ц": "TS", "Ч": "CH", "Ш": "SH",
				"Щ": "SCH", "Ъ": "", "Ь": "", "Э": "E", "Ю": "YU", "Я": "YA"
			}
			var text2 = "", ch

			text = text.substr(0, 64)
			for (var i = 0; i < text.length; i++) {
				ch = text.charAt(i)
				text2 += pairs.hasOwnProperty(ch) ? pairs[ch] : ch
			}
			text2 = text2.trim().replace(/[^\d\w]+/g, "-")

			return text2
		}
	}




	ax.ContentEditable = function (el) {
		if (!(el instanceof ax.ContentEditable)) {
			ax.extend(el, ax.ContentEditable.prototype)
		}

		return el
	}

	ax.ContentEditable.prototype = {
		onkeyup: function () {
			this.dispatchEvent(new Event("change"))
		},

		onpaste: function (event) {
			event.preventDefault()
			document.execCommand("inserttext", false, event.clipboardData.getData("text"))
			this.dispatchEvent(new Event("change"))
		},

		setContentEditable: function (mode) {
			if (this.tagName.match(/^IMG|INPUT|SELECT|OPTION|TEXTAREA|META	$/)) {
				return false
			}

			if (mode === true) {
				this.contentEditable = true
				this.addEventListener("focus", this.removePlaceholder)
				this.addEventListener("blur", this.renderPlaceholder)
				// this.removeAttribute("for") // Prevent focus loose
			} else {
				this.contentEditable = false
				this.removePlaceholder()
				this.removeEventListener("focus", this.removePlaceholder)
				this.removeEventListener("blur", this.renderPlaceholder)
			}
			return this
		},

		cleanUp: function () {
			this.innerHTML = this.innerHTML.trim().replace(/<br\/?>$/, "")
			return this
		},

		removePlaceholder: function () {
			if (this.placeholder) {
				this.placeholder.remove()
				delete this.placeholder
			}
			return this
		},

		renderPlaceholder: function () {
			if (this.textContent === "") {
				this.placeholder = ax.element.create("SPAN.axPlaceholder")
					.on("click", function () {this.focus()}.bind(this))
					.putBefore(this)
					.setText(this.getAttribute("placeholder"))

				this.placeholder.element.title = this.variables.key
				// this.placeholder.element.style.top = this.offsetTop + "px"
				// this.placeholder.element.style.left = this.offsetLeft + "px"
			}
			return this
		}
	}




	ax.ContentEditableImage = function (el) {
		ax.extend(el, ax.ContentEditableImage.prototype)

		if (!el.hintElement) {
			el.hintElement = ax.element.create("SPAN.axUploadHint.axOsdPanel").element
			el.statusElement = ax.element.create("SPAN").putInside(el.hintElement).element
			el.infoElement = ax.element.create("SPAN").putInside(el.hintElement).element
			el.controlsElement = ax.element.create("SPAN").putInside(el.hintElement).element
			el.setStatus()

			el.hintElement.onclick = el.onclick.bind(el)
			el.hintElement.ondrop = el.ondrop.bind(el)
			el.hintElement.ondragover = el.ondragover.bind(el)
			el.hintElement.ondragleave = el.ondragleave.bind(el)
		}

		ax.element(el.hintElement).putBefore(el)

		return el
	}

	ax.ContentEditableImage.prototype = {
		qualityProcess: 0.92,
		qualitySave: 0.8,
		acceptMime: {
			"image/png" : true,
			"image/jpeg": true,
			"image/gif" : true
		},

		onclick    : function (event) {event.preventDefault(); return false},
		ondragover : function () {this.setStatus("dragover"); return false},
		ondragleave: function () {this.setStatus(); return false},

		ondrop: function (event) {
			var files = event.dataTransfer.files

			event.preventDefault()

			this.setStatus("loading")

			for (var i = 0; i < files.length; i++) {
				if (this.acceptMime[files[i].type]) {
					this.loadImage(files[i])
				} else {
					this.setStatus("error", files[i].type)
				}
			}
			return undefined
		},
		loadImage: function (file) {
			var reader = new FileReader()

			reader.onload = function (event) {
				this.setStatus("processing")
				this.src = event.target.result
			}.bind(this)

			this.onload = function () {
				ax.chain.call(this, this.crop, this.resize, this.onImageProcessingDone)
				this.onload = null // once
			}.bind(this)

			reader.readAsDataURL(file)
		},
		setExtraControls: function (controls) {
			this.extraControls = controls
			this.setStatus()
			return undefined
		},

		setStatus: function (status, moreText) {
			moreText = moreText ? (" " + moreText) : ""
			ax.element(this).removeClass("axDropTarget")

			if (!status)                 {this.statusExplained = "Drag new image here";}
			if (status === "dragover")   {this.statusExplained = "Drop it here!"; ax.element(this).addClass("axDropTarget");}
			if (status === "processing") {this.statusExplained = "Processing…";}
			if (status === "loading")    {this.statusExplained = "Loading…";}
			if (status === "ready")      {this.statusExplained = "New image";}
			if (status === "error")      {this.statusExplained = "Can't load";}

			this.statusElement.innerHTML = this.statusExplained.i18n() + moreText
			this.controlsElement.innerHTML = ""

			if (status === "ready" || !status) {
				this.infoElement.innerHTML = (this.getAttribute("width") || "&hellip;") + " &times; " + (this.getAttribute("height") || "&hellip;")
			} else {
				this.infoElement.innerHTML = ""
			}

			if (this.extraControls) {
				if (!status || status === "" || status === "ready") {
					this.controlsElement.appendChild(this.extraControls)
				}
			}

			return undefined
		},

		onImageProcessingDone: function() {
			this.dispatchEvent(new Event("change"))
			this.setStatus("ready")

			return undefined
		},

		resize: function(callback) {
			var targetWidth = parseInt(this.getAttribute("width"))
			var targetHeight = parseInt(this.getAttribute("height"))

			if (!targetWidth && !targetHeight) {
				return callback(false) // can"t resize
			}

			var w = this.naturalWidth
			var h = this.naturalHeight
			var ratio = w / h
			var canvas = document.createElement("canvas")

			if (!targetWidth)  {targetWidth  = Math.floor(targetHeight * ratio);}
			if (!targetHeight) {targetHeight = Math.floor(targetWidth  / ratio);}

			var tmpImg = new Image()
			tmpImg.onload = function() {
				w *= 0.5; if (w < targetWidth)  {w = targetWidth;}
				h *= 0.5; if (h < targetHeight) {h = targetHeight;}

				canvas.width = w
				canvas.height = h
				canvas.getContext("2d").drawImage(tmpImg, 0, 0, w, h)

				if (w <= targetWidth && h <= targetHeight) {
					this.src = canvas.toDataURL("image/jpeg", this.qualitySave)
					callback()
				} else {
					this.src = canvas.toDataURL("image/jpeg", this.qualityProcess)
					tmpImg.src = this.src // this will invoke next iteration
				}
			}.bind(this)

			if (w !== targetWidth && h !== targetHeight) {
				tmpImg.src = this.src // begin loop
			} else {
				callback() // good size, don"t process
			}
		},

		crop: function (callback) {
			var targetWidth = parseInt(this.getAttribute("width"))
			var targetHeight = parseInt(this.getAttribute("height"))

			if (!targetWidth || !targetHeight) {
				return callback(false) // can"t resize
			}

			var targetRatio = targetWidth / targetHeight
			var w = this.naturalWidth
			var h = this.naturalHeight
			var originalRatio = w / h
			// TODO
			// var strategy = this.getAttribute("ax:image-crop") || "middle"
			var canvas = document.createElement("canvas")

			var tmpImg = new Image()
			tmpImg.onload = function() {
				if (targetRatio > originalRatio) {
					// crop top and bottom
					var targetCropHeight = h * (originalRatio / targetRatio)
					var yCrop = (h - targetCropHeight) / 2
					canvas.width = w
					canvas.height = targetCropHeight
					canvas.getContext("2d").drawImage(tmpImg,  0, yCrop,  w, targetCropHeight,  0, 0,  w, targetCropHeight)
				} else {
					// crop left and right
					var targetCropWidth = w * (originalRatio / targetRatio)
					var xCrop = (w - targetCropWidth) / 2
					canvas.width = targetCropWidth
					canvas.height = h
					canvas.getContext("2d").drawImage(tmpImg,  xCrop, 0,  targetCropWidth, h,  0, 0,  targetCropWidth, h)
				}
				this.src = canvas.toDataURL("image/jpeg", this.qualitySave)

				callback()
			}.bind(this)

			if (targetRatio !== originalRatio) {
				tmpImg.src = this.src // begin loop
			} else {
				callback() // good size, don"t process
			}
		}
	}

	return BorschPlateEditor

}))