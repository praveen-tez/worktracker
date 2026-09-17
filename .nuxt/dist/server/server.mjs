import { defineProdDiagnostics } from "nostics";
import { ansiFormatter } from "nostics/formatters/ansi";
import { computed, createApp, createVNode, defineAsyncComponent, defineComponent, effectScope, getCurrentInstance, getCurrentScope, h, hasInjectionContext, inject, isReactive, isReadonly, isRef, isShallow, mergeProps, onErrorCaptured, onServerPrefetch, provide, reactive, ref, resolveDynamicComponent, shallowReactive, toRaw, toRef, unref, useSSRContext } from "vue";
import { createHooks } from "C:/Users/user/Downloads/Projects/Test Mine/Tracker - logs/node_modules/nuxt/node_modules/hookable/dist/index.mjs";
import { getContext } from "C:/Users/user/Downloads/Projects/Test Mine/Tracker - logs/node_modules/nuxt/node_modules/unctx/dist/index.mjs";
import { createError, sanitizeStatusCode } from "C:/Users/user/Downloads/Projects/Test Mine/Tracker - logs/node_modules/@nuxt/nitro-server/dist/h3.mjs";
import { decodePath, encodePath, hasProtocol, isEqual, isScriptProtocol, joinURL, parseQuery, parseURL, stringifyParsedURL, stringifyQuery, withQuery } from "C:/Users/user/Downloads/Projects/Test Mine/Tracker - logs/node_modules/ufo/dist/index.mjs";
import { $fetch } from "C:/Users/user/Downloads/Projects/Test Mine/Tracker - logs/node_modules/ofetch/dist/node.mjs";
import { baseURL } from "#internal/nuxt/paths";
import { defu } from "C:/Users/user/Downloads/Projects/Test Mine/Tracker - logs/node_modules/defu/dist/defu.mjs";
import { headSymbol, useHead } from "C:/Users/user/Downloads/Projects/Test Mine/Tracker - logs/node_modules/@unhead/vue/dist/index.mjs";
import { ssrIncludeBooleanAttr, ssrInterpolate, ssrLooseContain, ssrLooseEqual, ssrRenderAttr, ssrRenderAttrs, ssrRenderClass, ssrRenderComponent, ssrRenderList, ssrRenderStyle, ssrRenderSuspense, ssrRenderVNode } from "vue/server-renderer";
//#region node_modules/nuxt/dist/app/diagnostics/_shared.js
/**
* Shared configuration for the runtime (E<N>xxx) diagnostics catalogs.
*
* Catalogs are split by domain and imported directly where used (no barrel),
* so the browser bundle only pulls in the codes a module references. Pair the
* pure-call annotations on each `defineDiagnostics()` with dev-guarded,
* statement-level report calls so report-only diagnostics strip from production.
*
* Codes are stable, fully-qualified `NUXT_E<NNNN>` identifiers. Codes with a
* dedicated docs page resolve a `see:` URL via {@link docsBase}; the rest opt
* out with `docs: false`.
*/
function docsBase(code) {
	return `https://nuxt.com/docs/4.x/errors/${code.replace("NUXT_", "").toLowerCase()}`;
}
var ansi = (open, close) => (s) => `\x1B[${open}m${s}\x1B[${close}m`;
var colors = {
	red: ansi(31, 39),
	yellow: ansi(33, 39),
	cyan: ansi(36, 39),
	gray: ansi(90, 39),
	bold: ansi(1, 22),
	dim: ansi(2, 22)
};
ansiFormatter(colors);
var prodReporter = (diagnostic) => {
	console.error(`[${diagnostic.name}]`);
};
var prodReporters = [prodReporter];
//#endregion
//#region node_modules/nuxt/dist/app/diagnostics/core.js
/**
* E1xxx
* Core / Nuxt-instance / lifecycle runtime diagnostics.
*/
var appDiagnostics = /* #__PURE__ */ defineProdDiagnostics({
	docsBase,
	reporters: prodReporters
});
//#endregion
//#region virtual:nuxt:.nuxt%2Fnuxt.config.mjs
var nuxtLinkDefaults = {
	"componentName": "NuxtLink",
	"prefetch": true,
	"prefetchOn": { "visibility": true }
};
//#endregion
//#region node_modules/nuxt/dist/app/nuxt.js
function getNuxtAppCtx(id = "nuxt-app") {
	return getContext(id, { asyncContext: false });
}
var NuxtPluginIndicator = "__nuxt_plugin";
/** @since 3.0.0 */
function createNuxtApp(options) {
	let hydratingCount = 0;
	const nuxtApp = {
		_id: options.id || "nuxt-app",
		_scope: effectScope(),
		provide: void 0,
		versions: {
			get nuxt() {
				return "4.5.2";
			},
			get vue() {
				return nuxtApp.vueApp.version;
			}
		},
		payload: shallowReactive({
			...options.ssrContext?.payload || {},
			data: shallowReactive({}),
			state: reactive({}),
			once: /* @__PURE__ */ new Set(),
			_errors: shallowReactive({})
		}),
		static: { data: {} },
		runWithContext(fn) {
			if (nuxtApp._scope.active && !getCurrentScope()) return nuxtApp._scope.run(() => callWithNuxt(nuxtApp, fn));
			return callWithNuxt(nuxtApp, fn);
		},
		isHydrating: false,
		deferHydration() {
			if (!nuxtApp.isHydrating) return () => {};
			hydratingCount++;
			let called = false;
			return () => {
				if (called) return;
				called = true;
				hydratingCount--;
				if (hydratingCount === 0) {
					nuxtApp.isHydrating = false;
					return nuxtApp.callHook("app:suspense:resolve");
				}
			};
		},
		_asyncDataPromises: {},
		_asyncData: shallowReactive({}),
		_state: shallowReactive({}),
		_payloadRevivers: {},
		...options
	};
	nuxtApp.payload.serverRendered = true;
	if (nuxtApp.ssrContext) {
		nuxtApp.payload.path = nuxtApp.ssrContext.url;
		nuxtApp.ssrContext.nuxt = nuxtApp;
		nuxtApp.ssrContext.payload = nuxtApp.payload;
		nuxtApp.ssrContext.config = {
			public: nuxtApp.ssrContext.runtimeConfig.public,
			app: nuxtApp.ssrContext.runtimeConfig.app
		};
	}
	nuxtApp.hooks = createHooks();
	nuxtApp.hook = nuxtApp.hooks.hook;
	{
		const contextCaller = async function(hooks, args) {
			for (const hook of hooks) await nuxtApp.runWithContext(() => hook(...args));
		};
		nuxtApp.hooks.callHook = (name, ...args) => nuxtApp.hooks.callHookWith(contextCaller, name, args);
	}
	nuxtApp.callHook = nuxtApp.hooks.callHook;
	nuxtApp.provide = (name, value) => {
		const $name = "$" + name;
		defineGetter(nuxtApp, $name, value);
		defineGetter(nuxtApp.vueApp.config.globalProperties, $name, value);
	};
	defineGetter(nuxtApp.vueApp, "$nuxt", nuxtApp);
	defineGetter(nuxtApp.vueApp.config.globalProperties, "$nuxt", nuxtApp);
	const runtimeConfig = options.ssrContext.runtimeConfig;
	nuxtApp.provide("config", runtimeConfig);
	return nuxtApp;
}
/** @since 3.0.0 */
async function applyPlugin(nuxtApp, plugin) {
	if (typeof plugin === "function") {
		const run = () => nuxtApp.runWithContext(() => plugin(nuxtApp));
		const { provide } = await run() || {};
		if (provide && typeof provide === "object") for (const key in provide) nuxtApp.provide(key, provide[key]);
	}
}
/** @since 3.0.0 */
async function applyPlugins(nuxtApp, plugins) {
	let error;
	for (const plugin of plugins) try {
		await applyPlugin(nuxtApp, plugin);
	} catch (e) {
		if (!nuxtApp.payload.error) throw e;
		error ||= e;
	}
	if (error) throw nuxtApp.payload.error || error;
}
/** @since 3.0.0 */
/* @__NO_SIDE_EFFECTS__ */
function defineNuxtPlugin(plugin) {
	if (typeof plugin === "function") return plugin;
	const _name = plugin._name || plugin.name;
	delete plugin.name;
	return Object.assign(plugin.setup || (() => {}), plugin, {
		[NuxtPluginIndicator]: true,
		_name
	});
}
/**
* Ensures that the setup function passed in has access to the Nuxt instance via `useNuxtApp`.
* @param nuxt A Nuxt instance
* @param setup The function to call
* @since 3.0.0
*/
function callWithNuxt(nuxt, setup, args) {
	const fn = () => args ? setup(...args) : setup();
	const nuxtAppCtx = getNuxtAppCtx(nuxt._id);
	return nuxt.vueApp.runWithContext(() => nuxtAppCtx.callAsync(nuxt, fn));
}
function tryUseNuxtApp(id) {
	let nuxtAppInstance;
	if (hasInjectionContext()) nuxtAppInstance = getCurrentInstance()?.appContext.app.$nuxt;
	nuxtAppInstance ||= getNuxtAppCtx(id).tryUse();
	return nuxtAppInstance || null;
}
function useNuxtApp(id) {
	const nuxtAppInstance = tryUseNuxtApp(id);
	if (!nuxtAppInstance) throw appDiagnostics.NUXT_E1001();
	return nuxtAppInstance;
}
/** @since 3.0.0 */
/* @__NO_SIDE_EFFECTS__ */
function useRuntimeConfig(_event) {
	return useNuxtApp().$config;
}
function defineGetter(obj, key, val) {
	Object.defineProperty(obj, key, { get: () => val });
}
//#endregion
//#region node_modules/nuxt/dist/app/utils.js
import.meta.url.replace(/\/app\/.*$/, "/");
//#endregion
//#region node_modules/nuxt/dist/app/components/injections.js
var PageRouteSymbol = Symbol("route");
//#endregion
//#region node_modules/nuxt/dist/app/diagnostics/navigation.js
/**
* E2xxx
* Navigation / routing / middleware runtime diagnostics.
*/
var navigationDiagnostics = /* #__PURE__ */ defineProdDiagnostics({
	docsBase,
	reporters: prodReporters
});
//#endregion
//#region node_modules/nuxt/dist/app/composables/router.js
/** @since 3.0.0 */
var useRouter = () => {
	return useNuxtApp()?.$router;
};
/**
* Whether the current effect scope is (a descendant of) the component instance's scope.
* A detached scope (e.g. `createSharedComposable`) outlives the component, so the
* per-page route injected there would freeze after navigation (#18903).
*/
function isScopeWithinInstance(instance) {
	const instanceScope = instance.scope;
	let scope = getCurrentScope();
	while (scope) {
		if (scope === instanceScope) return true;
		scope = scope.parent;
	}
	return false;
}
/** @since 3.0.0 */
var useRoute = (() => {
	if (hasInjectionContext()) {
		const instance = getCurrentInstance();
		if (!instance || isScopeWithinInstance(instance)) return inject(PageRouteSymbol, useNuxtApp()._route);
	}
	return useNuxtApp()._route;
});
/** @since 3.0.0 */
/* @__NO_SIDE_EFFECTS__ */
function defineNuxtRouteMiddleware(middleware) {
	return middleware;
}
/** @since 3.0.0 */
var isProcessingMiddleware = () => {
	try {
		if (useNuxtApp()._processingMiddleware) return true;
	} catch {
		return false;
	}
	return false;
};
var HTML_ATTR_UNSAFE_RE = /[&"'<>]/g;
var HTML_ATTR_ENCODE_MAP = {
	"&": "&amp;",
	"\"": "&quot;",
	"'": "&#x27;",
	"<": "&lt;",
	">": "&gt;"
};
function encodeForHtmlAttr(value) {
	return value.replace(HTML_ATTR_UNSAFE_RE, (c) => HTML_ATTR_ENCODE_MAP[c]);
}
/**
* A helper that aids in programmatic navigation within your Nuxt application.
*
* Can be called on the server and on the client, within pages, route middleware, plugins, and more.
* @param {RouteLocationRaw | undefined | null} [to] - The route to navigate to. Accepts a route object, string path, `undefined`, or `null`. Defaults to '/'.
* @param {NavigateToOptions} [options] - Optional customization for controlling the behavior of the navigation.
* @returns {Promise<void | NavigationFailure | false> | false | void | RouteLocationRaw} The navigation result, which varies depending on context and options.
* @see https://nuxt.com/docs/4.x/api/utils/navigate-to
* @since 3.0.0
*/
var navigateTo = (to, options) => {
	to ||= "/";
	const toPath = typeof to === "string" ? to : "path" in to ? resolveRouteObject(to) : useRouter().resolve(to).href;
	const isExternalHost = hasProtocol(toPath, { acceptRelative: true });
	const isExternal = options?.external || isExternalHost;
	if (isExternal) {
		if (!options?.external) throw navigationDiagnostics.NUXT_E2001({ toPath });
		const { protocol } = new URL(toPath, "http://localhost");
		if (protocol && isScriptProtocol(protocol)) throw navigationDiagnostics.NUXT_E2002({
			toPath,
			protocol
		});
	}
	const inMiddleware = isProcessingMiddleware();
	const router = useRouter();
	const nuxtApp = useNuxtApp();
	if (nuxtApp.ssrContext) {
		const fullPath = typeof to === "string" || isExternal ? toPath : router.resolve(to).fullPath || "/";
		const location = isExternal ? toPath : joinURL((/* @__PURE__ */ useRuntimeConfig()).app.baseURL, fullPath);
		const redirect = async function(response) {
			await nuxtApp.callHook("app:redirected");
			const encodedHeader = encodeURL(location, isExternalHost);
			const encodedLoc = encodeForHtmlAttr(encodedHeader);
			nuxtApp.ssrContext["~renderResponse"] = {
				statusCode: sanitizeStatusCode(options?.redirectCode || 302, 302),
				body: `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=${encodedLoc}"></head></html>`,
				headers: { location: encodedHeader }
			};
			return response;
		};
		if (!isExternal && inMiddleware) {
			router.afterEach((final) => final.fullPath === fullPath ? redirect(false) : void 0);
			return to;
		}
		return redirect(!inMiddleware ? void 0 : false);
	}
	if (isExternal) {
		nuxtApp._scope.stop();
		if (options?.replace) (void 0).replace(toPath);
		else (void 0).href = toPath;
		if (inMiddleware) {
			if (!nuxtApp.isHydrating) return false;
			return new Promise(() => {});
		}
		return Promise.resolve();
	}
	const encodedTo = typeof to === "string" ? encodeRoutePath(to) : to;
	return options?.replace ? router.replace(encodedTo) : router.push(encodedTo);
};
/**
* @internal
*/
function resolveRouteObject(to) {
	return withQuery(to.path || "", to.query || {}) + (to.hash || "");
}
/**
* @internal
*/
function encodeURL(location, isExternalHost = false) {
	const url = new URL(location, "http://localhost");
	if (!isExternalHost) return url.pathname.replace(/^\/{2,}/, "/") + url.search + url.hash;
	if (location.startsWith("//")) return url.toString().replace(url.protocol, "");
	return url.toString();
}
/**
* Encode the pathname of a route location string. Ensures decoded paths like
* `/café` are percent-encoded to match vue-router's encoded route records.
* Already-encoded paths are not double-encoded.
* @internal
*/
function encodeRoutePath(url) {
	const parsed = parseURL(url);
	return encodePath(decodePath(parsed.pathname)) + parsed.search + parsed.hash;
}
//#endregion
//#region node_modules/nuxt/dist/app/composables/error.js
var NUXT_ERROR_SIGNATURE = "__nuxt_error";
/** @since 3.0.0 */
var useError = /* @__NO_SIDE_EFFECTS__ */ () => toRef(useNuxtApp().payload, "error");
/** @since 3.0.0 */
var showError = (error) => {
	const nuxtError = createError$1(error);
	try {
		const error = /* @__PURE__ */ useError();
		error.value ||= nuxtError;
	} catch {
		throw nuxtError;
	}
	return nuxtError;
};
/** @since 3.0.0 */
var isNuxtError = (error) => !!error && typeof error === "object" && "__nuxt_error" in error;
/** @since 3.0.0 */
var createError$1 = (error) => {
	if (typeof error !== "string" && error.statusText) error.message ??= error.statusText;
	const nuxtError = createError(error);
	Object.defineProperty(nuxtError, NUXT_ERROR_SIGNATURE, {
		value: true,
		configurable: false,
		writable: false
	});
	Object.defineProperty(nuxtError, "status", {
		get: () => nuxtError.statusCode,
		configurable: true
	});
	Object.defineProperty(nuxtError, "statusText", {
		get: () => nuxtError.statusMessage,
		configurable: true
	});
	return nuxtError;
};
//#endregion
//#region virtual:nuxt:.nuxt%2Ffetch.mjs
if (!globalThis.$fetch) globalThis.$fetch = $fetch.create({ baseURL: baseURL() });
var $fetch$1 = globalThis.$fetch;
//#endregion
//#region virtual:nuxt:.nuxt%2Fglobal-polyfills.mjs
if (!("global" in globalThis)) globalThis.global = globalThis;
//#endregion
//#region node_modules/nuxt/dist/head/runtime/island-head.js
/**
* No-op `head.push` until the returned `unfreeze` runs. Plugin/transformer
* augmentations on the same head are unaffected.
*/
function freezeHead(head) {
	const realPush = head.push;
	head.push = () => ({
		dispose: () => {},
		patch: () => {},
		_i: 0
	});
	return () => {
		head.push = realPush;
	};
}
//#endregion
//#region node_modules/nuxt/dist/head/runtime/plugins/unhead.server.js
var plugin$2 = /* @__PURE__ */ defineNuxtPlugin({
	name: "nuxt:head",
	enforce: "pre",
	setup(nuxtApp) {
		const head = nuxtApp.ssrContext.head;
		if (nuxtApp.ssrContext.islandContext) {
			const unfreeze = freezeHead(head);
			nuxtApp.hooks.hookOnce("app:created", unfreeze);
		}
		nuxtApp.vueApp.use(head);
	}
});
//#endregion
//#region node_modules/nuxt/dist/app/diagnostics/manifest.js
/**
* E5xxx
* App manifest / route-rules runtime diagnostics.
*/
var manifestDiagnostics = /* #__PURE__ */ defineProdDiagnostics({
	docsBase,
	reporters: prodReporters
});
//#endregion
//#region virtual:nuxt:.nuxt%2Frouter.options.mjs
var virtual_nuxt__nuxt_2Frouter_options_default = {};
//#endregion
//#region virtual:nuxt:.nuxt%2Froute-rules.mjs
var sensitiveMatcher = (m, p) => {
	return [];
};
var foldedMatcher = sensitiveMatcher;
var decodeRoutePath = function decodeRoutePath(path) {
	if (!path.includes("%")) return path;
	const queryIndex = path.indexOf("?");
	const pathname = queryIndex === -1 ? path : path.slice(0, queryIndex);
	try {
		return queryIndex === -1 ? decodeURI(pathname) : decodeURI(pathname) + path.slice(queryIndex);
	} catch {
		return path;
	}
};
var normalizePath = (path, fold) => {
	if (typeof path !== "string") return path;
	const decoded = decodeRoutePath(path);
	return fold ? decoded.toLowerCase() : decoded;
};
var virtual_nuxt__nuxt_2Froute_rules_default = (path) => virtual_nuxt__nuxt_2Frouter_options_default.sensitive ? defu({}, ...sensitiveMatcher("", normalizePath(path, false)).map((r) => r.data).reverse()) : defu({}, ...foldedMatcher("", normalizePath(path, true)).map((r) => r.data).reverse());
//#endregion
//#region node_modules/nuxt/dist/app/composables/manifest.js
var routeRulesMatcher = virtual_nuxt__nuxt_2Froute_rules_default;
function getRouteRules(arg) {
	const path = typeof arg === "string" ? arg : arg.path;
	try {
		return routeRulesMatcher(path);
	} catch (e) {
		manifestDiagnostics.NUXT_E5003({
			path,
			cause: e
		});
		return {};
	}
}
//#endregion
//#region virtual:nuxt:.nuxt%2Fmiddleware.mjs
var globalMiddleware = [/* @__PURE__ */ defineNuxtRouteMiddleware((to) => {})];
//#endregion
//#region node_modules/nuxt/dist/app/plugins/router.js
function getRouteFromPath(fullPath) {
	const route = fullPath && typeof fullPath === "object" ? fullPath : {};
	if (typeof fullPath === "object") fullPath = stringifyParsedURL({
		pathname: fullPath.path || "",
		search: stringifyQuery(fullPath.query || {}),
		hash: fullPath.hash || ""
	});
	const url = new URL(fullPath.toString(), "http://localhost");
	return {
		path: url.pathname,
		fullPath,
		query: parseQuery(url.search),
		hash: url.hash,
		params: route.params || {},
		name: void 0,
		matched: route.matched || [],
		redirectedFrom: void 0,
		meta: route.meta || {},
		href: fullPath
	};
}
var plugin$1 = /* @__PURE__ */ defineNuxtPlugin({
	name: "nuxt:router",
	enforce: "pre",
	setup(nuxtApp) {
		const initialURL = nuxtApp.ssrContext.url;
		const routes = [];
		const hooks = {
			"navigate:before": [],
			"resolve:before": [],
			"navigate:after": [],
			"error": []
		};
		const registerHook = (hook, guard) => {
			hooks[hook].push(guard);
			return () => {
				const index = hooks[hook].indexOf(guard);
				if (index !== -1) hooks[hook].splice(index, 1);
			};
		};
		(/* @__PURE__ */ useRuntimeConfig()).app.baseURL;
		const route = reactive(getRouteFromPath(initialURL));
		let navigationCounter = 0;
		async function handleNavigation(url, replace) {
			const navigationId = ++navigationCounter;
			try {
				const to = getRouteFromPath(url);
				for (const middleware of hooks["navigate:before"]) {
					const result = await middleware(to, route);
					if (navigationId !== navigationCounter) return;
					if (result === false || result instanceof Error) return;
					if (typeof result === "string" && result.length) return await handleNavigation(result, true);
				}
				for (const handler of hooks["resolve:before"]) {
					await handler(to, route);
					if (navigationId !== navigationCounter) return;
				}
				Object.assign(route, to);
				for (const middleware of hooks["navigate:after"]) await middleware(to, route);
			} catch (err) {
				for (const handler of hooks.error) await handler(err);
			}
		}
		const router = {
			currentRoute: computed(() => route),
			isReady: () => Promise.resolve(),
			options: {},
			install: () => Promise.resolve(),
			push: (url) => handleNavigation(url, false),
			replace: (url) => handleNavigation(url, true),
			back: () => (void 0).history.go(-1),
			go: (delta) => (void 0).history.go(delta),
			forward: () => (void 0).history.go(1),
			beforeResolve: (guard) => registerHook("resolve:before", guard),
			beforeEach: (guard) => registerHook("navigate:before", guard),
			afterEach: (guard) => registerHook("navigate:after", guard),
			onError: (handler) => registerHook("error", handler),
			resolve: getRouteFromPath,
			addRoute: (parentName, route) => {
				routes.push(route);
			},
			getRoutes: () => routes,
			hasRoute: (name) => routes.some((route) => route.name === name),
			removeRoute: (name) => {
				const index = routes.findIndex((route) => route.name === name);
				if (index !== -1) routes.splice(index, 1);
			}
		};
		nuxtApp.vueApp.component("RouterLink", defineComponent({
			functional: true,
			props: {
				to: {
					type: String,
					required: true
				},
				custom: Boolean,
				replace: Boolean,
				activeClass: String,
				exactActiveClass: String,
				ariaCurrentValue: String
			},
			setup: (props, { slots }) => {
				const navigate = () => handleNavigation(props.to, props.replace);
				return () => {
					const route = router.resolve(props.to);
					return props.custom ? slots.default?.({
						href: props.to,
						navigate,
						route
					}) : h("a", {
						href: props.to,
						onClick: (e) => {
							e.preventDefault();
							return navigate();
						}
					}, slots);
				};
			}
		}));
		nuxtApp._route = route;
		nuxtApp._middleware ||= {
			global: [],
			named: {}
		};
		const initialLayout = nuxtApp.payload.state._layout;
		const initialLayoutProps = nuxtApp.payload.state._layoutProps;
		nuxtApp.hooks.hookOnce("app:created", async () => {
			router.beforeEach(async (to, from) => {
				to.meta = reactive(to.meta || {});
				if (nuxtApp.isHydrating && initialLayout && !isReadonly(to.meta.layout)) {
					to.meta.layout = initialLayout;
					to.meta.layoutProps = initialLayoutProps;
				}
				nuxtApp._processingMiddleware = true;
				nuxtApp._middlewareTo = to;
				if (!nuxtApp.ssrContext?.islandContext) {
					const middlewareEntries = /* @__PURE__ */ new Set([...globalMiddleware, ...nuxtApp._middleware.global]);
					const routeRules = getRouteRules({ path: to.path });
					if (routeRules.appMiddleware) for (const key in routeRules.appMiddleware) {
						const guard = nuxtApp._middleware.named[key];
						if (!guard) continue;
						if (routeRules.appMiddleware[key]) middlewareEntries.add(guard);
						else middlewareEntries.delete(guard);
					}
					for (const middleware of middlewareEntries) {
						const result = await nuxtApp.runWithContext(() => middleware(to, from));
						if (result === false || result instanceof Error) {
							const error = result || createError({
								status: 404,
								statusText: `Page Not Found: ${initialURL}`,
								data: { path: initialURL }
							});
							delete nuxtApp._processingMiddleware;
							delete nuxtApp._middlewareTo;
							return nuxtApp.runWithContext(() => showError(error));
						}
						if (result === true) continue;
						if (result || result === false) return result;
					}
				}
			});
			router.afterEach(() => {
				delete nuxtApp._processingMiddleware;
				delete nuxtApp._middlewareTo;
			});
			await router.replace(initialURL);
			if (!isEqual(route.fullPath, initialURL)) await nuxtApp.runWithContext(() => navigateTo(route.fullPath));
		});
		return { provide: {
			route,
			router
		} };
	}
});
//#endregion
//#region node_modules/nuxt/dist/app/diagnostics/head.js
/**
* E6xxx
* Head / unhead runtime diagnostics.
*/
var unheadDiagnostics = /* #__PURE__ */ defineProdDiagnostics({
	docsBase,
	reporters: prodReporters
});
//#endregion
//#region node_modules/nuxt/dist/head/runtime/composables.js
/**
* Injects the head client from the Nuxt context or Vue inject.
*/
function injectHead(nuxtApp) {
	const nuxt = nuxtApp || useNuxtApp();
	return nuxt.ssrContext?.head || nuxt.runWithContext(() => {
		if (hasInjectionContext()) {
			const head = inject(headSymbol);
			if (!head) throw unheadDiagnostics.NUXT_E6001();
			return head;
		}
	});
}
function useHead$1(input, options = {}) {
	const head = options.head || injectHead(options.nuxt);
	return useHead(input, {
		head,
		...options
	});
}
//#endregion
//#region node_modules/nuxt/dist/app/diagnostics/state.js
/**
* E7xxx
* Payload / state / cookie runtime diagnostics.
*/
var stateDiagnostics = /* #__PURE__ */ defineProdDiagnostics({
	docsBase,
	reporters: prodReporters
});
//#endregion
//#region node_modules/nuxt/dist/app/composables/payload.js
/**
* This is an experimental function for configuring passing rich data from server -> client.
* @since 3.4.0
*/
function definePayloadReducer(name, reduce) {
	useNuxtApp().ssrContext["~payloadReducers"][name] = reduce;
}
//#endregion
//#region node_modules/nuxt/dist/app/plugins/revive-payload.server.js
var reducers = [
	["NuxtError", (data) => isNuxtError(data) && data.toJSON()],
	["EmptyShallowRef", (data) => isRef(data) && isShallow(data) && !data.value && (typeof data.value === "bigint" ? "0n" : JSON.stringify(data.value) || "_")],
	["EmptyRef", (data) => isRef(data) && !data.value && (typeof data.value === "bigint" ? "0n" : JSON.stringify(data.value) || "_")],
	["ShallowRef", (data) => isRef(data) && isShallow(data) && data.value],
	["ShallowReactive", (data) => isReactive(data) && isShallow(data) && toRaw(data)],
	["Ref", (data) => isRef(data) && data.value],
	["Reactive", (data) => isReactive(data) && toRaw(data)]
];
//#endregion
//#region virtual:nuxt:.nuxt%2Fplugins.server.mjs
var virtual_nuxt__nuxt_2Fplugins_server_default = [
	plugin$2,
	plugin$1,
	/* @__PURE__ */ defineNuxtPlugin({
		name: "nuxt:revive-payload:server",
		setup() {
			for (const [reducer, fn] of reducers) definePayloadReducer(reducer, fn);
		}
	}),
	/* @__PURE__ */ defineNuxtPlugin({ name: "nuxt:global-components" })
];
//#endregion
//#region node_modules/nuxt/dist/app/composables/state.js
var useStateKeyPrefix = "$s";
function useState(...args) {
	const autoKey = typeof args[args.length - 1] === "string" ? args.pop() : void 0;
	if (typeof args[0] !== "string") args.unshift(autoKey);
	const [_key, init] = args;
	if (!_key || typeof _key !== "string") throw stateDiagnostics.NUXT_E7009({ key: _key });
	if (init !== void 0 && typeof init !== "function") throw stateDiagnostics.NUXT_E7007({ type: typeof init });
	const key = useStateKeyPrefix + _key;
	const nuxtApp = useNuxtApp();
	const state = toRef(nuxtApp.payload.state, key);
	if (init) nuxtApp._state[key] ??= { _default: init };
	if (state.value === void 0 && init) {
		const initialValue = init();
		if (isRef(initialValue)) {
			nuxtApp.payload.state[key] = initialValue;
			return initialValue;
		}
		state.value = initialValue;
	}
	return state;
}
//#endregion
//#region composables/useTracker.ts
var initial = {
	tasks: [],
	osg: [],
	logs: []
};
function useTracker() {
	const data = useState("tracker-data", () => structuredClone(initial));
	useState("tracker-loaded", () => false);
	const config = /* @__PURE__ */ useRuntimeConfig();
	const save = () => {};
	const load = () => {};
	const addTask = (task) => {
		data.value.tasks.push({
			...task,
			id: crypto.randomUUID()
		});
	};
	const addOsg = (item) => {
		data.value.osg.push({
			...item,
			id: crypto.randomUUID()
		});
	};
	const addLog = (entry) => {
		data.value.logs.push({
			...entry,
			id: crypto.randomUUID()
		});
	};
	const updateTask = (task) => {
		const i = data.value.tasks.findIndex((x) => x.id === task.id);
		if (i >= 0) data.value.tasks[i] = task;
	};
	const removeTask = (id) => {
		data.value.tasks = data.value.tasks.filter((x) => x.id !== id);
	};
	const syncSheets = async () => {
		if (!config.public.sheetsEndpoint) return false;
		await $fetch$1(config.public.sheetsEndpoint, {
			method: "POST",
			body: data.value
		});
		return true;
	};
	return {
		data,
		load,
		save,
		addTask,
		addOsg,
		addLog,
		updateTask,
		removeTask,
		syncSheets,
		hasSheets: computed(() => Boolean(config.public.sheetsEndpoint))
	};
}
//#endregion
//#region app.vue?vue&type=script&setup=true&lang.ts
var app_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "app",
	__ssrInlineRender: true,
	setup(__props) {
		const { data, load, addTask, addOsg, addLog, updateTask, removeTask, syncSheets, hasSheets } = useTracker();
		const view = ref("monthly");
		const activeMonth = ref("2026-07");
		const search = ref("");
		const filter = ref("All statuses");
		const showTask = ref(false);
		const showOsg = ref(false);
		const toast = ref("");
		const taskForm = ref({
			project: "",
			category: "",
			task: "",
			owner: "",
			hours: 0,
			status: "In Progress",
			priority: "Medium"
		});
		const osgForm = ref({
			title: "",
			category: "Operational",
			owner: "",
			due: "",
			status: "Open"
		});
		const monthNames = [
			"July 2026",
			"August 2026",
			"September 2026",
			"October 2026",
			"November 2026",
			"December 2026"
		];
		const months = [
			"2026-07",
			"2026-08",
			"2026-09",
			"2026-10",
			"2026-11",
			"2026-12"
		];
		const monthLabel = computed(() => (/* @__PURE__ */ new Date(`${activeMonth.value}-01T00:00:00`)).toLocaleDateString("en-US", {
			month: "long",
			year: "numeric"
		}));
		const tasks = computed(() => data.value.tasks.filter((t) => t.month === activeMonth.value && (filter.value === "All statuses" || t.status === filter.value) && Object.values(t).join(" ").toLowerCase().includes(search.value.toLowerCase())));
		const monthTasks = computed(() => data.value.tasks.filter((t) => t.month === activeMonth.value));
		const totalHours = computed(() => monthTasks.value.reduce((sum, task) => sum + Number(task.hours || 0), 0));
		const completed = computed(() => monthTasks.value.filter((t) => t.status === "Completed").length);
		const inFlight = computed(() => monthTasks.value.filter((t) => t.status !== "Completed").length);
		const categories = computed(() => new Set(monthTasks.value.map((t) => t.category).filter(Boolean)).size);
		const statusTone = (status) => status.toLowerCase().replaceAll(" ", "-");
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<div${ssrRenderAttrs(mergeProps({ class: "shell" }, _attrs))}><header class="topbar"><div class="brand"><div class="brand-icon">◷</div><div><h1>Monthly Time Tracker</h1><p>Month-wise sprint tasks and daily hours tracker</p></div></div><div class="top-period"><button>‹</button><span>▣  ${ssrInterpolate(unref(monthLabel))}</span><button>›</button><i></i><span>All Time</span></div><div class="actions"><label class="button light">⇧ Import<input type="file" accept="application/json" hidden></label><button class="button light">⇩ Export CSV</button><button class="button primary">＋ ${ssrInterpolate(unref(view) === "osg" ? "Add OSG" : "Log Time")}</button></div></header><nav class="monthbar"><strong>▣   MONTH SHEETS:</strong><!--[-->`);
			ssrRenderList(months, (month, index) => {
				_push(`<button class="${ssrRenderClass({ active: month === unref(activeMonth) })}">${ssrInterpolate(monthNames[index])} <small>${ssrInterpolate(unref(data).tasks.filter((t) => t.month === month).length)}</small></button>`);
			});
			_push(`<!--]--><button class="${ssrRenderClass({ active: unref(view) === "osg" })}">OSG</button><button class="${ssrRenderClass({ active: unref(view) === "logs" })}">Logs</button><span class="active-note">Active: ${ssrInterpolate(unref(monthLabel))}</span></nav><main>`);
			if (unref(view) === "monthly") {
				_push(`<section class="page"><div class="heading"><div><h2>${ssrInterpolate(unref(monthLabel))}</h2><p>Plan, log, and close out the work that matters.</p></div><button class="button primary">＋ Log Time</button></div><div class="metrics"><article><label>TOTAL HOURS WORKED</label><strong>${ssrInterpolate(unref(totalHours).toFixed(1))} <em>hours</em></strong><p>Across ${ssrInterpolate(new Set(unref(monthTasks).filter((t) => t.hours).map((t) => t.month)).size)} active logged days</p><footer>Daily Avg: <b>${ssrInterpolate(unref(totalHours) ? (unref(totalHours) / 20).toFixed(1) : "0.0")} hrs/day</b></footer></article><article class="green"><label>TASKS COMPLETED</label><strong>${ssrInterpolate(unref(completed))} <em>of ${ssrInterpolate(unref(monthTasks).length)} tasks</em></strong><p class="progress"><span style="${ssrRenderStyle({ width: `${unref(monthTasks).length ? unref(completed) / unref(monthTasks).length * 100 : 0}%` })}"></span></p><footer>Delivery Rate: <b>${ssrInterpolate(unref(monthTasks).length ? Math.round(unref(completed) / unref(monthTasks).length * 100) : 0)}% finished</b></footer></article><article class="amber"><label>WORK IN FLIGHT</label><strong>${ssrInterpolate(unref(inFlight))}</strong><p>In Progress    Clarification</p><footer>Status: <b>${ssrInterpolate(unref(inFlight) ? "Active work" : "All delivered")}</b></footer></article><article class="purple"><label>ACTIVE CATEGORIES</label><strong>${ssrInterpolate(unref(categories))} <em>categories</em></strong><p>${ssrInterpolate(unref(categories) ? "Tracks in this month" : "No active tracks")}</p><footer>Selected Month: <b>${ssrInterpolate(unref(monthLabel))}</b></footer></article></div><section class="report"><div class="section-title"><div><h3>◷   TIME SPENT PER PROJECT &amp; CATEGORY</h3><p>Breakdown of allocated sprint hours for ${ssrInterpolate(unref(monthLabel))}</p></div></div>`);
				if (!unref(monthTasks).length) _push(`<div class="empty">No time records found for this period.</div>`);
				else {
					_push(`<div class="bars"><!--[-->`);
					ssrRenderList([...new Set(unref(monthTasks).map((t) => t.category || "Uncategorised"))], (category) => {
						_push(`<div><span>${ssrInterpolate(category)}</span><i><b style="${ssrRenderStyle({ width: `${Math.max(8, unref(monthTasks).filter((t) => (t.category || "Uncategorised") === category).reduce((s, t) => s + t.hours, 0) / Math.max(1, unref(totalHours)) * 100)}%` })}"></b></i></div>`);
					});
					_push(`<!--]--></div>`);
				}
				_push(`</section><section class="table-card"><div class="section-title"><h3>MONTHLY WORK PLAN</h3><div class="filters"><select><option${ssrIncludeBooleanAttr(Array.isArray(unref(filter)) ? ssrLooseContain(unref(filter), null) : ssrLooseEqual(unref(filter), null)) ? " selected" : ""}>All statuses</option><option${ssrIncludeBooleanAttr(Array.isArray(unref(filter)) ? ssrLooseContain(unref(filter), null) : ssrLooseEqual(unref(filter), null)) ? " selected" : ""}>In Progress</option><option${ssrIncludeBooleanAttr(Array.isArray(unref(filter)) ? ssrLooseContain(unref(filter), null) : ssrLooseEqual(unref(filter), null)) ? " selected" : ""}>Clarification</option><option${ssrIncludeBooleanAttr(Array.isArray(unref(filter)) ? ssrLooseContain(unref(filter), null) : ssrLooseEqual(unref(filter), null)) ? " selected" : ""}>Completed</option></select><input${ssrRenderAttr("value", unref(search))} placeholder="Search tasks..."></div></div><div class="table-scroll"><table><thead><tr><th>Project</th><th>Category</th><th>Task</th><th>Owner</th><th>Hours</th><th>Status</th><th>Priority</th><th></th></tr></thead><tbody><!--[-->`);
				ssrRenderList(unref(tasks), (task) => {
					_push(`<tr><td>${ssrInterpolate(task.project)}</td><td>${ssrInterpolate(task.category)}</td><td><b>${ssrInterpolate(task.task)}</b></td><td>${ssrInterpolate(task.owner || "—")}</td><td>${ssrInterpolate(task.hours)}h</td><td><span class="${ssrRenderClass([statusTone(task.status), "tag"])}">${ssrInterpolate(task.status)}</span></td><td>${ssrInterpolate(task.priority)}</td><td><button class="delete">×</button></td></tr>`);
				});
				_push(`<!--]-->`);
				if (!unref(tasks).length) _push(`<tr><td colspan="8" class="empty">No tasks in this month yet.</td></tr>`);
				else _push(`<!---->`);
				_push(`</tbody></table></div></section></section>`);
			} else if (unref(view) === "osg") {
				_push(`<section class="page"><div class="heading"><div><h2>OSG Register</h2><p>Operational, safety, and governance actions.</p></div><button class="button primary">＋ Add OSG Item</button></div><section class="table-card"><div class="section-title"><h3>OSG ACTION REGISTER</h3></div><div class="table-scroll"><table><thead><tr><th>Action / Observation</th><th>Category</th><th>Owner</th><th>Target Date</th><th>Status</th></tr></thead><tbody><!--[-->`);
				ssrRenderList(unref(data).osg, (item) => {
					_push(`<tr><td><b>${ssrInterpolate(item.title)}</b></td><td>${ssrInterpolate(item.category)}</td><td>${ssrInterpolate(item.owner || "—")}</td><td>${ssrInterpolate(item.due || "—")}</td><td><span class="${ssrRenderClass([statusTone(item.status), "tag"])}">${ssrInterpolate(item.status)}</span></td></tr>`);
				});
				_push(`<!--]-->`);
				if (!unref(data).osg.length) _push(`<tr><td colspan="5" class="empty">No OSG items yet.</td></tr>`);
				else _push(`<!---->`);
				_push(`</tbody></table></div></section></section>`);
			} else {
				_push(`<section class="page"><div class="heading"><div><h2>Activity Logs</h2><p>A clear audit trail for the work that changes.</p></div></div><section class="table-card"><form class="log-form"><input name="user" required placeholder="Your name"><input name="text" required placeholder="What happened?"><button class="button primary">＋ Log Entry</button></form><table><thead><tr><th>Date</th><th>By</th><th>Entry</th></tr></thead><tbody><!--[-->`);
				ssrRenderList([...unref(data).logs].reverse(), (log) => {
					_push(`<tr><td>${ssrInterpolate(log.date)}</td><td>${ssrInterpolate(log.user)}</td><td>${ssrInterpolate(log.text)}</td></tr>`);
				});
				_push(`<!--]-->`);
				if (!unref(data).logs.length) _push(`<tr><td colspan="3" class="empty">No activity logged yet.</td></tr>`);
				else _push(`<!---->`);
				_push(`</tbody></table></section></section>`);
			}
			_push(`</main>`);
			if (unref(showTask)) _push(`<div class="modal-backdrop"><form class="modal"><button type="button" class="close">×</button><h3>Log Time</h3><p>Add a focused work entry to ${ssrInterpolate(unref(monthLabel))}.</p><input${ssrRenderAttr("value", unref(taskForm).task)} required placeholder="Task name"><div class="two"><input${ssrRenderAttr("value", unref(taskForm).project)} placeholder="Project"><input${ssrRenderAttr("value", unref(taskForm).category)} placeholder="Category"></div><div class="two"><input${ssrRenderAttr("value", unref(taskForm).owner)} placeholder="Owner"><input${ssrRenderAttr("value", unref(taskForm).hours)} type="number" min="0" step="0.5" placeholder="Hours"></div><div class="two"><select><option${ssrIncludeBooleanAttr(Array.isArray(unref(taskForm).status) ? ssrLooseContain(unref(taskForm).status, null) : ssrLooseEqual(unref(taskForm).status, null)) ? " selected" : ""}>In Progress</option><option${ssrIncludeBooleanAttr(Array.isArray(unref(taskForm).status) ? ssrLooseContain(unref(taskForm).status, null) : ssrLooseEqual(unref(taskForm).status, null)) ? " selected" : ""}>Clarification</option><option${ssrIncludeBooleanAttr(Array.isArray(unref(taskForm).status) ? ssrLooseContain(unref(taskForm).status, null) : ssrLooseEqual(unref(taskForm).status, null)) ? " selected" : ""}>Completed</option></select><select><option${ssrIncludeBooleanAttr(Array.isArray(unref(taskForm).priority) ? ssrLooseContain(unref(taskForm).priority, null) : ssrLooseEqual(unref(taskForm).priority, null)) ? " selected" : ""}>High</option><option${ssrIncludeBooleanAttr(Array.isArray(unref(taskForm).priority) ? ssrLooseContain(unref(taskForm).priority, null) : ssrLooseEqual(unref(taskForm).priority, null)) ? " selected" : ""}>Medium</option><option${ssrIncludeBooleanAttr(Array.isArray(unref(taskForm).priority) ? ssrLooseContain(unref(taskForm).priority, null) : ssrLooseEqual(unref(taskForm).priority, null)) ? " selected" : ""}>Low</option></select></div><button class="button primary full">Save Time Entry</button></form></div>`);
			else _push(`<!---->`);
			if (unref(showOsg)) _push(`<div class="modal-backdrop"><form class="modal"><button type="button" class="close">×</button><h3>New OSG Item</h3><p>Capture an action that needs visibility.</p><input${ssrRenderAttr("value", unref(osgForm).title)} required placeholder="Action or observation"><input${ssrRenderAttr("value", unref(osgForm).owner)} placeholder="Owner"><div class="two"><select><option${ssrIncludeBooleanAttr(Array.isArray(unref(osgForm).category) ? ssrLooseContain(unref(osgForm).category, null) : ssrLooseEqual(unref(osgForm).category, null)) ? " selected" : ""}>Operational</option><option${ssrIncludeBooleanAttr(Array.isArray(unref(osgForm).category) ? ssrLooseContain(unref(osgForm).category, null) : ssrLooseEqual(unref(osgForm).category, null)) ? " selected" : ""}>Safety</option><option${ssrIncludeBooleanAttr(Array.isArray(unref(osgForm).category) ? ssrLooseContain(unref(osgForm).category, null) : ssrLooseEqual(unref(osgForm).category, null)) ? " selected" : ""}>Governance</option></select><input${ssrRenderAttr("value", unref(osgForm).due)} type="date"></div><button class="button primary full">Save OSG Item</button></form></div>`);
			else _push(`<!---->`);
			if (unref(toast)) _push(`<div class="toast">${ssrInterpolate(unref(toast))}</div>`);
			else _push(`<!---->`);
			_push(`</div>`);
		};
	}
});
//#endregion
//#region app.vue
var _sfc_setup$2 = app_vue_vue_type_script_setup_true_lang_default.setup;
app_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("app.vue");
	return _sfc_setup$2 ? _sfc_setup$2(props, ctx) : void 0;
};
var app_default = app_vue_vue_type_script_setup_true_lang_default;
//#endregion
//#region node_modules/nuxt/dist/app/components/nuxt-error-page.vue
var _sfc_main$1 = {
	__name: "nuxt-error-page",
	__ssrInlineRender: true,
	props: { error: Object },
	setup(__props) {
		const _error = __props.error;
		const status = Number(_error.statusCode || 500);
		const is404 = status === 404;
		const statusText = _error.statusMessage ?? (is404 ? "Page Not Found" : "Internal Server Error");
		const description = _error.message || _error.toString();
		const stack = void 0;
		const _Error404 = defineAsyncComponent(() => import("./_nuxt/error-404-BbDjF-Xl.js"));
		const _Error = defineAsyncComponent(() => import("./_nuxt/error-500-DE5RylDA.js"));
		const ErrorTemplate = is404 ? _Error404 : _Error;
		return (_ctx, _push, _parent, _attrs) => {
			_push(ssrRenderComponent(unref(ErrorTemplate), mergeProps({
				status: unref(status),
				statusText: unref(statusText),
				statusCode: unref(status),
				statusMessage: unref(statusText),
				description: unref(description),
				stack: unref(stack)
			}, _attrs), null, _parent));
		};
	}
};
var _sfc_setup$1 = _sfc_main$1.setup;
_sfc_main$1.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("node_modules/nuxt/dist/app/components/nuxt-error-page.vue");
	return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
//#endregion
//#region virtual:nuxt:.nuxt%2Fisland-renderer.mjs
var IslandRenderer = () => null;
//#endregion
//#region node_modules/nuxt/dist/app/components/nuxt-root.vue
var _sfc_main = {
	__name: "nuxt-root",
	__ssrInlineRender: true,
	setup(__props) {
		const nuxtApp = useNuxtApp();
		nuxtApp.deferHydration();
		nuxtApp.ssrContext.url;
		const SingleRenderer = false;
		provide(PageRouteSymbol, useRoute());
		nuxtApp.hooks.callHookWith((hooks) => hooks.map((hook) => hook()), "vue:setup", []);
		const error = /* @__PURE__ */ useError();
		const abortRender = error.value && !nuxtApp.ssrContext.error;
		function invokeAppErrorHandler(err, target, info) {
			const errorHandler = nuxtApp.vueApp.config.errorHandler;
			if (errorHandler && !errorHandler.__nuxt_default) try {
				errorHandler(err, target, info);
			} catch (handlerError) {
				console.error("[nuxt] Error in `app.config.errorHandler`", handlerError);
			}
		}
		onErrorCaptured((err, target, info) => {
			nuxtApp.hooks.callHook("vue:error", err, target, info)?.catch((hookError) => console.error("[nuxt] Error in `vue:error` hook", hookError));
			{
				const p = nuxtApp.runWithContext(() => showError(err));
				onServerPrefetch(() => p);
				invokeAppErrorHandler(err, target, info);
				return false;
			}
		});
		const islandContext = nuxtApp.ssrContext.islandContext;
		return (_ctx, _push, _parent, _attrs) => {
			ssrRenderSuspense(_push, {
				default: () => {
					if (unref(abortRender)) _push(`<div></div>`);
					else if (unref(error)) _push(ssrRenderComponent(unref(_sfc_main$1), { error: unref(error) }, null, _parent));
					else if (unref(islandContext)) _push(ssrRenderComponent(unref(IslandRenderer), { context: unref(islandContext) }, null, _parent));
					else if (unref(SingleRenderer)) ssrRenderVNode(_push, createVNode(resolveDynamicComponent(unref(SingleRenderer)), null, null), _parent);
					else _push(ssrRenderComponent(unref(app_default), null, null, _parent));
				},
				_: 1
			});
		};
	}
};
var _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("node_modules/nuxt/dist/app/components/nuxt-root.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
//#endregion
//#region node_modules/nuxt/dist/app/entry.js
var entry = async function createNuxtAppServer(ssrContext) {
	const vueApp = createApp(_sfc_main);
	const nuxt = createNuxtApp({
		vueApp,
		ssrContext
	});
	try {
		await applyPlugins(nuxt, virtual_nuxt__nuxt_2Fplugins_server_default);
		await nuxt.hooks.callHook("app:created", vueApp);
	} catch (error) {
		await nuxt.hooks.callHook("app:error", error);
		nuxt.payload.error ||= createError$1(error);
	}
	if (ssrContext && (ssrContext["~renderResponse"] || ssrContext._renderResponse)) throw new Error("skipping render");
	return vueApp;
};
var entry_default = ((ssrContext) => entry(ssrContext));
//#endregion
export { useRouter as a, nuxtLinkDefaults as c, entry_default as default, resolveRouteObject as i, encodeRoutePath as n, useNuxtApp as o, navigateTo as r, useRuntimeConfig as s, useHead$1 as t };

//# sourceMappingURL=server.mjs.map