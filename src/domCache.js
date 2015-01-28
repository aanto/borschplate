// AMD / window.DomCache definition section BEGIN
(function (scope, factory) {
	if (typeof define === 'function' && define.amd) {
		define(factory)
	} else {
		scope.DomCache = factory()
	}
} (this, function DomCache_factory () {
// AMD / window.DomCache definition section END

	var DomCache = function() {
		this.storage = {}
	}

	DomCache.prototype = {
		push: function (key, element, data) {
			if (!this.storage[key]) {
				this.storage[key] = []
			}

			var storage = this.storage[key]
			var obj = {element:element, data:data}
			var stored = false

			// Cleanup
			for (var i = 0; i < storage.length; i++) {
				if (!stored && storage[i].element === element) {
					// Replace old cache instance of gven element with new
					storage.splice(i, 1, obj)
					stored = true
				}
				if (!document.contains(storage[i].element)) {
					storage.splice(i, 1)
					i--
				}
			}

			if (!stored) {
				this.storage[key].push(obj)
			}
		},

		walk: function (callback, key) {
			var storage = this.storage[key]
			var i

			if (!this.storage[key]) {
				return undefined
			}

			for (i = 0; i < storage.length; i++) {
				callback(storage[i].element, storage[i].data)
			}
		}
	}

	return DomCache

}))