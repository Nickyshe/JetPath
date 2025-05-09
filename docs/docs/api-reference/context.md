<docmach type="wrapper" file="doc-fragments/docs.html" replacement="content">
  

# API Reference: Context (`ctx`)

The `Context` object (`ctx`) is passed to every Jetpath route handler and middleware function. It serves as the primary interface for interacting with the request, constructing the response, and accessing framework features.

*(This reference is based on the `ContextType` interface provided previously and examples in `tests/app.jet.ts`)*

## Interface Signature

```typescript
interface ContextType<
  JetData extends {
    body?: Record<string, any>;
    params?: Record<string, any>;
    query?: Record<string, any>;
  },
  JetPluginTypes extends Record<string, unknown>[]
> {
  // Properties
  app: {};
  plugins: UnionToIntersection<JetPluginTypes[number]> & Record<string, any>;
  body: JetData["body"];
  query: JetData["query"];
  params: JetData["params"];
  connection: jet_socket; // WebSocket connection object
  request: Request; // Standard Request object
  code: number; // HTTP status code
  path: string; // Request pathname

  // Methods
  eject(): never;
  validate(data?: any): JetData["body"]; // Type might vary based on usage
  sendStream(stream: any | string, ContentType: string): never;
  sendResponse(response?: Response): never;
  send(data: unknown, ContentType?: string): never;
  throw(codeOrData?: number | string | Record<string, any> | unknown, message?: string | Record<string, any>): never;
  redirect(url: string, code?: number): never; // Assuming optional code
  get(field: string): string | undefined;
  set(field: string, value: string): void;
  json(): Promise<Record<string, any>>;

  // Internal Properties (Likely not for direct use)
  _1?: string | undefined;
  _2?: Record<string, string>;
  _3?: any; // Stream?
  _4?: boolean | undefined;
  _5?: (() => never) | undefined;
  _6?: Response | false;
}
````

## Properties Reference

  * **`app: {}`**
      * Request-scoped object for sharing state between middleware/handlers. Type defined by `JetMiddleware` generic `AppState`.
  * **`plugins: { ... }`**
      * Access methods exposed by registered plugins. Type defined by `JetMiddleware`/`JetFunc` generic `JetPluginTypes`.
  * **`body: T`**
      * Holds the *parsed* request body. Populated after calling `ctx.json()`, `ctx.plugins.formData()`, `ctx.validate()`, or via eager pre-processing. Type `T` inferred from schema.
  * **`query: T`**
      * Object containing parsed URL query string parameters. Type `T` inferred from schema. Defaults to `Record<string, string | string[]>`.
  * **`params: T`**
      * Object containing parameters from dynamic route segments (e.g., `:id`). Type `T` inferred from schema. Defaults to `Record<string, string>`.
  * **`connection: jet_socket`**
      * WebSocket connection object, available only in `WS_` route handlers.
  * **`request: Request`**
      * The underlying standard Web `Request` object.
  * **`code: number`**
      * Get/Set the HTTP status code for the response (default: 200).
  * **`path: string`**
      * The pathname part of the request URL.

## Methods Reference

*(Methods returning `never` terminate the request flow)*

  * **`eject(): never`**
      * Detaches Jetpath's automatic response handling. Use for manual stream control.
  * **`validate(dataOrSchema?: any): T`**
      * Validates context data (body, query, params) against a schema. Throws on error, returns validated data (`T`) on success.
  * **`sendStream(stream: ReadableStream | any, ContentType: string): never`**
      * Sends a `ReadableStream` as the response body. Set `ContentType`.
  * **`sendResponse(response?: Response): never`**
      * Sends a pre-constructed standard `Response` object. Bypasses Jetpath serialization.
  * **`send(data: unknown, ContentType?: string): never`**
      * Sends a response. Auto-serializes objects/arrays to JSON (`application/json`). Sets `Content-Type` based on data type or argument. Uses `ctx.code` for status.
  * **`throw(codeOrData?, message?): never`**
      * Signals an HTTP error, interrupting flow. Caught by middleware. See [Error Handling](https://www.google.com/search?q=./error-handling.md).
  * **`redirect(url: string, code: number = 302): never`**
      * Sends an HTTP redirect response (default status 302). Sets `Location` header.
  * **`get(field: string): string | undefined`**
      * Gets a request header value (case-insensitive).
  * **`set(field: string, value: string): void`**
      * Sets a response header value.
  * **`json(): Promise<Record<string, any>>`**
      * Asynchronously parses the request body as JSON and assigns it to `ctx.body`. Throws on invalid JSON or if body already consumed.

*(For more detailed examples and usage context, please refer to the [Core Concepts: Context](https://www.google.com/search?q=./context.md) page.)*
 
</docmach>



