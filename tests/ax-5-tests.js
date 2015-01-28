/* global console, ax */
window.addEventListener("load", function() {
		var A = console.assert

	console.log("Testing ax.array...")
		// A(ax.array(["a","b","c","d"]).find("c")        === 2)
		A(ax.array(["a","b","c","d"]).merge(["e","f"]) .equals(["a","b","c","d","e","f"]))
		A(ax.array(["a","b","c","d"]).include("c")     .equals(["a","b","c","d"]))
		A(ax.array(["a","b","c","d"]).include("e")     .equals(["a","b","c","d","e"]))
		A(ax.array(["a","b","c","d"]).remove("c")      .equals(["a","b","d"]))
		A(ax.array(["a","b","c","d"]).swap(2,0)        .equals(["c","b","a","d"]))
		A(ax.array(["a","b","c","d"]).swap(0)          .equals(["b","a","c","d"]))
		A(ax.array(["a","b","c","d"]).swap(3)          .equals(["a","b","c","d"]))
		A(ax.array(["a","b","c","d"]).swap(2,10)       .equals(["a","b","c","d"]))

	console.log("Testing ax.element...")
		var testElement2
		A(ax.element.create("DIV#testElement.myClass").setText("Hello world!").putInside("<BODY>").element.id === "testElement")
		A(ax.element("testElement").hasClass("myClass"))
		A(ax.element("testElement").empty().element.innerHTML === "")
		A(testElement2 = ax.element.create("DIV#testElement2"))
		A(testElement2.putBefore("testElement")              && document.getElementById("testElement").previousSibling.id === "testElement2")
		A(ax.element("testElement2").putAfter("testElement")  && document.getElementById("testElement").nextSibling.id === "testElement2")
		A(ax.element("testElement2").putInside("testElement") && document.getElementById("testElement").firstChild.id === "testElement2")
		A(ax.element("testElement2").remove()              && document.getElementById("testElement").hasChildNodes() === false)
		
		// Events
		A(ax.element("testElement").setText("(parent)").on("hello", function (event) {
			this.style.backgroundColor = event.detail.color
		}))
		A(testElement2.putInside("testElement").setText("(child) Hi again!").emit("hello", {color:"green"}))
		A(ax.element("testElement").element.style.backgroundColor === "green")

	console.log("Testing ax.Template.prototype.buildHref...")
		A(ax.Template.prototype.buildHref("my/first/path", "another/one")        === "my/first/another/one")
		A(ax.Template.prototype.buildHref("my/first/path", "/another/one")       === "/another/one")
		A(ax.Template.prototype.buildHref("my/first/path", "./another/one")      === "my/first/path/another/one")
		A(ax.Template.prototype.buildHref("my/first/path", "../another/one")     === "my/another/one")
		A(ax.Template.prototype.buildHref("my/first/path/", "../../another/one") === "my/another/one")
		A(ax.Template.prototype.buildHref("my/first/path", "another/one/")       === "my/first/another/one/")
		A(ax.Template.prototype.buildHref("my/first/path/", "another/one")       === "my/first/path/another/one")
		A(ax.Template.prototype.buildHref("my/first/path/", "/another/one")      === "/another/one")
		A(ax.Template.prototype.buildHref("my/first/path/", "./another/one")     === "my/first/path/another/one")
		A(ax.Template.prototype.buildHref("my/first/path/", "../another/one")    === "my/first/another/one")
		A(ax.Template.prototype.buildHref("about/..:header")                     === ":header")

	console.log("Testing ax.Observer...")
		var obs = new ax.Observer()
		var testCalled = false
		var testListenerId = null
		var testFunction1 = function (data) {testCalled = data}

		A(testListenerId = obs.on("test", testFunction1))
		A(testListenerId === "test,1")
		A(obs.on("test", function (data) {
			testCalled += data
		}))
		A(obs.once("testOnce", function (data) {
			testCalled += data
		}))
		A(obs.emit("test", 21) === 2)
		A(testCalled === 42)
		A(obs.removeListener("test", testFunction1) === 1)
		A(obs.emit("test", 4) === 1)
		A(testCalled === 46)

		A(obs.emit("testOnce", 3) === 1)
		A(obs.emit("testOnce", 3) === 0)
		A(testCalled === 49)
		A(testListenerId = obs.on("test", testFunction1))
		A(obs.removeListenerById(testListenerId) === 1)
		A(obs.emit("test2", 1) === 0)
		A(testCalled === 49)
		A(obs.emit("test", 3) === 1)
		A(testCalled === 52)

	console.log("Testing ax.chain...")
		var obj = {
			word: "p",
			fnA: function fnA (callback) {this.word += "a"; callback(); return "smile"},
			fnB: function fnB (param, callback) {this.word += "ss" + param; callback()},
			fnC: function fnC () {this.word += "d"},
			caller: function () {return ax.chain.call(this, this.fnA, this.fnB.bind(this, "e"), this.fnC)}
		}
		console.assert(obj.caller() === "smile")
		console.assert(obj.word === "passed")

	console.log("All tests finished.")
		console.info("You must see NO failed assertions above. You must see ONE failed \"false\" assertion below to besure thar assertions are working ok.")
		console.assert(false)
		console.assert(true)



})