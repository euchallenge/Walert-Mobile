// Which "what to do" version the residents side shows first: "video" (18 s animation, then the card)
// or "text" (the 3-line card straight away). The Android build sets this for the A/B test:
// ./build-apk.sh text  ->  a separate "text" app that installs next to the video one.
window.TOOL_VARIANT = "video";
