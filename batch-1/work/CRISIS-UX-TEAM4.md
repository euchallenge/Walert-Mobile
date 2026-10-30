# Crisis UI/UX: what the evidence says and what v0.8 does (Team 4)

Desk research on 29 Oct 2026, by Claude Code (web search + fetch). Every principle below comes from a page or PDF
that was opened and read; the passage is quoted. Leads that were not opened are listed at the end and not used.
External sources, not challenge data.

| # | Principle | Source (opened 29 Oct 2026) | In the app |
|---|---|---|---|
| 1 | Short, plain words, no jargon: people under stress take in less | CDC CERC *Messages and Audiences* (2018) p. 6: "When people are scared or anxious, they have a hard time taking in and remembering large amounts of information… Avoid jargon and technical terms." https://www.cdc.gov/cerc/media/pdfs/CERC_Messages_and_Audiences.pdf · W3C *Use Clear Words* https://www.w3.org/WAI/WCAG2/supplemental/patterns/o3p01-clear-words/ | Already: 3-line card, easy-read mode. v0.8: composer hint "in plain words" |
| 2 | At most three actions, said as things to do | CERC *Messages and Audiences* p. 6: "In an emergency, this drops down to only three simple directions"; "Words like no and not can be easily confused or forgotten" | Already: 3 essentials, 3 big resident actions |
| 3 | An alert says what to do, why, where and by when | Bean et al., *Comprehensive Testing of Imminent Threat Public Messages for Mobile Devices*, START/DHS S&T, 2014, pp. 3-5: "Tell people exactly what to do (guidance), describe why they should do it (hazard) and by when (time)." https://drulibrary.uoregon.edu/sites/default/files/rpds/entry/file_for_download/Imminent_Threat_Public_Messages_for_Mobile.pdf (university library copy) | v0.8: composer hint "what to do, why, where and by when" |
| 4 | A map works when it shows the affected area AND where the reader is | Same report p. 4 (finding 3): a map "specifying the areas affected, areas not affected and the receiver's location" helped; a map without the receiver's location "had the opposite effect" | Already: "you are here" dot (location stays on the phone), DEMO location outside the data area |
| 5 | People confirm before acting: say what is known and not known, give a way to check | CERC *Psychology of a Crisis* (2019) p. 4: "During crises, we want messages confirmed before taking action." https://www.cdc.gov/cerc/media/pdfs/CERC_Psychology_of_a_Crisis.pdf · CERC *Messages and Audiences* p. 7: "State what you know, what you don't know…" | Already: time on every message, official links, "not official" on shelters. v0.8: "Check them on BE-Alert or your municipality's official channels"; hint "Mark what is not known yet" |
| 6 | Name a credible, recognisable sender | CERC *Psychology of a Crisis* p. 3: "Messages should come from a credible source." START report: "Local and recognizable sources might be the most productive." National Crisis Center: a real BE-Alert message "always starts with 'BE-Alert'" https://crisiscenter.be/en/what-can-you-do/stay-informed/be-alert-alerts-your-phone | v0.8: every message carries its sender (e.g. "Municipality of Visé"), shown first in the inbox, the notification and read-aloud; the relay refuses a message without one |
| 7 | Cut mental effort: one main action, familiar patterns, do the work for the user | Whitenton, *Minimize Cognitive Load to Maximize Usability*, NN/g, 2013 https://www.nngroup.com/articles/minimize-cognitive-load/ | Already: closest shelter picked for you, 3 big actions, secondary sections folded. v0.8: video before the role choice, so nobody has to find it |
| 8 | Big touch targets, strong text contrast | WCAG 2.2 SC 2.5.8 (≥ 24×24 CSS px) https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html · SC 1.4.3 (≥ 4.5:1) https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html · Google Android Accessibility Help: "at least 48x48dp" https://support.google.com/accessibility/android/answer/7101858 | v0.8: language buttons 48×48, header buttons 44 px high. Measured: status tiles 7.2-8.5:1, muted text 6.1:1 (light) / 6.8:1 (dark), video buttons 16:1 |

**Caveats.** The START report is from 2014 and studied US adults and US alert formats. CERC is US federal
guidance. The W3C pattern is supplemental guidance, not a binding standard. No source we opened covers captions
for a muted video; ours has no audio and its text is on screen.

**Leads not opened (not used):** National Crisis Center alert-test strategy (PDF), Mileti & Sorensen (1990),
FEMA IPAWS message guidance, EECC Art. 110 / BEREC public-warning guidelines, WCAG 1.4.1 Use of Color,
Material Design accessibility pages.
