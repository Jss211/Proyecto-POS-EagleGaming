const blockedTarget = "input, textarea, select, [contenteditable]:not([contenteditable=false]), [role=textbox], [role=combobox], dialog, [role=dialog]"

export function listenForHidBarcode(onRead: (barcode: string) => void, target: Window = window) {
  let buffer = ""
  let overflow = false
  let lastKeyAt = -Infinity
  const reset = () => { buffer = ""; overflow = false; lastKeyAt = -Infinity }

  function onKeyDown(event: KeyboardEvent) {
    const element = event.target
    if (event.defaultPrevented || event.isComposing || event.repeat || event.ctrlKey || event.altKey || event.metaKey ||
        (element instanceof Element && element.closest(blockedTarget)) ||
        target.document.querySelector("dialog[open], [role=dialog][aria-modal=true]")) {
      reset()
      return
    }

    if (event.timeStamp - lastKeyAt > 120) reset()
    if (event.key === "Enter") {
      const barcode = buffer
      const complete = !overflow && barcode.length >= 3
      reset()
      if (complete) {
        event.preventDefault()
        onRead(barcode)
      }
      return
    }
    if (event.key === "Shift") return
    if (event.key.length !== 1 || /\s/.test(event.key)) {
      reset()
      return
    }

    if (buffer.length < 128) buffer += event.key
    else overflow = true
    lastKeyAt = event.timeStamp
  }

  target.addEventListener("keydown", onKeyDown)
  target.addEventListener("focusin", reset)
  target.addEventListener("blur", reset)
  return () => {
    target.removeEventListener("keydown", onKeyDown)
    target.removeEventListener("focusin", reset)
    target.removeEventListener("blur", reset)
  }
}
