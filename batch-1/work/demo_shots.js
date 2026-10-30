// Screenshots for the demo guide (work/make_demo_pdf.py): the phone flow (412x860) and the laptop flow
// (1440x860) of walert, from template/web served locally, with the demo relay running.
//   cd ~/aic-event/template/web && python3 -m http.server 8899 --bind 127.0.0.1 &
//   cd ~/aic-event/template && RELAY_CODE=shots python3 tools/relay_server.py --reset --seed-demo &
//   PLAYWRIGHT=<path to a playwright package> CODE=shots node work/demo_shots.js     -> work/demo-shots/*.png
// Playwright is not a dependency of walert; point PLAYWRIGHT at any installed copy.
const { chromium } = require(process.env.PLAYWRIGHT || "playwright");
const path = require("path");
const BASE = "http://127.0.0.1:8899/";
const CODE = process.env.CODE || "shots";
const OUT = path.join(__dirname, "demo-shots");
require("fs").mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const wait = (p, ms) => p.waitForTimeout(ms);

  // Phone: first open -> French -> video -> Who are you -> I live here + switch -> card -> map
  const phone = await browser.newContext({ viewport: { width: 412, height: 860 }, deviceScaleFactor: 2, colorScheme: "light" });
  const p = await phone.newPage();
  const ps = (n) => p.screenshot({ path: `${OUT}/phone-${n}.png` });
  await p.goto(BASE); await wait(p, 1200); await ps("01-language");
  await p.click("text=Français"); await wait(p, 3800); await ps("02-video");
  await p.click("#ess-skip"); await wait(p, 700); await ps("03-who");
  await p.click("#res-open"); await p.click("#start-easy + .switch-track"); await wait(p, 500); await ps("04-live-here");
  await p.click("#res-go"); await wait(p, 1500); await ps("05-card");
  await p.click("#essentials-close"); await wait(p, 800);
  await p.click("#demo-loc"); await wait(p, 1500); await ps("06-shelter");
  await p.evaluate(() => { const b = document.getElementById("big3"); b.closest(".sheet-body").scrollTo({ top: b.offsetTop - 60 }); });
  await wait(p, 600); await ps("07-water-power-gas");

  // Laptop: policy side -> intro -> story -> Done -> send a verified message
  const laptop = await browser.newContext({ viewport: { width: 1440, height: 860 }, colorScheme: "light" });
  const l = await laptop.newPage();
  const ls = (n) => l.screenshot({ path: `${OUT}/laptop-${n}.png` });
  await l.goto(BASE + "?mode=policy"); await wait(l, 1500); await ls("01-intro");
  await l.click("#intro-close"); await wait(l, 2000); await ls("02-story-1");
  await l.click("#story-next"); await wait(l, 2000);
  await l.click("#story-next"); await wait(l, 2000); await ls("03-story-3");
  await l.click("#story-next"); await wait(l, 2000); await ls("04-story-4");
  await l.click("#story-next"); await wait(l, 800);
  // Impact by municipality: Visé, overview; then July 2021 + Buildings tab, unlocked with the code
  await l.selectOption("#impact-place", "Visé"); await wait(l, 2000); await ls("06-impact");
  await l.click('.chip >> text="July 2021"'); await l.click('.itab >> text="Buildings"'); await wait(l, 300);
  await l.fill(".unlock input", CODE); await l.click(".unlock >> text=Unlock"); await wait(l, 2500);
  await l.click('.chip >> text="1-in-100"'); await wait(l, 1500); await ls("07-buildings");
  await l.click("#send summary"); await wait(l, 300);
  await l.fill("#code", CODE);
  await l.fill("#msg-from", "Municipality of Visé");
  await l.fill("#msg", "DEMO: water rising on the Meuse. Move to an upper floor now. Not known yet: when it peaks. Next update 18:00.");
  await l.evaluate(() => { const s = document.getElementById("send"); s.closest(".sheet-body").scrollTo({ top: s.offsetTop - 20 }); });
  await wait(l, 400); await ls("05-send");
  await l.click("#send-msg"); await wait(l, 1200);

  // The phone picks the message up on its next poll
  await wait(p, 6000);
  await p.evaluate(() => { const b = document.getElementById("inbox"); b.closest(".sheet-body").scrollTo({ top: b.offsetTop - 60 }); });
  await wait(p, 600); await ps("08-message");

  await browser.close();
  console.log("shots in", OUT);
})();
