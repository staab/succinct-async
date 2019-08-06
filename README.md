This is a tiny library for adding custom trace data to error objects for easier debugging. Read the [blog post]().

Example:

```
class Thing {
  something() {
    throw new Error("Oops")
  }
  async somethingElse(cb) {
    this.something(await fetch('/'))
  }
}

instrumentClass(Thing)

const doStuff = instrument('doStuff', async () => {
  const thing = new Thing()

  await thing.somethingElse()
})

doStuff()

/*
Uncaught (in promise) Error: Oops
    at Thing.something (<anonymous>:3:11)
    at Thing.wrapper (<anonymous>:11:18)
    at Thing.somethingElse (<anonymous>:6:10)
    at async <anonymous>:15:3

 Intercepted in:
	 Thing.something
	 Thing.somethingElse
	 doStuff
*/
```
