// AMD / window.Observer definition section BEGIN
(function (scope, factory) {
	if (typeof define === 'function' && define.amd) {
		define(factory)
	} else {
		scope.Observer = factory()
	}
} (this, function Observer_factory () {
// AMD / window.Observer definition section END


	function isEmptyObject (obj) {
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

	var Observer = function () {
		// nop
	}

	Observer.prototype = {
		on: function (event, listenerFunction) {
			if (!this.listeners) {
				this.listeners = {}
			}

			if (!this.listeners[event]) {
				this.listeners[event] = {}
			}

			if (!this.listenerId) {
				this.listenerId = 0
			}

			this.listenerId++
			this.listeners[event][this.listenerId] = listenerFunction
			var listenerId = event + "," + this.listenerId

			return listenerId
		},

		willTrigger: function (obj) {
			var event
			var emitMode = false

			for (var i = 1; i < arguments.length; i++) {
				event = arguments[i]

				if (event === "emit") {
					emitMode = true
					continue
				}

				switch (typeof event) {
					case "string": {
						if (emitMode) {
							this.on(event, this.emit.bind(obj, event))
						} else {
							this.on(event, obj[event].bind(obj))
						}
						break
					}
					case "object": {
						for (var e in event) {
							if (emitMode) {
								this.on(e, obj.emit.bind(obj, event[e]))
							} else {
								this.on(e, obj[event[e]].bind(obj))
							}
						}
						break
					}
					default: {
						throw "Wrong parameter"
					}
				}
			}
		},

		once: function (event, listenerFunction) {
			var observer = this
			var listener = function () {
				listenerFunction.apply(this, arguments)
				observer.removeListener(event, listener)
			}
			var listenerId = this.on(event, listener)
			return listenerId
		},

		removeListenerById: function (listenerId) {
			var e = listenerId.split(",", 2)
			var listenersCount = 0
			if (this.listeners[ e[0] ][ e[1] ]) {
				delete this.listeners[ e[0] ][ e[1] ]
				listenersCount++
			}
			return listenersCount
		},

		removeListener: function (event, listenerFunction) {
			var listenersCount = 0
			if (this.listeners[event]) {
				for (var i in this.listeners[event]) {
					if (this.listeners[event][i] === listenerFunction) {
						delete this.listeners[event][i]
						listenersCount++
					}
					if (isEmptyObject(this.listeners[event])) {
						delete this.listeners[event]
					}
				}
			}
			return listenersCount
		},

		emit: function (event) {
			var listenersCount = 0
			if (this.listeners) {
				for (var i in this.listeners[event]) {
					this.listeners[event][i].apply(this, Array.prototype.slice.call(arguments, 1))
					listenersCount++
				}
			}
			return listenersCount
		}
	}

	return Observer

}))