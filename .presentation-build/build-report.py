from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image, KeepTogether, Preformatted
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.colors import HexColor, white
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from pypdf import PdfReader
import json

ROOT=Path('C:/Users/Dell/Desktop/nice one')
TMP=ROOT/'.presentation-build'
OUT=ROOT/'output/pdf/NeuroQuest_Project_Report.pdf'
pdfmetrics.registerFont(TTFont('Arial','C:/Windows/Fonts/arial.ttf'))
pdfmetrics.registerFont(TTFont('Arial-Bold','C:/Windows/Fonts/arialbd.ttf'))
pdfmetrics.registerFont(TTFont('Arial-Italic','C:/Windows/Fonts/ariali.ttf'))
pdfmetrics.registerFontFamily('Arial',normal='Arial',bold='Arial-Bold',italic='Arial-Italic',boldItalic='Arial-Bold')
INK=HexColor('#241E36'); MUTED=HexColor('#625B73'); PURPLE=HexColor('#7651C8'); LIGHT=HexColor('#F3EFF9')
W,H=A4; CW=W-100
styles={
 'body':ParagraphStyle('body',fontName='Arial',fontSize=10.5,leading=15.5,textColor=INK,spaceAfter=9),
 'lead':ParagraphStyle('lead',fontName='Arial',fontSize=13,leading=19,textColor=PURPLE,spaceAfter=14),
 'title':ParagraphStyle('title',fontName='Arial-Bold',fontSize=25,leading=30,textColor=INK,spaceAfter=18),
 'h2':ParagraphStyle('h2',fontName='Arial-Bold',fontSize=13.5,leading=18,textColor=PURPLE,spaceBefore=10,spaceAfter=7,keepWithNext=True),
 'small':ParagraphStyle('small',fontName='Arial',fontSize=8.6,leading=12,textColor=MUTED,spaceAfter=7),
 'cell':ParagraphStyle('cell',fontName='Arial',fontSize=9.5,leading=13,textColor=INK),
 'head':ParagraphStyle('head',fontName='Arial-Bold',fontSize=9.8,leading=13,textColor=white),
 'code':ParagraphStyle('code',fontName='Courier',fontSize=9,leading=12,textColor=INK,spaceAfter=12),
}
story=[]; page_titles=[]
def p(t,style='body'): story.append(Paragraph(t,styles[style]))
def h(t): p(t,'h2')
def page(title,lead=None):
 if story:story.append(PageBreak())
 page_titles.append(title);p(title,'title')
 if lead:p(lead,'lead')
def table(headers,rows,widths):
 data=[[Paragraph(escape(str(x)),styles['head']) for x in headers]]+[[Paragraph(escape(str(x)),styles['cell']) for x in r] for r in rows]
 t=Table(data,colWidths=widths,repeatRows=1,hAlign='LEFT')
 t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),PURPLE),('ROWBACKGROUNDS',(0,1),(-1,-1),[white,LIGHT]),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),10),('RIGHTPADDING',(0,0),(-1,-1),10),('TOPPADDING',(0,0),(-1,-1),9),('BOTTOMPADDING',(0,0),(-1,-1),9),('LINEBELOW',(0,0),(-1,-1),0.35,HexColor('#D8D0E5'))]))
 story.append(t);story.append(Spacer(1,10))
def num(n,title,body):p(f'<b>{n}. {title}</b><br/>{body}')
def code(t):story.append(Preformatted(t,styles['code']))

page_titles.append('NeuroQuest')
story.append(Spacer(1,22))
p('NEUROQUEST','title')
p('The 3D Spatial Memory Palace for Education','lead')
p('College project report<br/>For students, lecturers, and project evaluators')
story.append(Spacer(1,15))
story.append(Image(str(TMP/'palace-cover.png'),width=CW,height=CW*941/1672))
story.append(Spacer(1,9))
p('Concept illustration of a memory palace. The image is not a screenshot of the current application.','small')
story.append(Spacer(1,15))
h('Main purpose')
p('Help students organize academic concepts in memorable locations and practise retrieving them before checking their notes.','lead')
p('<b>Prepared for:</b> a college project presentation<br/><b>Presented by:</b> NeuroQuest Project Team<br/><b>Implementation reviewed:</b> 19 September 2026')
p('This report describes the implemented website. It labels proposed backend services and future educational evaluation separately.','small')

