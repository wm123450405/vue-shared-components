import { createApp, defineComponent, defineAsyncComponent, Component, App, FunctionalComponent, h } from 'vue'

const NAME = '__$SHARED_COMPONENTS$__'

type SharedComponentsRegisterType = Component | Promise<{ default: Component } | Component>

type SharedComponentsRegisterOptions = {
	name?: string;
	create?: (rootComponent: Component, rootProps?: Record<string, unknown> | null) => App<Element>;
	example?: Record<string, unknown>;
	supports?: Record<string, string[] | string>;
}

type SharedComponentsRegisted = {
	name: string;
	component: Component;
	example?: Record<string, unknown>;
	supports?: Record<string, string[] | string>;
}

type SharedComponentsHooks = {
	create: (rootComponent: Component, rootProps?: Record<string, unknown> | null) => App<Element>;
}

type SharedComponentsAsyncRegisted = SharedComponentsRegisted & {
	callback?: (registed: SharedComponentsRegisted & SharedComponentsHooks) => void;
}

type SharedComponentsNameMatchCondition = string | RegExp | ((name: string) => boolean) | SharedComponentsNameMatchCondition[] | undefined

type SharedComponentsMatchCondition = SharedComponentsNameMatchCondition | { supports: Record<string, SharedComponentsNameMatchCondition> }

type SharedComponentsNameFilterCondition = string | RegExp | undefined

type SharedComponentsFilterCondition = SharedComponentsNameFilterCondition | ((registed: SharedComponentsRegisted) => boolean) | { supports: Record<string, SharedComponentsNameFilterCondition> }

type SharedComponentsType = {
	register: (component: SharedComponentsRegisterType, options?: SharedComponentsRegisterOptions) => Promise<void>;
	onRegister: (callback: (component: SharedComponentsRegisted) => void, match: SharedComponentsMatchCondition) => void;
	find: (filter: SharedComponentsFilterCondition) => SharedComponentsRegisted[];
	get: (name: string) => SharedComponentsRegisted;
	hooks: (hook: (app: App<Element>) => void | App<Element>) => void;
}


const __listeners: {
	callback: (component: SharedComponentsRegisted) => void;
	match: SharedComponentsMatchCondition;
}[] = [];
const __registed: Record<string, SharedComponentsAsyncRegisted> = {};
const __hooks: ((app: App<Element>) => void | App<Element>)[] = [];

const create = (rootComponent: Component, rootProps?: Record<string, unknown> | null): App<Element> => {
	let app = createApp(rootComponent, rootProps)
	for (const hook of (__hooks ?? [])) {
		app = hook(app) ?? app
	}
	return app
}

const getComponentName = (component: Component) => {
	if ((component as FunctionalComponent).__file) {
		const path = (component as FunctionalComponent).__file?.split('/') ?? []
		if (path.length) {
			const fileName = path[path.length - 1]
			const index = fileName.lastIndexOf('.')
			if (index === -1) {
				if (fileName === 'index') {
					return path[path.length - 2]
				} else {
					return fileName
				}
			} else {
				const fileNameWithoutExt = fileName.substring(0, index)
				if (fileNameWithoutExt === 'index') {
					return path[path.length - 2]
				} else {
					return fileNameWithoutExt
				}
			}
		} else {
			return (component as FunctionalComponent).__name ?? component.name;
		}
	} else {
		return component.name;
	}
}

const matchComponent = (match: SharedComponentsMatchCondition, registed: SharedComponentsRegisted | string): boolean => {
	if (typeof match === 'undefined') {
		return true;
	} else if (typeof match === 'function') {
		return match(typeof registed === 'string' ? registed : registed.name);
	} else if (Array.isArray(match)) {
		return match.some((n) => matchComponent(n, registed));
	} else if (match instanceof RegExp) {
		return match.test(typeof registed === 'string' ? registed : registed.name);
	} else if (typeof match === 'object' && typeof registed === 'object') {
		const supports = (registed.supports ?? {});
		const matchSupports = (match.supports ?? {});
		return Object.entries(matchSupports).every(([k, m]) => {
			if (typeof supports[k] === 'string') {
				return matchComponent(m, supports[k]);
			} else if (Array.isArray(supports[k])) {
				return supports[k].some((s) => matchComponent(m, s));
			} else {
				return false;
			}
		});
	} else {
		return match === (typeof registed === 'string' ? registed : registed.name);
	}
}

