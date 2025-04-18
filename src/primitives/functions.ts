// compatible node imports
import { opendir } from "node:fs/promises";
import path from "node:path";
import { cwd } from "node:process";
import { createServer } from "node:http";
// type imports
import { type IncomingMessage, type ServerResponse } from "node:http";
import {
  type allowedMethods,
  AnyExecutor,
  type HTTPBody,
  type JetFunc,
  type jetOptions,
  type methods,
} from "./types.js";
import { Context, type JetPlugin, JetSocket, Log } from "./classes.js";

/**
 * an inbuilt CORS post middleware
 *
 * @param {Object} [options] cors options
 *    @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer/Planned_changes
 *  - {Boolean} privateNetworkAccess handle `Access-Control-Request-Private-Network` request by return `Access-Control-Allow-Private-Network`, default to false
 *    @see https://wicg.github.io/private-network-access/
 * @return {Function} cors post middleware
 * @public
 */

let cors: (ctx: Context) => void;
const optionsCtx = {
  _1: undefined,
  _2: {},
  code: 204,
  set(field: string, value: string) {
    if (field && value) {
      (this._2 as Record<string, string>)[field] = value;
    }
  },
};
export function corsMiddleware(options: {
  exposeHeaders?: string[];
  allowMethods?: allowedMethods;
  allowHeaders?: string[];
  keepHeadersOnError?: boolean;
  maxAge?: string;
  credentials?: boolean;
  secureContext?: {
    "Cross-Origin-Opener-Policy":
      | "same-origin"
      | "unsafe-none"
      | "same-origin-allow-popups";
    "Cross-Origin-Embedder-Policy": "require-corp" | "unsafe-none";
  };
  privateNetworkAccess?: any;
  origin?: string[];
}) {
  //
  options.keepHeadersOnError = options.keepHeadersOnError === undefined ||
    !!options.keepHeadersOnError;
  //
  //?  pre populate context for Preflight Request
  if (options.maxAge) {
    optionsCtx.set("Access-Control-Max-Age", options.maxAge);
  }
  if (!options.privateNetworkAccess) {
    if (options.allowMethods) {
      optionsCtx.set(
        "Access-Control-Allow-Methods",
        options.allowMethods.join(","),
      );
    }
    if (options.secureContext) {
      optionsCtx.set(
        "Cross-Origin-Opener-Policy",
        options.secureContext["Cross-Origin-Embedder-Policy"],
      );
      optionsCtx.set(
        "Cross-Origin-Embedder-Policy",
        options.secureContext["Cross-Origin-Embedder-Policy"],
      );
    }
    if (options.allowHeaders) {
      optionsCtx.set(
        "Access-Control-Allow-Headers",
        options.allowHeaders.join(","),
      );
    }
  }

  cors = (ctx: Context) => {
    //? Add Vary header to indicate response varies based on the Origin header
    ctx.set("Vary", "Origin");
    if (options.credentials === true) {
      ctx.set("Access-Control-Allow-Credentials", "true");
    }
    if (Array.isArray(options.origin)) {
      ctx.set("Access-Control-Allow-Origin", options.origin.join(","));
    }
    if (ctx.request!.method !== "OPTIONS") {
      if (options.secureContext) {
        ctx.set(
          "Cross-Origin-Opener-Policy",
          options.secureContext["Cross-Origin-Embedder-Policy"],
        );
        ctx.set(
          "Cross-Origin-Embedder-Policy",
          options.secureContext["Cross-Origin-Embedder-Policy"],
        );
      }
    }
  };
}
const JetSocketInstance = new JetSocket();

export let _JetPath_paths: Record<
  methods,
  Record<
    "direct" | "wildcard" | "parameter" | "query",
    Record<string, JetFunc>
  >
> = {
  GET: {
    direct: {},
    parameter: {},
    query: {},
    wildcard: {},
  },
  POST: {
    direct: {},
    parameter: {},
    query: {},
    wildcard: {},
  },
  HEAD: {
    direct: {},
    parameter: {},
    query: {},
    wildcard: {},
  },
  PUT: {
    direct: {},
    parameter: {},
    query: {},
    wildcard: {},
  },
  PATCH: {
    direct: {},
    parameter: {},
    query: {},
    wildcard: {},
  },
  DELETE: {
    direct: {},
    parameter: {},
    query: {},
    wildcard: {},
  },
  OPTIONS: {
    direct: {},
    parameter: {},
    query: {},
    wildcard: {},
  },
};

let _JetPath_WS_HANDLER: JetFunc = undefined as any;

export const _jet_middleware: Record<
  string,
  (ctx: Context, err?: unknown) => void | Promise<void>
> = {};