page('1. Project overview and purpose','NeuroQuest is a browser-based study application that connects notes with objects inside a navigable 3D space.')
h('Abstract')
p('A memory palace associates information with places. NeuroQuest brings this idea into an interactive website: students create subject rooms, place memory anchors inside them, attach study notes, and return to those locations during revision. Explore mode supports reading and navigation. Recall Challenge hides titles and asks students to identify the concept before revealing the note. The student then records a self-assessment.')
p('The project combines Next.js, React, TypeScript, and Three.js with a shared Zustand store. It saves rooms, anchors, and selected progress data in browser localStorage. The current implementation does not include an application backend, authentication, or a cloud database. It supports a usable HTML study interface when WebGL is unavailable.')
h('Why build this website?')
p('The central purpose is to make deliberate recall easier to practise. A student needs more than a place to collect notes: a revision tool should also prompt them to check what they can explain without looking. NeuroQuest supplies spatial cues and a repeatable study sequence. Its 3D setting gives each idea a visible location, while the recall workflow creates a pause before the answer appears.')
h('Project objectives')
num(1,'Organize knowledge','Provide separate palaces for different subjects and focused anchors for individual concepts.')
num(2,'Support recall practice','Hide concept labels until the student chooses to reveal them, then collect a self-rating.')
num(3,'Make the system usable','Provide responsive forms, keyboard-accessible controls, readable notes, and a graphics fallback.')
num(4,'Demonstrate sound engineering','Separate UI, 3D graphics, state, validation, and persistence into maintainable modules.')
p('<b>Scope:</b> an individual study and revision tool. It supplements teaching and problem solving. It is not a replacement for a learning management system, a teacher, or formal assessment.')

page('2. Learning idea and intended users','The design combines spatial associations with a prompt to retrieve information before revealing it.')
h('Method of Loci')
p('The Method of Loci associates information with distinct locations along an imagined or familiar route. In this project, the student uses a digital room instead: a selected artifact and its position become cues for an academic idea. The title and full explanation remain attached to the anchor. The student must build the association through study; simply placing an object does not create understanding.')
h('Active recall')
p('Recall Challenge asks the student to attempt an answer before opening the note. Roediger and Karpicke (2006) found benefits of retrieval practice on delayed tests in experiments using prose material [R1]. Dresler and colleagues (2017) studied mnemonic training using the Method of Loci and reported memory improvements in that research setting [R2]. These studies motivate the design. Neither study evaluated NeuroQuest, and the project has no measured claim about examination marks or memory improvement.')
h('Who can use it?')
table(['Audience','Possible use'],[
 ['College students','Organize definitions, terminology, formulas with conditions, programming concepts, or historical events.'],
 ['Lecturers','Demonstrate a revision method and ask learners to explain the concept behind an anchor.'],
 ['Project evaluators','Examine interaction design, state management, data validation, and browser graphics.'],
 ['Independent learners','Create personal subject rooms and practise at a chosen pace.']
],[125,CW-125])
h('Good learning practice')
p('Keep each anchor focused. Read for understanding, explain the concept in your own words, and solve relevant exercises. During recall, answer aloud or on paper before revealing the note. Revisit difficult concepts in later sessions. The current app does not calculate a revision schedule or verify that an explanation is correct.')
p('Research references R1 and R2 appear in the final section. All proposed educational uses require suitable content and honest self-assessment.','small')