const filterComponent = (filter: SharedComponentsFilterCondition, registed: SharedComponentsRegisted): boolean => {
	if (typeof filter === 'undefined') {
		return true;
	} else if (typeof filter === 'function') {
		return filter(registed);
	} else if (Array.isArray(filter)) {
		return filter.some((n) => filterComponent(n, registed));
	} else if (filter instanceof RegExp) {
		return filter.test(registed.name);
	} else if (typeof filter === 'object' && typeof registed === 'object') {
		return matchComponent(filter, registed);
	} else {
		return filter === registed.name;
	}
}

const SharedComponents: SharedComponentsType = (globalThis as any)[NAME]
	? new Proxy((globalThis as any)[NAME] as SharedComponentsType, {
			get(target, name) {
				const source = Reflect.get(target, name)
				if (name === 'register') {
					return function (component: SharedComponentsRegisterType, options?: SharedComponentsRegisterOptions) {
						options = options || {}
						Object.assign(options, { create })
						return Reflect.apply(source, target, [component, options])
					}
				} else if (name === 'hooks') {
					return function (hook: (app: App<Element>) => void | App<Element>) {
						__hooks.push(hook)
					}
				} else {
					return source
				}
			}
	  })
	: ((globalThis as any)[NAME] = {
		async register(component: SharedComponentsRegisterType, options?: SharedComponentsRegisterOptions) {
			if (component instanceof Promise) {
				const asyncComponent = await component;
				component = ('default' in asyncComponent ? asyncComponent.default : asyncComponent) as Component;
			}
			const name = options?.name ?? component.name ?? getComponentName(component)
			if (name) {
				const example = options?.example ?? {}
				const cCreate = options?.create ?? create
				const p = this.get(name)
				if (p) {
					if ('callback' in p) {
						(p as SharedComponentsAsyncRegisted).callback?.({ component, name, example, create: cCreate })
						delete p.callback
						for (const { callback, match } of __listeners) {
							if (matchComponent(match, p)) {
								callback(p)
							}
						}
					} else {
						console.warn(`Component ${name} is already registered.`);
					}
				}
			} else {
				console.error(`Component has no name.`, component, options);
			}
		},
		onRegister(callback: (component: SharedComponentsRegisted) => void, match: SharedComponentsMatchCondition) {
			__listeners.push({ callback, match })
		},
		find(filter: SharedComponentsFilterCondition) {
			return Object.values(__registed)
				.filter((v) => filterComponent(filter, v))
		},
		get(name: string): SharedComponentsRegisted {
			let result = __registed[name]
			if (!result) {
				const callback: {
					value: ((value: Component | PromiseLike<Component>) => void) | undefined
					result: Component | undefined
				} = { value: undefined, result: undefined }
				const p = {
					name,
					example: { },
					supports: { },
					component: defineAsyncComponent(
						() => new Promise<Component>((res) => {
							callback.result ? res(callback.result) : (callback.value = res)
						})
					),
					callback: ({ name, component, example, create, supports }: SharedComponentsRegisted & SharedComponentsHooks) => {
						p.name = name
						Object.assign(p.example, example ?? {})
						Object.assign(p.supports, supports ?? {})
						const comp = defineComponent({
							name,
							data(): {
								app: App | undefined
							} {
								return {
									app: undefined
								}
							},
							mounted() {
								this.app = create(component, this.$props)
								this.app?.mount(this.$refs.comp)
							},
							beforeUnmount() {
								this.app?.unmount()
								this.app = undefined
							},
							render() {
								return h('div', {
									ref: 'comp'
								})
							}
						})
						callback.value ? callback.value(comp) : (callback.result = comp)
					}
				}
				__registed[name] = p
				return p;
			} else {
				return result;
			}
		},
		hooks(hook: (app: App<Element>) => void | App<Element>) {
			__hooks.push(hook);
		}
	});

export default SharedComponents