export class JetPathErrors extends Error {
  constructor(message: string) {
    super(message);
  }
}

export const _DONE = new JetPathErrors("done");

export const UTILS = {
  // wsFuncs: [],
  ctxPool: [] as Context[],
  middlewares: {},
  ae(cb: { (): any; (): any; (): void }) {
    try {
      cb();
      return true;
    } catch (error) {
      return false;
    }
  },
  set() {
    const bun = UTILS.ae(() => Bun);
    // @ts-expect-error
    const deno = UTILS.ae(() => Deno);
    this.runtime = { bun, deno, node: !bun && !deno };
  },
  runtime: null as unknown as Record<string, boolean>,
  // validators: {} as Record<string, JetSchema>,
  server(
    plugs: JetPlugin<Record<string, unknown>, AnyExecutor>[],
  ): { listen: any; edge: boolean } | void {
    let server;
    let server_else;
    if (UTILS.runtime["node"]) {
      server = createServer((x: any, y: any) => {
        Jetpath(x, y);
      });
    }
    if (UTILS.runtime["deno"]) {
      server = {
        listen(port: number) {
          // @ts-expect-error
          server_else = Deno.serve({ port: port }, Jetpath);
        },
        edge: false,
      };
    }
    if (UTILS.runtime["bun"]) {
      // @ts-ignore
      if (_JetPath_WS_HANDLER) {
        server = {
          listen(port: number) {
            server_else = Bun.serve({
              port,
              // @ts-expect-error
              fetch: Jetpath,
              websocket: {
                message(...p) {
                  p[1] = {
                    // @ts-expect-error
                    data: p[1],
                  };
                  JetSocketInstance.__binder("message", p);
                },
                close(...p) {
                  JetSocketInstance.__binder("close", p.slice(1));
                },
                drain(...p) {
                  JetSocketInstance.__binder("drain", p);
                },
                open(...p) {
                  JetSocketInstance.__binder("open", p);
                },
              },
            });
          },
          edge: false,
        };
      } else {
        server = {
          listen(port: number) {
            server_else = Bun.serve({
              port,
              // @ts-expect-error
              fetch: Jetpath,
            });
          },
          edge: false,
        };
      }
    }
    //! likely on the edge
    //! let's see what the plugins has to say

    const decorations: Record<string, any> = {};

    // ? yes a plugin can bring it's own server
    const edgePluginIdx = plugs.findIndex((plug) => plug.hasServer);

    if (edgePluginIdx > -1) {
      const edgePlugin = plugs.splice(edgePluginIdx, 1)[0];
      if (edgePlugin !== undefined && edgePlugin.hasServer) {
        const decs = edgePlugin._setup({
          server: (!UTILS.runtime["node"] ? server_else! : server!) as any,
          runtime: UTILS.runtime as any,
          routesObject: _JetPath_paths,
          JetPath_app: Jetpath as any,
        });
        Object.assign(decorations, decs);
        //? setting the jet server from the plugin
        if (edgePlugin.JetPathServer) {
          server = edgePlugin.JetPathServer;
          server.edge = true;
        }
      }
    }

    //? compile plugins
    for (let i = 0; i < plugs.length; i++) {
      const decs = plugs[i]._setup({
        server: !UTILS.runtime["node"] ? server_else! : server!,
        runtime: UTILS.runtime as any,
        routesObject: _JetPath_paths,
        JetPath_app: Jetpath as any,
      });
      Object.assign(decorations, decs);
    }
    // ? adding ctx plugin bindings
    for (const key in decorations) {
      if (!(UTILS.middlewares as any)[key]) {
        (UTILS.middlewares as any)[key] = decorations[key];
      }
    }
    if (!server) {
      const edge_server = plugs.find(
        (plug) => plug.JetPathServer,
      )?.JetPathServer;
      if (edge_server !== undefined) {
        server = edge_server;
      }
    }
    return server!;
  },
};
// ? setting up the runtime check
UTILS.set();

const createCTX = (
  req: IncomingMessage | Request,
  path: string,
  route: JetFunc,
  params?: Record<string, any>,
  query?: Record<string, any>,
  socket?: boolean,
): Context => {
  if (UTILS.ctxPool.length) {
    const ctx = UTILS.ctxPool.shift()!;
    ctx._7(req as Request, path, route, params, query);
    if (socket) {
      ctx.connection = JetSocketInstance;
    }
    return ctx;
  }
  const ctx = new Context();
  // ? add middlewares to the plugins object
  Object.assign(ctx.plugins, UTILS.middlewares);
  ctx._7(req as Request, path, route, params, query);
  if (socket) {
    ctx.connection = JetSocketInstance;
  }
  return ctx;
};