page('3. Functional features and scope','A subject palace contains memory anchors. Each anchor combines a study note with a position and a visual artifact.')
table(['Feature','Current behavior'],[
 ['Subject selection','Three example palaces: Computer Science, Human Anatomy, and World History.'],
 ['Custom palaces','Create a room with a unique name, optional description, icon, and color.'],
 ['Anchor creation','Add a title, category, Markdown material, shape, color, and coordinates.'],
 ['Explore mode','Navigate the room, focus an anchor, and read or edit its note.'],
 ['Recall Challenge','Hide titles, reveal a concept after an attempt, and record Easy, Hard, or Failed.'],
 ['Search and map','Find notes across palaces in Explore mode or focus an anchor using the spatial map.'],
 ['Progress and settings','View room totals, self-rated mastery, effects settings, and an optional ambient sound.'],
 ['Persistence and export','Keep selected data in the same browser and download a JSON snapshot.']
],[120,CW-120])
h('Content and limits')
p('The six artifact shapes are crystal, ring/torus, cube, sphere, pyramid, and knot. Color choices and coordinates help distinguish locations. The store permits up to 50 palaces and 300 anchors across the workspace. Palace names can contain up to 48 characters. X and Z positions must stay between -6 and 6, and Y between 0 and 3.')
p('The default subjects contain demonstration study notes. Human Anatomy uses geometric cues rather than a detailed anatomical model. World History uses notes in the shared vault environment rather than historically reconstructed locations. New subject palaces use the same scene system with their own content.')
p('<b>Not included:</b> accounts, automatic grading, AI-generated answers, collaborative editing, full historical review logs, scheduled spaced repetition, or an import screen. These should not be described as completed features.')

page('4. Student user guide','A useful first session starts with one subject and a small number of clear concepts.')
num(1,'Open NeuroQuest','Open the running website in a modern browser. Select a subject in the sidebar. On a phone, open the navigation menu first.')
num(2,'Create a subject if needed','Select <b>Create palace</b>. Enter a unique name, an optional description, an icon, and a color. Submit the form. The new empty palace opens immediately.')
num(3,'Add one memory anchor','Select <b>Add memory anchor</b> or <b>Place a new memory</b>. Enter a title and study material. Add an optional category. Choose a shape and color. Use the suggested position or adjust valid coordinates, then select <b>Add to palace</b>.')
num(4,'Learn in Explore mode','Drag to orbit and scroll to zoom. On touch devices, use one finger to orbit and pinch to zoom. Select an artifact, its label, a map point, or its list entry to read the note. Use Reset camera to return to the room view.')
num(5,'Attempt Recall Challenge','Switch to Recall Challenge. The room becomes darker and titles are hidden. Select an anchor and answer the prompt before selecting <b>Reveal concept</b>. Search results are unavailable during the challenge.')
num(6,'Rate the attempt','Select <b>Easy</b>, <b>Hard</b>, or <b>Failed</b>. Continue with <b>Next anchor</b>. The app allows one rating per anchor in the current session.')
num(7,'Review and return','Check Learning insights and revisit difficult material. Refreshing preserves saved notes and progress in the same browser, but resets open panels and the current recall-session details.')
h('Useful controls')
table(['Action','Control'],[['Search','Search button or Ctrl+K / Cmd+K with study panels closed'],['Close a panel','Escape or its close button'],['Edit or delete','Open the anchor drawer in Explore mode'],['Export data','Workspace settings, then Export all palaces']],[120,CW-120])

