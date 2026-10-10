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
      window.addEventListener("fob-docs-init", (event) => {
        const id = event.detail;
        if (typeof id === "string" && /^[a-p]{32}$/.test(id)) {
          window._docs_annotate_canvas_by_ext = id;
        }
      });
    }
  });
  require_docs_bridge();
})();
//# sourceMappingURL=docs-bridge.js.map