const createResponse = (
  res: ServerResponse<IncomingMessage> & {
    req: IncomingMessage;
  },
  ctx: Context,
  four04?: boolean,
) => {
  //? add cors headers
  cors?.(ctx);
  // ? add ctx to ctx pool
  UTILS.ctxPool.push(ctx);
  // ? prepare response
  if (!UTILS.runtime["node"]) {
    // redirect
    if (ctx?.code === 301 && ctx._2?.["Location"]) {
      // @ts-ignore
      return Response.redirect(ctx._2?.["Location"]);
    }
    // ? streaming with ctx.sendStream
    if (ctx?._3) {
      // handle deno promise.
      // @ts-expect-error
      if (UTILS.runtime["deno"] && ctx._3.then) {
        // @ts-expect-error
        return ctx._3.then((stream: any) => {
          return new Response(stream?.readable, {
            status: (four04 && 404) || ctx.code,
            headers: ctx?._2,
          });
        });
      }
      return new Response(ctx?._3 as unknown as undefined, {
        status: 200,
        headers: ctx?._2,
      });
    }
    if (ctx._6 !== false) return ctx?._6;
    // normal response
    return new Response(ctx?._1 || (four04 ? "Not found" : undefined), {
      status: (four04 && 404) || ctx.code,
      headers: ctx?._2,
    });
  }
  if (ctx?._3) {
    res.writeHead(ctx?.code, ctx?._2);
    ctx?._3.on("error", (_err) => {
      res.statusCode;
      res.end("File not found");
    });
    return ctx._3.pipe(res);
  }

  res.writeHead(
    (four04 && 404) || ctx.code,
    ctx?._2 || { "Content-Type": "text/plain" },
  );
  res.end(ctx?._1 || (four04 ? "Not found" : undefined));
  return undefined;
};

const Jetpath = async (
  req: IncomingMessage,
  res: ServerResponse<IncomingMessage> & {
    req: IncomingMessage;
  },
) => {
  if (req.method === "OPTIONS") {
    return createResponse(res, optionsCtx as Context);
  }
  const parsedR = URL_PARSER(req as any, res);
  let ctx: Context;
  let returned: (Function | void)[] | undefined;
  if (parsedR) {
    const r = parsedR[0];
    ctx = createCTX(req, parsedR[3], r, parsedR[1], parsedR[2], parsedR[4]);
    try {
      //? pre-request middlewares here
      returned = r.jet_middleware?.length
        ? await Promise.all(r.jet_middleware.map((m) => m(ctx as any)))
        : undefined;
      //? route handler call
      await r(ctx as any);
      //? post-request middlewares here
      returned && await Promise.all(returned.map((m) => m?.(ctx, null)));
      return createResponse(res, ctx);
    } catch (error) {
      if (error instanceof JetPathErrors) {
        return createResponse(res, ctx);
      } else {
        try {
          //? report error to error middleware
          returned && await Promise.all(returned.map((m) => m?.(ctx, error)));
        } catch (error) {
          console.error(error);
        } finally {
          return createResponse(res, ctx);
        }
      }
    }
  }

  return createResponse(res, createCTX(req, "", null as any), true);
};