page('5. Worked example and classroom use','A spatial cue helps the student return to an idea. Explanation and application complete the learning activity.')
h('Example: Binary Trees')
num(1,'Choose a memorable cue','Use the Computer Science palace and associate Binary Trees with a distinctive artifact near a chosen corner.')
num(2,'Write a focused note','State that each node has at most two children. Add a small example and explain root, leaf, and subtree. A fenced code block can hold pseudocode or a short implementation.')
num(3,'Build the association','Read the note, draw the structure, and explain the definition without copying it. Notice the artifact and where it sits in the room.')
num(4,'Recall before reveal','In Recall Challenge, look at the artifact and identify the concept. Explain the rule about children before opening the note. Compare the answer and give an honest rating.')
num(5,'Apply the concept','Solve a traversal problem outside the app or include an exercise in the note. Remembering a title alone does not demonstrate full understanding.')
h('Other subject examples')
table(['Subject','Possible anchor content'],[['Human Anatomy','Names and functions of a selected body system, reviewed against course material.'],['World History','An event with its date, causes, consequences, and supporting course references.'],['Mathematics','A theorem, the conditions where it applies, and a worked example.'],['Languages','A word or phrase with meaning, pronunciation guidance, and an example sentence.']],[120,CW-120])
h('A lecturer-led activity')
p('Introduce a short topic, then ask students to choose five key concepts and create one anchor for each. Allow time to explain the associations. In a later session, ask students to recall and apply the ideas before viewing their notes. Discuss mistakes in class. This is a proposed teaching activity, not an implemented teacher dashboard or a validated study result.')

page('6. Programming languages and stack','TypeScript is the main programming language. Frameworks, runtimes, and data formats have separate roles.')
table(['Technology','Type and purpose'],[
 ['TypeScript / TSX','Typed application logic and React components. TSX combines TypeScript with component markup.'],
 ['JavaScript','The browser executes JavaScript produced from the TypeScript source.'],
 ['HTML / CSS','Document structure and visual styling. CSS handles responsive layout and transitions.'],
 ['Next.js 16 / React 19','Application framework, App Router entry, and interactive component system.'],
 ['Three.js / R3F 9','Three.js provides the 3D renderer. React Three Fiber manages its scene through React.'],
 ['Drei / postprocessing','Orbit controls, scene helpers, Bloom, Vignette, and ChromaticAberration.'],
 ['GSAP','Camera-position and orbit-target transitions.'],
 ['Zustand 5','Shared store with actions, selective subscriptions, and persistence.'],
 ['Tailwind CSS 4 / Lucide','Styling support and UI icons alongside custom CSS.'],
 ['React Markdown / remark-gfm','Render Markdown notes, including lists, tables, and fenced code blocks.'],
 ['Node.js / npm','Run development tools, install packages, build, and serve the application.'],
 ['JSON','A data format for browser persistence, settings, and export.']
],[135,CW-135])
p('Development checks use TypeScript, ESLint, Vitest, and Prettier. DM Sans and Space Grotesk fonts are bundled locally. Exact package declarations appear in package.json and resolved versions in package-lock.json.','small')
p('<b>Backend language:</b> none is implemented for application data. Node.js runs the Next.js tooling/server, but that alone does not create an authenticated study API or a database.')

page('7. Frontend architecture and modules','The interface, 3D scene, and state store have separate responsibilities.')
table(['File or module','Responsibility'],[
 ['src/app/page.tsx','App Router page that mounts the workspace.'],
 ['src/app/layout.tsx','Shared document layout, metadata, local fonts, and global styles.'],
 ['NeuroQuest.tsx','Workspace composition, map, search, settings, learning insights, and scene loading.'],
 ['Navigation / ModeSwitcher','Subject navigation, new-palace entry point, and study-mode controls.'],
 ['AddRoomModal / AddAnchorModal','Forms for creating subjects and memory anchors.'],
 ['AnchorDrawer / Dialog','Notes, edits, recall prompts, ratings, focus containment, and panel transitions.'],
 ['Scene / MemoryAnchor','3D environment, lighting, objects, animation, and the graphics fallback.'],
 ['CameraController / PostProcessing','Camera transitions, navigation bounds, and optional visual effects.'],
 ['usePalaceStore.ts','State, actions, validation, persistence, and data migration.'],
 ['data.ts / types.ts','Example content and TypeScript domain definitions.']
],[175,CW-175])
h('Interaction sequence')
p('When a student selects an anchor, the UI calls a store action. The store updates the selected anchor and camera target. The drawer reads the selected note, while the camera controller reads the target and moves the view. Both respond to the same source of state without placing camera animation frames inside React state.')
h('Rendering boundaries')
p('NeuroQuest dynamically imports Scene with server rendering disabled. WebGL therefore initializes in the browser. Forms keep unfinished input in component state. Components subscribe to individual Zustand values or actions, which avoids publishing every form keystroke to the scene. The shared store still updates subscribers when relevant data changes.')

