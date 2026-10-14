"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };

  // src/docs-bridge.ts
  var require_docs_bridge = __commonJS({
    "src/docs-bridge.ts"() {
      var initialize = (event) => {
        const id = event.detail;
        if (typeof id === "string" && /^[a-p]{32}$/.test(id)) {
          window._docs_annotate_canvas_by_ext = id;
          window.removeEventListener("ko-docs-init", initialize);
        }
      };
      window.addEventListener("ko-docs-init", initialize);
    }
  });
  require_docs_bridge();
})();
//# sourceMappingURL=docs-bridge.js.map
