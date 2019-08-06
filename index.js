const IS_INSTRUMENTED = Symbol('isInstrumented')

const config = {
  Promise,
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
 * Configure instrumentation module
 * @param {Object} newConfig - config data
 *   - Promise - the promise class your application code uses.
 *     Defaults to host Promise.
 *   - modifyStack - function called when handling an error.
 */
const configure = newConfig => Object.assign(config, newConfig)

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
      throw modifyStack(name, error)
    }

    if (result instanceof Promise) {
      result = result.catch(error => {
        throw modifyStack(name, error)
      })
    }

    return result
  }

  wrapper.name = name
  wrapper[IS_INSTRUMENTED] = true

  return wrapper
}

/**
 * Instrument all methods of a class.
 * @param {Object} cls - The class to be instrumented
 */
const instrumentClass = cls => {
  let obj = cls.prototype
  do {
    if (obj.constructor === Object) {
      break
    }

    Object.getOwnPropertyNames(obj).forEach(k => {
      if (typeof obj[k] === 'function' && k !== 'constructor') {
        obj[k] = instrument(`${obj.constructor.name}.${k}`, obj[k])
      }
    })
  } while (obj = Object.getPrototypeOf(obj))
}

module.exports = {IS_INSTRUMENTED, instrument, instrumentClass, configure}
