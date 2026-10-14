// Shared by the popup and the reading panel's closed shadow root.
export const uiTheme = `:root,:host{
  color-scheme:light;
  --ink:#242b2d;--muted:#625d50;--accent:#234e64;--seal:#9f3e2d;
  --paper:#f4ecd8;--surface:#e6d8b9;--line:#242b2d;
  --mono:ui-monospace,"SFMono-Regular",Menlo,Consolas,monospace;
  --body:system-ui,-apple-system,"Hiragino Sans","Yu Gothic",sans-serif;
}
*{box-sizing:border-box}
button,input,select{border-radius:0}
button.primary{background:var(--seal);color:var(--paper)}
button.primary:hover{background:var(--ink)}
button:disabled{opacity:.45;cursor:default}
button:focus-visible,input:focus-visible,select:focus-visible,summary:focus-visible,a:focus-visible{
  outline:3px solid var(--accent);outline-offset:3px;
}
[hidden]{display:none!important}
@media(prefers-reduced-motion:reduce){*{transition:none!important;scroll-behavior:auto!important}}
`;
