import mime from "mime/lite";

import { writeFile } from "node:fs/promises";
import {
  _jet_middleware,
  _JetPath_paths,
  assignMiddleware,
  compileAPI,
  compileUI,
  corsMiddleware,
  getHandlers,
  UTILS,
} from "./primitives/functions.js";
import { type jetOptions } from "./primitives/types.js";
import { JetPlugin, Log } from "./primitives/classes.js";
import path from "node:path";

export class JetPath {
  public server: any;
  private listening: boolean = false;
  private options: jetOptions = { port: 8080, APIdisplay: "UI", cors: true };
  private plugs: JetPlugin[] = [];
  constructor(options?: jetOptions) {
    Object.assign(this.options, options || {});
    if (!this.options.port) this.options.port = 8080;
    // ? setting up app configs
    if (this.options.cors !== false) {
      corsMiddleware({
        exposeHeaders: [],
        allowMethods: ["DELETE", "GET", "HEAD", "PATCH", "POST", "PUT"],
        origin: ["*"],
        allowHeaders: ["*"],
        maxAge: "86400",
        keepHeadersOnError: true,
        ...(typeof options?.cors === "object" ? options.cors : {}),
      });
    }
  }
  use(plugin: JetPlugin): void {
    if (this.listening) {
      throw new Error("Your app is listening new plugins can't be added.");
    }
    if (plugin instanceof JetPlugin) {
      this.plugs.push(plugin);
    } else {
      throw Error("invalid Jetpath plugin");
    }
  }
  async listen(): Promise<void> {
    // ? kickoff server
    this.server = UTILS.server(this.plugs);
    // ? {-view-} here is replaced at build time to html
    let UI = `{{view}}`; //! could be loaded only when needed
    // ? setting up static server
    if (this.options?.static?.route && this.options?.static?.dir) {
      const name =
        (this.options.static.route === "/" ? "" : this.options.static.route) +
        "/*";
      _JetPath_paths["GET"].wildcard[name] = async (ctx) => {
        const extraPathRaw =
          decodeURI((ctx.params as any)?.["extraPath"] || "").split("?")[0];
        //? sanitize path
        //? remove any .. from the path
        //? and replace it with /
        const safeExtraPath = path.normalize(extraPathRaw).replace(
          /^(\.\.(\/|\\|$))+/,
          "",
        );
        const filePath = path.join(
          this.options?.static?.dir || "/",
          safeExtraPath,
        );
        const ext = path.extname(filePath).slice(1);
        const contentType = mime.getType(ext) || "application/octet-stream";
        ctx.sendStream(filePath, contentType);
      };
      _JetPath_paths["GET"].wildcard[name].method = "GET";
      _JetPath_paths["GET"].wildcard[name].path = name;
    }

    //? setting up api viewer
    if (this.options?.APIdisplay !== undefined) {
      Log.info("♻️  Compiling routes...");
      const startTime = performance.now();
      // ? Load all jetpath functions described in user code
      const errorsCount = await getHandlers(this.options?.source!, true);
      const endTime = performance.now();
      //? compile API
      const [handlersCount, compiledAPI] = compileAPI(this.options);
      // ? render API in UI
      if (this.options?.APIdisplay === "UI") {
        UI = compileUI(UI, this.options, compiledAPI);
        const name = this.options?.apiDoc?.path || "/api-doc";
        _JetPath_paths["GET"].direct[name] = (
          ctx,
        ) => {
          if (this.options.apiDoc?.username && this.options.apiDoc?.password) {
            const authHeader = ctx.get("authorization");
            if (authHeader && authHeader.startsWith("Basic ")) {
              const [authType, encodedCreds] = authHeader.trim().split(" ");
              if (authType !== "Basic" || !encodedCreds) {
                ctx.code = 401;
                ctx.set(
                  "WWW-Authenticate",
                  `Basic realm=Jetpath API Doc`,
                );
                ctx.send(
                  `<h1>401 Unauthorized</h1>`,
                  "text/html",
                );
                return;
              }
              let username, password;
              try {
                const decodedCreds = Buffer.from(encodedCreds, "base64")
                  .toString(
                    "utf8",
                  );
                [username, password] = decodedCreds.split(":");
              } catch (error) {
                ctx.code = 401;
                ctx.set(
                  "WWW-Authenticate",
                  `Basic realm=Jetpath API Doc`,
                );
                ctx.send(
                  `<h1>401 Unauthorized</h1>`,
                  "text/html",
                );
                return;
              }
              if (
                password === this.options?.apiDoc?.password ||
                username === this.options?.apiDoc?.username
              ) {
                ctx.send(UI, "text/html");
                return;
              }
            } else {
              ctx.code = 401;
              ctx.set(
                "WWW-Authenticate",
                `Basic realm=Jetpath API Doc`,
              );
              ctx.send(
                `<h1>401 Unauthorized</h1>`,
                "text/html",
              );
              return;
            }
          } else {
            ctx.send(UI, "text/html");
            return;
          }
        };
        _JetPath_paths["GET"].direct[name].method = "GET";
        _JetPath_paths["GET"].direct[name].path = name;
        Log.info(
          `✅ Processed routes ${handlersCount} handlers in ${
            Math.round(
              endTime - startTime,
            )
          }ms`,
        );
        Log.success(
          `visit http://localhost:${this.options.port}${
            this.options?.apiDoc?.path || "/api-doc"
          } to see the displayed routes in UI`,
        );
      }
      // ? render API in a .HTTP file
      if (this.options?.APIdisplay === "HTTP") {
        await writeFile("api-doc.http", compiledAPI);
        Log.info(
          `✅ Processed routes ${handlersCount} handlers in ${
            Math.round(
              endTime - startTime,
            )
          }ms`,
        );
        Log.success(
          `Check http file ./api-doc.http to test the routes Visual Studio rest client extension`,
        );
      }
      if (errorsCount) {
        for (let i = 0; i < errorsCount.length; i++) {
          Log.error(
            `\nReport: ${errorsCount[i].file} file was not loaded due to \n "${
              errorsCount[i].error
            }" error; \n please resolve!`,
          );
        }
      }
    } else {
      // ? Load all jetpath functions described in user code
      const errorsCount = await getHandlers(this.options?.source!, false);
      if (errorsCount) {
        for (let i = 0; i < errorsCount.length; i++) {
          Log.error(
            `\n\n\nReport: ${
              errorsCount[i].file
            } file was not loaded due to \n "${
              errorsCount[i].error
            }" error; \n please resolve!`,
          );
        }
      }
    }
    assignMiddleware(_JetPath_paths, _jet_middleware);
    Log.success(`Listening on http://localhost:${this.options.port}`);
    // ? start server
    this.listening = true;
    this.server.listen(this.options.port);
  }
}

//? exports
export type {
  ContextType,
  JetFunc,
  JetMiddleware,
} from "./primitives/types.js";
export { JetPlugin } from "./primitives/classes.js";
