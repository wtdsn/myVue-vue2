import { observer } from '../observer/index'
import { Watcher } from '../observer/watcher'
import { Dep, pushTarget, popTarget } from '../observer/dep'
import { proxy } from '../../shared'

// 状态初始化
export function initState(vm) {
  const opts = vm.$options

  // 方法
  if (opts.methods) initMethods(vm, opts.methods)

  // data
  if (opts.data) initData(vm)

  // computed 初始化
  if (opts.computed) initComputed(vm, opts.computed)

  // watch
  if (opts.watch) {
    initWatch(vm, opts.watch)
  }


}

// 添加 $watch
export function stateMixin(MyVue) {
  MyVue.prototype.$watch = function (
    expOrFn,
    cb,
    options
  ) {

    // 如果参数位置不对
    if (typeof cb === 'object') {
      return createWatcher(vm, expOrFn, cb, options)
    }

    const vm = this
    options = options || {}
    options.user = true
    // 为该数据创建 watch
    const watcher = new Watcher(vm, expOrFn, options, cb)

    // 如果是立即执行
    if (options.immediate) {
      pushTarget()  // 将 undefind 压入
      cb.call(vm, [watcher.value])
      popTarget()
    }

    // 返回的函数，是取消监听 ，暂不考虑
    // return function unwatchFn() {
    //   watcher.teardown()
    // }
  }
}


// 初始化 data
function initData(vm) {
  observer(vm._data)

  Object.keys(vm._data).forEach(key => {
    proxy(vm, '_data', key)
  })
}

// methods
function initMethods(vm, methods) {
  Object.keys(methods).forEach((key) => {
    vm[key] = methods[key].bind(vm)
  })
}

// computed
function initComputed(vm, computed) {
  // 在 vm 中挂载 watchers
  const watchers = (vm._computedWatchers = {})

  for (const key in computed) {
    const userDef = computed[key]
    const getter = typeof userDef === 'function' ? userDef : userDef.get

    // 为该属性添加 watcher
    watchers[key] = new Watcher(
      vm,
      getter,
      { lazy: true }
    )

    // 将此计算属性挂载到 vm 中 ， 并设置拦截
    if (!(key in vm)) {
      defineComputed(vm, key, userDef)
    }
  }
}

// 将计算属性挂载到 vm 中 ， 并设置拦截 , 占不考虑不缓存的情况
function defineComputed(vm, key, userDef) {
  const sharedPropertyDefinition = {
    configurable: true,
    enumerable: true,
  }
  sharedPropertyDefinition.get = createComputedGetter(key)

  if (userDef.get)
    sharedPropertyDefinition.set = userDef.get

  Object.defineProperty(vm, key, sharedPropertyDefinition)
}

// 对 computed 的 getter 进行封装 。使得可以缓存
function createComputedGetter(key) {
  return function computedGetter() {
    const watcher = this._computedWatchers && this._computedWatchers[key]
    if (watcher) {
      if (watcher.dirty) {
        watcher.evaluate()
      }
      if (Dep.target) {
        watcher.depend()
      }
      return watcher.value
    }
  }
}

// watch
function initWatch(vm, watch) {
  for (const key in watch) {
    const handler = watch[key]
    if (Array.isArray(handler)) {
      for (let i = 0; i < handler.length; i++) {
        createWatcher(vm, key, handler[i])
      }
    } else {
      createWatcher(vm, key, handler)
    }
  }
}

// 内部调用 $watch 
function createWatcher(
  vm,
  expOrFn,  // string 仅考虑直接属性不考虑对象内部属性
  handler,
  options
) {
  if (typeof handler === 'object') {
    options = handler
    handler = handler.handler
  }
  if (typeof handler === 'string') {
    // 如果是字符串 ，即可能是 vm 中的 method
    handler = vm[handler]
  }
  return vm.$watch(expOrFn, handler, options)
}