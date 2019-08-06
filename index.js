const IS_INSTRUMENTED = Symbol('isInstrumented')

const config = {
  Promise,
  getMethodName: (obj, k) => `${obj.constructor.name}.${k}`,
  modifyStack: (name, error) => {
    // If they threw something other than an error,
    // don't mess it up for them
    if (!(error instanceof Error)) {
      return error
    }

    // Save the original stack off, add our custom stuff to it
    if (!error.originalStack) {
      error.originalStack = error.stack
      error.stack += "\n\n    Intercepted in:"
    }

    error.stack += `\n\t ${name}`

    return error
  },
}

/**
 * Wrap a function with error handling.
 * @param {string} name - The name that will show up in the trace
 * @param {Function} f - The function to be wrapped
 */
const instrument = (name, f) => {
  // Don't instrument the same function multiple times
  if (f[IS_INSTRUMENTED]) {
    return f
  }

  // Use `function` so we have `this`
  // Don't use an async function so we're not converting
  // synchronous functions into async functions
  function wrapper(...args) {
    let result
    try {
      result = f.call(this, ...args)
    } catch (error) {
      throw config.modifyStack(name, error)
    }

    if (result instanceof config.Promise) {
      result = result.catch(error => {
        throw config.modifyStack(name, error)
      })
    }

    return result
  }

  wrapper.name = name
  wrapper[IS_INSTRUMENTED] = true

  return wrapper
}

/**
 * Instrument all methods of an object. To instrument a class,
 *   pass the class prototype.
 * @param {Object} instance - The object to be instrumented
 * @params {Object} opts - options for how to instrument the object
 *   - getName determines how to build the trace string
 *   - copyMethodsToInstance copies parent methods to the instance.
 *     Not recommended unless only a few instances are ever created.
 */
const instrumentObject = (instance, opts = {}) => {
  const getName = opts.getName || config.getMethodName
  const copyMethodsToInstance = opts.copyMethodsToInstance || false

  let obj = instance
  do {
    if (obj.constructor === Object) {
      break
    }

    Object.getOwnPropertyNames(obj).forEach(k => {
      if (typeof obj[k] === 'function' && k !== 'constructor') {
        if (copyMethodsToInstance) {
          instance[k] = instrument(getName(instance, k), instance[k] || obj[k])
        } else {
          obj[k] = instrument(getName(obj, k), obj[k])
        }
      }
    })
  } while (obj = Object.getPrototypeOf(obj))

  // Make this chainable
  return instance
}

module.exports = {IS_INSTRUMENTED, instrument, instrumentObject, succinctAsyncConfig: config}