page('8. 3D rendering and interaction','The environment gives notes stable visual locations while keeping study controls available outside the canvas.')
h('Scene and anchors')
p('Scene creates procedural architecture, a ground grid, pedestals, and atmospheric lighting. A subdued ambient base combines with directional and localized accent lights. Recall mode reduces ambient, hemisphere, and directional intensity. Each MemoryAnchor renders one of six geometric artifact types. Idle movement uses subtle vertical hovering and slow rotation through the render loop. Hovering changes visual emphasis and displays a label.')
h('Camera behavior')
p('OrbitControls applies damping, bounded zoom, and polar-angle limits of 24 to 78 degrees. Panning is disabled to keep the view within the room. Selecting an anchor sets a target for a 1.35-second GSAP transition using power3.out. The controller cancels a tween when the user starts orbiting, the target changes, a reset occurs, or the component unmounts. Initial framing and reduced-motion behavior apply immediately.')
h('Effects and performance choices')
p('PostProcessing combines Bloom, Vignette, and subtle ChromaticAberration. Bloom uses luminanceThreshold 0.6 and intensity 1.2. Students can disable effects in settings. Rendering limits pixel ratio to 1.5 for fine-pointer devices and 1.25 for coarse-pointer devices, uses 1024-pixel shadow maps, and disables multisampling in the effect composer. These are engineering choices, not measured frame-rate guarantees.')
h('Resource management')
p('React Three Fiber manages disposal of declarative geometry and material resources when they unmount. Camera tweens stop when no longer needed. Locally generated ambient audio closes its resources when disabled or unmounted. Long sessions and repeated navigation should still receive device-specific graphics testing.')
h('Accessibility and fallback')
p('The HTML interface provides anchor lists, a spatial map, keyboard-accessible controls, and a shared dialog with focus containment and restoration. Reduced-motion preferences stop idle animation and shorten UI motion. If WebGL fails or its context is lost, an HTML anchor view preserves study operations and offers Retry 3D view. Decorative HUD containers allow pointer events through to the scene, while buttons receive input.')

page('9. Data model and persistence','A room owns anchors through roomId. Retention and review information belong to each anchor.')
table(['Entity','Important fields'],[
 ['Room','id, name, subtitle, color, icon'],
 ['MemoryAnchor identity','id, roomId, title, category, content'],
 ['MemoryAnchor appearance','shape, color, position [x, y, z]'],
 ['MemoryAnchor progress','status, reviewCount, lastReviewedAt'],
 ['Study state','active room, mode, selected anchor, camera target, recall-session ratings'],
 ['Preferences','Ambient sound and postprocessing effects']
],[150,CW-150])
h('What gets saved?')
p('The persistence layer stores rooms, anchors, retention status, review counts, latest review timestamps, active room, mode, and selected preferences. Its localStorage key is <b>neuroquest-palace</b>, with storage schema version <b>2</b>. Version 1 data migrates automatically so older notes and progress remain available after the custom-palace feature.')
p('Open panels, selected anchors, camera position, and current-session recall ratings are transient. The application records the latest review time and count, not a complete history of every answer. Easy sets status to mastered. Hard and Failed set status to learning. Each accepted rating increments the count and updates the time.')
h('Validation and recovery')
p('Store actions validate user input. Hydration validates saved rooms before validating anchors, so room references must be valid. Checks cover identifiers, duplicates, names, colors, icons, coordinates, and data shape. Invalid records are discarded. Intentional empty rooms remain empty. If browser storage is unavailable, the live in-memory session can continue, but durable saving is not guaranteed.')
h('Data boundaries')
p('Saved data is specific to the browser profile and origin. Another browser, another device, or a different local port has separate storage. Clearing site data removes saved content. JSON export provides a snapshot of rooms, anchors, and review data, but no import interface exists yet. Browser storage is not encrypted user-account storage and does not provide access control on a shared device.')