const handlersPath = (path: string) => {
  let type = "direct";
  if (path.includes("$")) {
    if (path.includes("$0")) {
      type = "wildcard";
    } else if (path.includes("$$")) {
      type = "query";
    } else {
      type = "parameter";
    }
  }
  let [method, ...segments] = path.split("_");
  let route = "/" + segments.join("/");
  route = route.replace(/\$\$/g, "/?") // Convert optional segments
    .replace(/\$0/g, "/*") // Convert wildcard
    .replace(/\$/g, "/:") // Convert params
    .replaceAll(/\/\//g, "/"); // change normalize akk extra / to /
  return /^(GET|POST|PUT|PATCH|DELETE|OPTIONS|MIDDLEWARE|WS)$/.test(method)
    ? [method, route, type] as [
      string,
      string,
      "direct" | "wildcard" | "parameter" | "query",
    ]
    : undefined;
};

const getModule = async (src: string, name: string) => {
  try {
    const mod = await import(path.resolve(src + "/" + name));
    return mod;
  } catch (error) {
    Log.info("Error at " + src + "/" + name + "  loading failed!");
    Log.error(String(error));
    return String(error);
  }
};
export async function getHandlers(
  source: string,
  print: boolean,
  errorsCount: { file: string; error: string }[] | undefined = undefined,
  again = false,
) {
  const curr_d = cwd();
  let error_source = source;
  source = source || "";
  if (!again) {
    source = path.resolve(path.join(curr_d, source));
    if (!source.includes(curr_d)) {
      Log.warn('source: "' + error_source + '" is invalid');
      Log.error("Jetpath source must be within the project directory");
      process.exit(1);
    }
  } else {
    source = path.resolve(curr_d, source);
  }
  const dir = await opendir(source);
  for await (const dirent of dir) {
    if (
      dirent.isFile() &&
      (dirent.name.endsWith(".jet.js") || dirent.name.endsWith(".jet.ts"))
    ) {
      if (print) {
        Log.info(
          "Loading routes at ." + source.replace(curr_d, "") + "/" +
            dirent.name,
        );
      }
      try {
        const module = await getModule(source, dirent.name);
        if (typeof module !== "string") {
          for (const p in module) {
            const params = handlersPath(p);
            if (params) {
              if (p.startsWith("MIDDLEWARE")) {
                _jet_middleware[params[1]] = module[p];
              } else {
                // ! HTTP handler
                if (typeof params !== "string") {
                  if (params[0] === "WS") {
                    _JetPath_WS_HANDLER = module[p] as JetFunc;
                    continue;
                  }
                  // ? set the method
                  module[p]!.method = params[0];
                  // ? set the path
                  module[p]!.path = params[1];
                  _JetPath_paths[params[0] as methods][params[2]][params[1]] =
                    module[
                      p
                    ] as JetFunc;
                }
              }
            }
          }
        } else {
          // record errors
          if (!errorsCount) {
            errorsCount = [];
          }
          errorsCount.push({
            file: dirent.path + "/" + dirent.name,
            error: module,
          });
        }
      } catch (error) {
        if (!errorsCount) {
          errorsCount = [];
        }
        errorsCount.push({
          file: dirent.path + "/" + dirent.name,
          error: String(error),
        });
      }
    }
    if (
      dirent.isDirectory() &&
      dirent.name !== "node_modules" &&
      dirent.name !== ".git"
    ) {
      errorsCount = await getHandlers(
        source + "/" + dirent.name,
        print,
        errorsCount,
        true,
      );
    }
  }
  return errorsCount;
}

export function validator<T extends Record<string, any>>(
  schema: HTTPBody<T> | undefined,
  data: any,
): T {
  if (!schema || typeof data !== "object") {
    throw new Error("Invalid schema or data");
  }

  const errors: string[] = [];
  const out: Partial<T> = {};

  for (const [key, defs] of Object.entries(schema)) {
    let {
      RegExp,
      arrayType,
      err,
      objectSchema,
      required,
      type,
      validator: validate,
    } = defs;
    const value = data[key];

    // Required check
    if (required && value == null) {
      errors.push(`${key} is required`);
      continue;
    }

    // Skip if optional and undefined
    if (!required && value == null) {
      continue;
    }

    // Type validation
    if (type) {
      if (type === "array") {
        if (!Array.isArray(value)) {
          errors.push(`${key} must be an array`);
          continue;
        }
        if (arrayType === "object" && objectSchema) {
          try {
            const validatedArray = value.map((item) =>
              validator(objectSchema, item)
            );
            out[key as keyof T] = validatedArray as T[keyof T];
            continue;
          } catch (e) {
            errors.push(`${key}: ${String(e)}`);
            continue;
          }
        } else if (
          arrayType &&
          !value.every((item) => typeof item === arrayType)
        ) {
          errors.push(`${key} must be an array of ${arrayType}`);
          continue;
        }
      } else if (type === "object") {
        if (typeof value !== "object" || Array.isArray(value)) {
          errors.push(`${key} must be an object`);
          continue;
        }
        // Handle objectSchema validation
        if (objectSchema) {
          try {
            out[key as keyof T] = validator(objectSchema, value) as T[keyof T];
            continue;
          } catch (e) {
            errors.push(`${key}: ${String(e)}`);
            continue;
          }
        }
      } else {
        if (typeof value !== type) {
          if (type === "file" && typeof value === "object") {
                out[key as keyof T] = value;
            continue;
          }
          errors.push(`${key} must be of type ${type}`);
          continue;
        }
      }
    }

    // Regex validation
    if (RegExp && !RegExp.test(value)) {
      errors.push(err || `${key} is incorrect`);
      continue;
    }

    // Custom validator
    if (validate) {
      const result = validate(value);
      if (result !== true) {
        errors.push(
          typeof result === "string"
            ? result
            : err || `${key} validation failed`,
        );
        continue;
      }
    }

    out[key as keyof T] = value;
  }

  if (errors.length > 0) {
    throw new Error(errors.join(", "));
  }

  return out as T;
}

/*
url parser

order of operations

parse direct match
parse placeholder
parse query
parse wildcard

*/

/**
 * Parses the URL and returns the corresponding handler, parameters, query parameters, and path.
 *
 * @param method - The HTTP method (e.g., GET, POST, etc.)
 * @param url - The URL to parse
 * @returns ? [handler, params, query, path]
 */
const URL_PARSER = (
  req: { method: methods; url: string; headers: Record<string, string> },
  res?: ServerResponse<IncomingMessage> & {
    req: IncomingMessage;
  },
):
  | [JetFunc, Record<string, any>, Record<string, any>, string, boolean]
  | undefined => {
  const routes = _JetPath_paths[req.method];
  let url: string = req.url;
  // Fast path normalization
  if (!UTILS.runtime["node"]) {
    const pathStart = url.indexOf("/", 7);
    url = pathStart >= 0 ? url.slice(pathStart) : url;
  }

  //  Direct route lookup - O(1) operation
  if (routes.direct[url]) {
    return [routes.direct[url], {}, {}, url, false];
  }

  let path = url;
  let queryIndex = url.indexOf("?");

  if (queryIndex > -1) {
    const query: Record<string, string> = {};
    path = url.slice(0, queryIndex + 1);
    if (routes.query[path]) {
      if (url.includes("=")) {
        const queryParams = new URLSearchParams(url.slice(queryIndex));
        queryParams.forEach((value, key) => {
          query[key] = value;
        });
      }
      return [routes.query[path], {}, query, path, false];
    }
  }

  // Parameter routes
  for (const pathR in routes.parameter) {
    // Quick check to avoid unnecessary processing
    if (pathR.includes(":")) {
      // Cache split results to avoid redundant operations
      const urlFixtures = url.split("/");
      const pathFixtures = pathR.split("/");

      // Fast length check before deeper comparison
      if (urlFixtures.length !== pathFixtures.length) {
        continue;
      }

      // Use break flag for early exit
      let breaked = false;
      for (let i = 0; i < pathFixtures.length; i++) {
        if (
          !pathFixtures[i].includes(":") && urlFixtures[i] !== pathFixtures[i]
        ) {
          breaked = true;
          break;
        }
      }
      if (breaked) {
        continue;
      }

      // Only process parameters after confirming a match
      const params: Record<string, string> = {};
      for (let i = 0; i < pathFixtures.length; i++) {
        const px = pathFixtures[i];
        if (px.includes(":")) {
          // Avoid repeated split operations by storing the paramName
          const paramName = px.split(":")[1];
          params[paramName] = urlFixtures[i];
        }
      }

      return [routes.parameter[pathR], params, {}, pathR, false];
    }
  }

  // @ts-expect-error
  const conn = req.headers?.["connection"] || req.headers?.get?.("connection");
  if (conn?.includes("Upgrade") && _JetPath_WS_HANDLER) {
    return [
      (ctx) => {
        if (ctx.get("upgrade") != "websocket") {
          ctx.throw();
        }
        if (UTILS.runtime["deno"]) {
          // @ts-expect-error
          const { socket, response } = Deno.upgradeWebSocket(req);
          // @ts-expect-error
          socket.addEventListener("open", (...p) => {
            JetSocketInstance.__binder("open", [socket, ...p]);
          });
          // @ts-expect-error
          socket.addEventListener("message", (...p) => {
            JetSocketInstance.__binder("message", [socket, ...p]);
          });
          // @ts-expect-error
          socket.addEventListener("drain", (...p) => {
            JetSocketInstance.__binder("drain", [socket, ...p]);
          });
          // @ts-expect-error
          socket.addEventListener("close", (...p) => {
            JetSocketInstance.__binder("close", [socket, ...p]);
          });
          _JetPath_WS_HANDLER(ctx);
          ctx.sendResponse(response);
        }
        // @ts-expect-error
        if (res?.upgrade?.(req)) {
          _JetPath_WS_HANDLER(ctx);
          ctx.sendResponse(undefined);
        }
        ctx.throw(400);
      },
      {},
      {},
      path,
      true,
    ];
  }
  // Wildcard routes
  for (const pathR in routes.wildcard) {
    if (pathR.includes("*")) {
      const baseRoute = pathR.slice(0, pathR.length - 1);
      if (path.startsWith(baseRoute)) {
        const params: Record<string, any> = {
          extraPath: path.slice(baseRoute.length),
        };
        return [routes.wildcard[pathR], params, {}, pathR, false];
      }
    }
  }
  return undefined;
};

export const compileUI = (UI: string, options: jetOptions, api: string) => {
  // ? global headers
  const globalHeaders = JSON.stringify(
    options?.globalHeaders || {
      "Authorization": "Bearer <token>",
    },
  );

  return UI.replace("{ JETPATH }", `\`${api}\``)
    .replaceAll("{ JETPATHGH }", `${JSON.stringify(globalHeaders)}`)
    .replaceAll("{NAME}", options?.apiDoc?.name || "Jetpath API Doc")
    .replaceAll("JETPATHCOLOR", options?.apiDoc?.color || "#4285f4")
    .replaceAll(
      "{LOGO}",
      options?.apiDoc?.logo ||
        "https://raw.githubusercontent.com/Uiedbook/Jetpath/main/icon-transparent.webp",
    )
    .replaceAll(
      "{INFO}",
      options?.apiDoc?.info?.replaceAll("\n", "<br>") ||
        "This is a Jetpath api preview.",
    );
};

export const compileAPI = (options: jetOptions): [number, string] => {
  let handlersCount = 0;
  let compiledAPIArray: string[] = [];
  let compiledRoutes: string[] = [];
  // ? global headers
  const globalHeaders = options?.globalHeaders || {};
  // ? loop through apis
  for (const method in _JetPath_paths) {
    // ? get all api paths from router for each method;
    const routesOfMethod: JetFunc[] = Object.values(
      _JetPath_paths[method as methods],
    ).map(
      (value) => Object.keys(value).map((key) => (value[key])),
    ).flat(2).filter((value) => value.length > 0);

    if (routesOfMethod && Object.keys(routesOfMethod).length) {
      for (const route of routesOfMethod) {
        // ? Retrieve api handler
        const validator = route;
        // ? Retrieve api body definitions
        const body = validator.body;
        // ? Retrieve api headers definitions
        const initialHeader = {};
        Object.assign(initialHeader, validator?.headers || {}, globalHeaders);
        const headers = [];
        // ? parse headers
        for (const name in initialHeader) {
          headers.push(
            name + ":" + initialHeader[name as keyof typeof initialHeader],
          );
        }
        // ? parse body
        let bodyData: Record<string, any> | undefined = undefined;
        if (body) {
          bodyData = {};
          const processSchema = (schema: any, target: any) => {
            for (const key in schema) {
              const field = schema[key];
              if (field.type === "object" && field.objectSchema) {
                target[key] = {};
                processSchema(field.objectSchema, target[key]);
              } else if (field.type === "array") {
                if (field.arrayType === "object" && field.objectSchema) {
                  target[key] = [{}];
                  processSchema(field.objectSchema, target[key][0]);
                } else {
                  target[key] = [field.arrayType || "text"];
                }
              } else {
                target[key] = field?.inputDefaultValue || field?.inputType ||
                  "text";
              }
            }
          };
          processSchema(body, bodyData);
        }
        // ? combine api infos into .http format
        const api = `\n
${method} ${
          options?.APIdisplay === "UI"
            ? "[--host--]"
            : "http://localhost:" + (options?.port || 8080)
        }${route.path} HTTP/1.1
${headers.length ? headers.join("\n") : ""}\n
${(body && method !== "GET" ? method : "") ? JSON.stringify(bodyData) : ""}\n${
          validator?.["info"] ? "#" + validator?.["info"] + "-JETE" : ""
        }
###`;

        // ? combine api(s)
        const low = sorted_insert(compiledRoutes, route.path!);
        compiledRoutes.splice(low, 0, route.path!);
        compiledAPIArray.splice(low, 0, api);
        // ? increment handler count
        handlersCount += 1;
      }
    }
  }
  // sort and join here

  const compileAPIString = compiledAPIArray.join("");
  return [handlersCount, compileAPIString];
};

const sorted_insert = (paths: string[], path: string): number => {
  let low = 0;
  let high = paths.length - 1;
  for (; low <= high;) {
    const mid = Math.floor((low + high) / 2);
    const current = paths[mid];
    if (current < path) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return low;
};

/**
 * Assigns middleware functions to routes while ensuring that each route gets exactly one middleware function.
 * A middleware function can be shared across multiple routes.
 *
 * @param _JetPath_paths - An object mapping HTTP methods to route-handler maps.
 * @param _jet_middleware - An object mapping route paths to an array of middleware functions.
 */
export function assignMiddleware(
  _JetPath_paths: { [method: string]: { [route: string]: any } },
  _jet_middleware: {
    [route: string]: (
      ctx: any,
      next: () => Promise<void>,
    ) => Promise<void> | void;
  },
): void {
  // Iterate over each HTTP method's routes.
  for (const method in _JetPath_paths) {
    const routes: JetFunc[] = Object.values(_JetPath_paths[method as methods])
      .map(
        (value) => Object.keys(value).map((key) => (value[key])),
      ).flat(2).filter((value) => value.length > 0);

    for (const route of routes) {
      if (!Array.isArray(route.jet_middleware)) {
        route.jet_middleware = [];
      }
      // If middleware is defined for the route, ensure it has exactly one middleware function.
      for (const key in _jet_middleware) {
        if (route.path!.startsWith(key)) {
          const middleware: any = _jet_middleware[key];
          // Assign the middleware function to the route handler.
          route.jet_middleware!.push(middleware);
        }
      }
    }
  }
}

export function isIdentical<T extends object, U extends object>(
  instanceA: T | null | undefined,
  instanceB: U | null | undefined,
): boolean {
  if (!instanceA || !instanceB) {
    return false;
  }
  const ownKeysA = Object.getOwnPropertyNames(instanceA);
  const ownKeysB = Object.getOwnPropertyNames(instanceB);
  if (ownKeysA.length !== ownKeysB.length) {
    return false;
  }
  ownKeysA.sort();
  ownKeysB.sort();
  for (let i = 0; i < ownKeysA.length; i++) {
    if (ownKeysA[i] !== ownKeysB[i]) {
      return false;
    }
    if (!Object.prototype.hasOwnProperty.call(instanceB, ownKeysA[i])) {
      return false;
    }
  }
  const protoA = Object.getPrototypeOf(instanceA);
  const protoB = Object.getPrototypeOf(instanceB);
  if (protoA === protoB) {
  } else if (
    !protoA || !protoB || protoA === Object.prototype ||
    protoB === Object.prototype
  ) {
    if (
      (protoA && protoA !== Object.prototype) !==
        (protoB && protoB !== Object.prototype)
    ) {
      return false;
    }
  } else {
    const protoKeysA = Object.getOwnPropertyNames(protoA);
    const protoKeysB = Object.getOwnPropertyNames(protoB);
    // Filter out constructor as it's handled separately
    const filteredProtoKeysA = protoKeysA.filter((k) => k !== "constructor")
      .sort();
    const filteredProtoKeysB = protoKeysB.filter((k) => k !== "constructor")
      .sort();
    if (filteredProtoKeysA.length !== filteredProtoKeysB.length) {
      return false;
    }
    for (let i = 0; i < filteredProtoKeysA.length; i++) {
      if (filteredProtoKeysA[i] !== filteredProtoKeysB[i]) {
        return false;
      }
      const descriptorA = Object.getOwnPropertyDescriptor(
        protoA,
        filteredProtoKeysA[i],
      );
      const descriptorB = Object.getOwnPropertyDescriptor(
        protoB,
        filteredProtoKeysB[i],
      );
      const valA = descriptorA?.value;
      const valB = descriptorB?.value;
      if (typeof valA === "function" && typeof valB === "function") {
        if (valA.length !== valB.length) {
          return false;
        }
      } else if (typeof valA !== typeof valB) {
        return false;
      }
    }
  }

  if (instanceA.constructor && instanceB.constructor) {
    if (instanceA.constructor.length !== instanceB.constructor.length) {
      return false;
    }
  } else if (instanceA.constructor !== instanceB.constructor) {
    console.error(
      `Shape mismatch: One instance lacks a constructor while the other has one.`,
    );
    return false;
  }

  return true;
}

export function parseFormData(
  rawBody: Uint8Array,
  contentType: string,
  options: { maxBodySize?: number } = {},
) {
  const { maxBodySize } = options;
  if (maxBodySize && rawBody.byteLength > maxBodySize) {
    throw new Error(
      `Body exceeds max size: ${rawBody.byteLength} > ${maxBodySize}`,
    );
  }

  const boundaryMatch = contentType.match(/boundary="?([^";]+)"?/i);
  if (!boundaryMatch) throw new Error("Invalid multipart boundary");

  const boundary = `--${boundaryMatch[1]}`;
  const boundaryBytes = new TextEncoder().encode(boundary);

  const decoder = new TextDecoder("utf-8");
  const fields: Record<string, string | string[]> = {};
  const files: Record<
    string,
    { fileName: string; content: Uint8Array; mimeType: string }
  > = {};

  const parts = splitBuffer(rawBody, boundaryBytes).slice(1, -1); // remove preamble and epilogue

  for (const part of parts) {
    const headerEndIndex = indexOfDoubleCRLF(part);
    if (headerEndIndex === -1) continue;

    const headerBytes = part.slice(0, headerEndIndex);
    let body = part.slice(headerEndIndex + 4); // Skip \r\n\r\n
    // 2) Strip leading CRLF
    if (body[0] === 13 && body[1] === 10) {
      body = body.slice(2);
    }
    // 3) Strip trailing CRLF
    if (
      body[body.length - 2] === 13 &&
      body[body.length - 1] === 10
    ) {
      body = body.slice(0, body.length - 2);
    }
    const headerText = decoder.decode(headerBytes);
    const headers = parseHeaders(headerText);

    const disposition = headers["content-disposition"];
    if (!disposition) continue;

    const nameMatch = disposition.match(/name="([^"]+)"/);
    if (!nameMatch) continue;

    const fieldName = nameMatch[1];
    const fileNameMatch = disposition.match(/filename="([^"]*)"/);
    const fileName = fileNameMatch?.[1] || null;

    if (fileName) {
      const mimeType = headers["content-type"] || "application/octet-stream";
      files[fieldName] = { fileName, content: body, mimeType };
    } else {
      const value = decoder.decode(body);
      if (fieldName in fields) {
        const existing = fields[fieldName];
        fields[fieldName] = Array.isArray(existing)
          ? [...existing, value]
          : [existing, value];
      } else {
        fields[fieldName] = value;
      }
    }
  }

  return { ...fields, ...files };
}

