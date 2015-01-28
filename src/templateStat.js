
		stat: function () {
			var count = {
				"ax:*"   : 0,
				"ax:key"   : 0,
				"ax:list"    : 0,
				"ax:include" : 0
			}
			this.walk(function(el) {
				count["ax:*"]++
				if (el.hasAttribute("ax:key"))     count["ax:key"]++
				if (el.hasAttribute("ax:list"))    count["ax:list"]++
				if (el.hasAttribute("ax:include")) count["ax:include"]++
			})
			return count
		}