page('10. Backend: current and proposed','The current application is a browser-based implementation with local persistence. A server-side study backend is future work.')
h('What exists now')
p('Next.js supplies the application framework, development server, build process, and production serving. The browser executes the study logic and stores data. The source has no implemented study API routes, authentication flow, account system, or server database. No API keys or database configuration are required to run this version. Calling it a complete cloud-based full-stack platform would misrepresent its current scope.')
h('A possible future backend')
table(['Layer','Proposed responsibility'],[
 ['Authentication','Identify a user through a maintained authentication system and secure session handling.'],
 ['Next.js Route Handlers','Expose authenticated operations for creating, reading, updating, and deleting study records.'],
 ['PostgreSQL database','Store users, rooms, anchors, and review events with constraints and ownership relationships.'],
 ['Authorization','Check that a user owns a room or has explicit permission before returning or modifying it.'],
 ['Synchronization','Track versions or update times, resolve conflicting edits, and recover from failed requests.'],
 ['Operations','Maintain backups, environment secrets, monitoring, rate limits, and secure deployment.']
],[135,CW-135])
h('Proposed relational model')
p('<b>User</b> owns many <b>Rooms</b>. A Room contains many <b>Anchors</b>. An Anchor has many <b>ReviewEvents</b>. ReviewEvent records could store the rating, review time, and user, enabling a complete history. Classroom sharing would need additional role and membership tables. This model describes a design option and is not present in the current application.')

page('11. Build process and local setup','A modern browser and Node.js 20.9 or newer are sufficient for the current version.')
h('Implementation stages')
p('The source reflects these stages: define TypeScript room and anchor models; implement a validated Zustand store; create the responsive workspace and study forms; build procedural 3D components; connect selection to camera focus; implement recall and ratings; add local persistence and migration; verify behavior with automated and browser checks. Separate modules make it possible to extend one layer without rewriting the entire application.')
h('Run the project')
num(1,'Install prerequisites','Install Node.js 20.9 or newer with npm. Use a browser with WebGL and hardware acceleration for the 3D experience.')
num(2,'Open the project folder','Open a terminal in the directory containing package.json. Install the locked dependencies:')
code('npm ci')
num(3,'Start development','Run the development server, then open http://localhost:3000 in the browser:')
code('npm run dev')
num(4,'Build and serve production','Run these commands in order. npm start serves an existing production build:')
code('npm run build\nnpm start')
p('If port 3000 is already occupied, use <font face="Courier">npm run dev -- --port 3001</font> and open that port. No API keys, accounts, environment variables, or database setup are needed for this implementation.')
h('Deployment considerations')
p('The project can run on a hosting environment that supports the chosen Next.js build and runtime. The current localhost address is a local preview, not a public deployment. Saved browser data does not automatically transfer to another hosted origin. There is no implemented service worker or offline-installable PWA guarantee. Before a college demo, start the server and test the actual browser and display equipment.')

