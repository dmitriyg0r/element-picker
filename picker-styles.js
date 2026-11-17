globalThis.PickerStyles = `
  :host { all: initial; color-scheme: light dark; }
  * { box-sizing: border-box; }
  [hidden] { display: none !important; }
  .layer {
    --surface: light-dark(#fffdfa, #221e1b);
    --field: light-dark(#f7f2ed, #312925);
    --text: light-dark(#292019, #f8efe7);
    --muted: light-dark(#66584d, #cbb9ab);
    --line: light-dark(#e6dcd3, #493d35);
    --accent: light-dark(#a74418, #ffad80);
    --on-accent: light-dark(#fff, #36190c);
    --mark: light-dark(#bf501c, #ffab75);
    --shadow: 0 8px 30px rgb(30 17 10 / .19);
    color-scheme: light dark; position: fixed; inset: 0; pointer-events: none;
    font: 14px/1.45 system-ui, sans-serif; color: var(--text);
  }
  button, textarea { font: inherit; color: inherit; }
  button {
    min-height: 36px; padding: 6px 10px; border: 1px solid transparent; border-radius: 8px;
    background: transparent; cursor: pointer; font-size: 13px; font-weight: 650;
  }
  button:hover:not(:disabled) { background: var(--field); }
  button:disabled { opacity: .5; cursor: default; }
  button.primary { background: var(--accent); color: var(--on-accent); }
  button.primary:hover:not(:disabled) { background: var(--accent); filter: brightness(.93); }
  button.icon { width: 36px; padding: 0; font-size: 20px; color: var(--muted); }
  button.danger { color: light-dark(#982e24, #ffaaa0); }
  a:focus-visible, button:focus-visible, textarea:focus-visible {
    outline: 2px solid var(--accent); outline-offset: 2px;
  }
  .outline {
    position: fixed; border: 2px solid var(--mark); border-radius: 4px;
    background: light-dark(rgb(191 80 28 / .07), rgb(255 171 117 / .08));
  }
  .hover { border-style: dashed; }
  .hover-label {
    position: fixed; max-width: min(280px, 70vw); padding: 3px 7px; border-radius: 5px;
    background: var(--accent); color: var(--on-accent);
    font: 600 11px/1.4 ui-monospace, monospace;
    overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
  }
  .pin {
    position: fixed; width: 27px; height: 27px; min-height: 0; padding: 0; pointer-events: auto;
    background: var(--accent); color: var(--on-accent); border: 2px solid var(--surface);
    border-radius: 50%; box-shadow: 0 2px 7px rgb(0 0 0 / .25);
    font-variant-numeric: tabular-nums; font-size: 11px;
  }
  .pin:hover:not(:disabled) { background: var(--accent); filter: brightness(.9); }
  .tray {
    position: fixed; inset-inline: 0; bottom: 16px;
    width: max-content; max-width: calc(100vw - 32px); margin-inline: auto;
    display: grid; justify-items: center; gap: 8px;
  }
  .dock, .panel {
    background: var(--surface); border: 1px solid var(--line); border-radius: 13px; box-shadow: var(--shadow);
  }
  .dock {
    display: flex; flex-wrap: wrap; align-items: center; gap: 9px;
    max-width: 100%; padding: 4px 5px 4px 10px; pointer-events: auto;
  }
  .mode { font-size: 12px; color: var(--muted); white-space: nowrap; }
  .mode::before {
    display: inline-block; width: 7px; height: 7px; margin-inline-end: 7px; border-radius: 50%;
    background: var(--mark); content: '';
  }
  .notes-link { color: var(--text); font-size: 12px; font-weight: 650; white-space: nowrap; }
  .notes-link[href] { text-underline-offset: 3px; }
  .notes-link:not([href]) { color: var(--muted); }
  .dock button { min-height: 30px; padding: 4px 9px; font-size: 12px; }
  .panel {
    width: min(370px, calc(100vw - 32px)); max-height: max(90px, calc(100dvh - 118px));
    padding: 13px; overflow: auto; pointer-events: auto;
  }
  .panel.anchored { position: fixed; }
  .panel.quick-note { width: min(248px, calc(100vw - 32px)); padding: 4px; }
  .quick-note textarea {
    margin: 0; padding: 6px 8px; min-height: 33px; max-height: 105px;
    field-sizing: content; resize: none; font-size: 13px;
  }
  .quick-note textarea:focus-visible { outline-offset: 0; }

  .panel-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 9px; }
  .panel-header h2 { margin: 0; overflow-wrap: anywhere; font-size: 15px; line-height: 1.35; }
  .panel-header button { flex: none; }
  textarea {
    width: 100%; margin-top: 5px; display: block; padding: 8px 10px;
    background: var(--field); border: 1px solid var(--line); border-radius: 8px;
    resize: vertical; min-height: 65px; max-height: 42vh;
  }
  .clipboard-text { font: 12px/1.5 ui-monospace, monospace; }
  .clipboard-fallback { position: fixed; inset: 0 auto auto 0; width: 1px; height: 1px; min-height: 0; opacity: 0; pointer-events: none; }
  .actions { display: flex; align-items: center; justify-content: space-between; gap: 4px; margin-top: 9px; }
  .actions button:last-child { margin-inline-start: auto; }
  .notes { margin: 0; padding: 0; list-style: none; }
  .notes li { display: flex; align-items: start; gap: 4px; }
  .notes li + li { border-top: 1px solid var(--line); }
  .note-row {
    display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 3px 8px;
    flex: 1; min-width: 0; text-align: start; padding: 8px 6px; overflow-wrap: anywhere;
  }
  .remove-note { flex: none; font-size: 12px; }
  .note-number { color: var(--accent); font-variant-numeric: tabular-nums; }
  .note-preview { grid-column: 2; color: var(--muted); font-size: 12px; font-weight: 400; }
`;