function parseHeaders(headerText: string): Record<string, string> {
  const headers: Record<string, string> = {};
  const lines = headerText.split(/\r\n/);
  for (const line of lines) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const val = line.slice(idx + 1).trim();
    headers[key] = val;
  }
  return headers;
}

function indexOfDoubleCRLF(buffer: Uint8Array): number {
  for (let i = 0; i < buffer.length - 3; i++) {
    if (
      buffer[i] === 13 &&
      buffer[i + 1] === 10 &&
      buffer[i + 2] === 13 &&
      buffer[i + 3] === 10
    ) {
      return i;
    }
  }
  return -1;
}

function splitBuffer(buffer: Uint8Array, delimiter: Uint8Array): Uint8Array[] {
  const parts: Uint8Array[] = [];
  let start = 0;

  while (start < buffer.length) {
    const idx = indexOf(buffer, delimiter, start);
    if (idx === -1) break;
    parts.push(buffer.slice(start, idx));
    start = idx + delimiter.length;
  }

  if (start <= buffer.length) {
    parts.push(buffer.slice(start));
  }

  return parts;
}

function indexOf(buffer: Uint8Array, search: Uint8Array, from = 0): number {
  outer: for (let i = from; i <= buffer.length - search.length; i++) {
    for (let j = 0; j < search.length; j++) {
      if (buffer[i + j] !== search[j]) continue outer;
    }
    return i;
  }
  return -1;
}