page('12. Verification and educational evaluation','Software correctness and learning effectiveness are separate questions.')
h('Automated and manual checks')
table(['Check','What it covers'],[
 ['19 Vitest store tests','Ratings, duplicate recall prevention, room changes, camera reset state, anchor changes, validation, persistence, migration, and malformed data.'],
 ['TypeScript and ESLint','Static type and source-quality checks.'],
 ['Prettier','Consistent source formatting.'],
 ['Production build','Compilation and generation of the deployable application.'],
 ['Browser checks','Custom palace creation, duplicate-name feedback, first-anchor creation, refresh persistence, and responsive forms.']
],[130,CW-130])
code('npm run format:check\nnpm run lint\nnpm run typecheck\nnpm test\nnpm run build')
p('The latest feature checks completed 19 store tests, lint, and the production build successfully. The browser used for the latest interface checks showed the HTML fallback. That confirms the study forms and fallback workflow, but does not validate real-time 3D performance across all GPUs. State tests also do not replace accessibility testing with users.')
h('Suggested classroom evaluation - not conducted')
p('Use the same course material and study time for a comparison group and a NeuroQuest group. Include a baseline check, an immediate test, and a delayed recall test. Score answers with a predefined rubric rather than app mastery labels. Collect task completion, usability feedback, and device performance. With appropriate consent and institutional review where required, this could show whether the workflow helps the intended learners.')
p('Do not report invented improvements, success percentages, student satisfaction scores, or examination gains. The project currently demonstrates functionality. Its educational effectiveness remains to be evaluated.','small')

page('13. Advantages, limitations, and roadmap','The strongest implemented advantage is a customizable workflow that combines study material with a recall prompt.')
h('Advantages')
p('<b>Personal organization:</b> separate palaces and categories make subjects easier to navigate. <b>Recall routine:</b> hidden titles encourage an answer attempt before reveal. <b>Rich notes:</b> Markdown supports structured explanations and code snippets. <b>Low setup burden:</b> no account or database is required. <b>Multiple access paths:</b> the scene, list, map, and keyboard controls support different ways to navigate. <b>Modular code:</b> clear responsibilities make further development easier.')
h('Limitations and their implications')
table(['Limitation','Implication'],[
 ['Local browser storage','No automatic backup or synchronization. Clearing site data can lose work.'],
 ['Self-rated mastery','A mastered label is not proof of a correct explanation or examination readiness.'],
 ['Graphics requirements','Device capabilities can affect rendering. The HTML fallback remains important.'],
 ['Preparation effort','Students must write accurate notes and form useful associations.'],
 ['Incomplete teaching platform','No accounts, class dashboards, content moderation, or collaborative workflows.'],
 ['No learning outcome study','Expected benefits should remain hypotheses until evaluated.']
],[140,CW-140])
h('Prioritized future work')
num(1,'Data recovery','Add a validated import/restore flow before expanding the amount of user content.')
num(2,'Learning support','Evaluate the workflow and consider scheduled revision with fuller review histories.')
num(3,'Backend services','Add authenticated synchronization, ownership checks, backups, and controlled sharing.')
num(4,'Teaching and accessibility','Explore lecturer templates, classroom workflows, and usability testing with diverse learners.')

page('14. Presentation demo and viva preparation','Use the editable PowerPoint for a 12-15 minute talk, with a short demonstration and time for questions.')
h('Suggested team presentation flow')
p('<b>Opening:</b> explain what NeuroQuest is and why the project exists. <b>Student experience:</b> show a subject, an anchor, and the Explore/Recall difference. <b>Technical explanation:</b> describe TypeScript, the frontend modules, 3D rendering, and local persistence. <b>Closing:</b> state the limitations and future backend plan. Assign sections according to your team size; speaker notes in the deck provide a starting script.')
h('Three-minute demonstration')
p('Open Computer Science and select one anchor. Create a new palace such as Mathematics if the name is available. Add a concise note for the Pythagorean theorem, including its right-triangle condition. Select an artifact and position. Switch to Recall Challenge, explain the idea before revealing it, and rate the attempt. Refresh to show persistence. Use the anchor list if the 3D view is unavailable.')
h('Likely lecturer questions')
table(['Question','Suggested answer'],[
 ['What is the main purpose?','To help students attach concepts to places and practise recall before checking notes.'],
 ['Why use 3D?','It provides spatial cues and a navigable setting. Its learning benefit still needs evaluation.'],
 ['Which language is used?','Mainly TypeScript/TSX, with HTML and CSS. The browser runs compiled JavaScript.'],
 ['What is the backend?','No application backend exists yet. Next.js serves the app and localStorage holds study data.'],
 ['Is this AI or automatic grading?','No. Students write notes and rate their own recall.'],
 ['Can it work on a phone?','The UI supports small screens and touch. Graphics performance depends on the device.'],
 ['How will you improve it?','Prioritize restore/import, educational evaluation, then secure accounts and synchronization.']
],[160,CW-160])

page('15. References and glossary','Implementation statements come from the project source and its documented behavior.')
h('Project sources')
p('<b>P1.</b> README.md: setup, architecture, workflow, limitations, persistence, and verification.<br/><b>P2.</b> package.json and package-lock.json: technologies, scripts, and dependencies.<br/><b>P3.</b> src/lib/types.ts and src/lib/data.ts: domain models and example content.<br/><b>P4.</b> src/store/usePalaceStore.ts: state actions, constraints, saving, and migration.<br/><b>P5.</b> src/components/NeuroQuest.tsx and ui/: workspace, dialogs, notes, and custom rooms.<br/><b>P6.</b> src/components/three/: rendering, camera, artifacts, and effects.<br/><b>P7.</b> tests/store.test.ts: automated state tests.')
h('Learning research')
p('<b>R1.</b> Roediger, H. L., III, &amp; Karpicke, J. D. (2006). Test-enhanced learning: Taking memory tests improves long-term retention. <i>Psychological Science, 17</i>(3), 249-255.<br/><link href="https://doi.org/10.1111/j.1467-9280.2006.01693.x" color="#7651C8">https://doi.org/10.1111/j.1467-9280.2006.01693.x</link>')
p('<b>R2.</b> Dresler, M., et al. (2017). Mnemonic training reshapes brain networks to support superior memory. <i>Neuron, 93</i>(5), 1227-1235.e6.<br/><link href="https://doi.org/10.1016/j.neuron.2017.02.003" color="#7651C8">https://doi.org/10.1016/j.neuron.2017.02.003</link>')
h('Glossary')
table(['Term','Meaning in this project'],[
 ['Memory anchor','An object, its location, and its attached study note.'],
 ['Frontend','The interface and interactive behavior that run in the browser.'],
 ['Backend','Server-side APIs, authorization, and data services. Proposed, not implemented here.'],
 ['WebGL','A browser graphics interface used by the 3D renderer.'],
 ['State','Current application data, such as the selected room or mode.'],
 ['Persistence','Keeping selected data between page loads.'],
 ['Hydration / migration','Loading saved state and adapting older data to a newer storage schema.']
],[145,CW-145])
p('Cover art: generated concept illustration created for this presentation with the built-in Image Generation tool. All other descriptions refer to the project or explicitly labelled proposals.','small')

def decorate(c,doc):
 c.saveState()
 if doc.page>1:
  c.setFillColor(MUTED);c.setFont('Arial',8);c.drawString(50,H-35,'NEUROQUEST  /  PROJECT REPORT')
  c.setStrokeColor(HexColor('#D8D0E5'));c.setLineWidth(.5);c.line(50,45,W-50,45)
  c.drawString(50,30,'College project presentation');c.drawRightString(W-50,30,f'{doc.page:02d}')
 c.restoreState()
doc=SimpleDocTemplate(str(OUT),pagesize=A4,rightMargin=50,leftMargin=50,topMargin=62,bottomMargin=60,title='NeuroQuest: College Project Report',author='NeuroQuest Project Team',subject='Purpose, implementation, student use, architecture, and future development')
doc.build(story,onFirstPage=decorate,onLaterPages=decorate)
r=PdfReader(OUT)
print(json.dumps({'output':str(OUT),'pages':len(r.pages),'expected':len(page_titles)}))
(TMP/'report-text.txt').write_text('\n\n'.join(p.extract_text() for p in r.pages),encoding='utf8')
assert len(r.pages)==len(page_titles),f'Unexpected pagination: {len(r.pages)} pages versus {len(page_titles)} sections'