export function parseUrlEncoded(
  bodyText: string,
): Record<string, string | string[]> {
  const params = new URLSearchParams(bodyText);
  const result: Record<string, string | string[]> = {};
  for (const [key, value] of params.entries()) {
    if (result.hasOwnProperty(key)) {
      if (Array.isArray(result[key])) {
        result[key].push(value);
      } else {
        result[key] = [result[key], value];
      }
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Helper for Node.js: Reads the IncomingMessage stream, collecting chunks and checking size.
 */
function collectRequestBody(
  req: any,
  maxBodySize: number,
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (maxBodySize && size > maxBodySize) {
        reject(new Error("Payload Too Large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      resolve(new Uint8Array(Buffer.concat(chunks)));
    });
    req.on("error", (err: any) => reject(err));
  });
}

/**
 * Reads the request/stream and returns a Promise that resolves to the parsed body.
 */
export async function parseRequest(
  req: any,
  options: { maxBodySize?: number; contentType?: string } = {},
): Promise<Record<string, any>> {
  const { maxBodySize = 5 * 1024 * 1024 } = options;
  let contentType = options.contentType || "";
  let rawBody: Uint8Array;

  // Check for Fetch-compatible objects (Deno, Bun, browsers)
  if (typeof req.arrayBuffer === "function") {
    if (!contentType && req.headers && typeof req.headers.get === "function") {
      contentType = req.headers.get("content-type") || "";
    }
    const arrayBuffer = await req.arrayBuffer();
    rawBody = new Uint8Array(arrayBuffer);
    if (rawBody.byteLength > maxBodySize) {
      throw new Error("Payload Too Large");
    }
  } else if (typeof req.on === "function") {
    if (!contentType && req.headers) {
      contentType = req.headers["content-type"] || "";
    }
    rawBody = await collectRequestBody(req, maxBodySize);
  } else {
    throw new Error("Unsupported request object type");
  }

  const ct = contentType.toLowerCase();
  const decoder = new TextDecoder("utf-8");
  let bodyText: string;

  if (ct.includes("application/json")) {
    bodyText = decoder.decode(rawBody);
    return JSON.parse(bodyText);
  } else if (ct.includes("application/x-www-form-urlencoded")) {
    bodyText = decoder.decode(rawBody);
    return parseUrlEncoded(bodyText);
  } else if (ct.includes("multipart/form-data")) {
    return parseFormData(rawBody, contentType, { maxBodySize });
  } else {
    bodyText = decoder.decode(rawBody);
    return { parsed: bodyText };
  }
}
