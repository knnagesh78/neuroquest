import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {Presentation,PresentationFile} from '@oai/artifact-tool';
process.env.RUNTIME_NODE_MODULES='C:/Users/Dell/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const root='C:/Users/Dell/Desktop/nice one';
const tmp=path.join(root,'.presentation-build');
const skill='C:/Users/Dell/.codex/plugins/cache/openai-primary-runtime/presentations/26.909.12148/skills/presentations';
const python='C:/Users/Dell/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe';
const {finalizePresentation}=await import(pathToFileURL(path.join(skill,'container_tools/artifact_tool_utils.mjs')).href);
const slides=JSON.parse(await fs.readFile(path.join(tmp,'deck-content.json'),'utf8'));
const cover=new Uint8Array(await fs.readFile(path.join(tmp,'palace-cover.png')));
const p=Presentation.create({slideSize:{width:1280,height:720}});
const c={bg:'#F7F5FC',ink:'#241E36',muted:'#625B73',accent:'#7651C8',lav:'#BDA2FF',dark:'#111528',white:'#FFFFFF'};
function text(s,value,x,y,w,h,size=28,color=c.ink,bold=false){
 const sh=s.shapes.add({name:`text-${s.shapes.items?.length??Math.random()}`,geometry:'textbox',position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
 sh.text=value; sh.text.style={typeface:'Arial',fontSize:size,bold,color,autoFit:'none',verticalAlignment:'top',insets:{left:0,right:0,top:0,bottom:0}}; return sh;
}
function base(d,i){const s=p.slides.add();s.background.fill=c.bg;text(s,d.title,72,54,1120,102,46,c.ink,true);text(s,'NEUROQUEST',72,668,300,24,15,c.muted);text(s,String(i+1).padStart(2,'0'),1150,668,60,24,16,c.muted);s.speakerNotes.textFrame.setText(d.notes);return s;}
function rows(s,data,{top=190,gap=104,labelWidth=285}={}){data.forEach(([a,b],i)=>{text(s,a,72,top+i*gap,labelWidth,52,27,c.accent,true);text(s,b,390,top+i*gap,806,80,28,c.ink);});}
function foot(s,v){if(v)text(s,v,72,605,1116,46,20,c.muted);}
for(let i=0;i<slides.length;i++){
 const d=slides[i];let s;
 if(d.type==='cover'){
   s=p.slides.add();s.background.fill=c.dark;
   s.images.add({blob:cover,contentType:'image/png',position:{left:0,top:0,width:1280,height:720},fit:'cover',alt:'Concept illustration of a memory palace with geometric artifacts'});
   text(s,d.title,72,222,590,104,76,c.white,true);
   text(s,d.subtitle,77,339,570,128,33,'#E3DBF5');
   text(s,'COLLEGE PROJECT PRESENTATION',77,82,550,30,19,c.lav,true);
   text(s,'NeuroQuest Project Team',77,623,570,35,22,'#C3BDCF');
   s.speakerNotes.textFrame.setText(d.notes);
 } else if(d.type==='closing'){
   s=p.slides.add();s.background.fill=c.dark;
   text(s,d.title,76,94,1100,180,65,c.white,true);text(s,d.lead,80,326,1050,152,34,'#DDD7EC');text(s,d.foot,80,572,1000,58,30,c.lav);
   s.speakerNotes.textFrame.setText(d.notes);
 } else {
   s=base(d,i);
   if(d.type==='purpose'){
     text(s,d.lead,72,180,1110,156,40,c.accent,true);
     d.items.forEach(([a,b],j)=>{const x=72+j*390;text(s,a,x,401,355,45,29,c.ink,true);text(s,b,x,466,340,120,27,c.muted);});
   } else if(d.type==='columns'){
     d.columns.forEach((col,j)=>{const x=72+j*594;text(s,col.heading,x,183,530,55,33,c.accent,true);col.items.forEach((item,k)=>text(s,item,x,261+k*(col.items.length===4?76:100),521,83,28,c.ink));});foot(s,d.foot);
   } else if(d.type==='rows'){rows(s,d.rows,{top:185,gap:102});foot(s,d.foot);}
   else if(d.type==='steps'){
     d.steps.forEach(([num,a,b],j)=>{const y=178+j*82;text(s,num,72,y,60,54,32,c.accent,true);text(s,a,157,y,385,60,28,c.ink,true);text(s,b,576,y,615,62,27,c.muted);});foot(s,d.foot);
   } else if(d.type==='example'){
     text(s,d.label,72,178,550,35,23,c.accent,true);text(s,d.lead,72,238,375,257,36,c.ink,true);
     d.items.forEach(([a,b],j)=>{text(s,a,545,178+j*130,650,42,27,c.accent,true);text(s,b,545,226+j*130,650,90,27,c.ink);});foot(s,d.foot);
   } else if(d.type==='table'){
     const vals=[d.columns,...d.table],h=vals.length===7?405:385;
     const t=s.tables.add({rows:vals.length,columns:d.columns.length,left:72,top:175,width:1140,height:h,values:vals,columnWidths:d.widths});
     t.borders.assign({fill:'#DCD5E9',width:0.8,style:'solid'});
     for(let r=0;r<vals.length;r++)for(let col=0;col<d.columns.length;col++){
       const cell=t.getCell(r,col);cell.fill=r===0?c.accent:(r%2?'#FFFFFF':'#F0ECF7');
       cell.text.style={typeface:'Arial',fontSize:vals.length===7?24:25,bold:r===0,color:r===0?c.white:c.ink};
     }
     t.cells.block({row:0,column:0,rowCount:vals.length,columnCount:d.columns.length}).assign({margins:{left:15,right:15,top:10,bottom:10},anchor:'center'});
     foot(s,d.foot);
   }
 }
}
const candidate=path.join(tmp,'candidate.pptx');
await(await PresentationFile.exportPptx(p)).save(candidate);
console.log('Draft exported: '+slides.length+' slides');
await fs.mkdir(path.join(tmp,'slides'),{recursive:true});
for(let i=0;i<p.slides.items.length;i++){
 const blob=await p.export({slide:p.slides.items[i],format:'png',scale:1});
 await fs.writeFile(path.join(tmp,'slides',`slide-${String(i+1).padStart(2,'0')}.png`),new Uint8Array(await blob.arrayBuffer()));
 console.log('Rendered slide '+(i+1));
}
await fs.writeFile(path.join(tmp,'presentation.json'),JSON.stringify(p.toProto()));
const result=await finalizePresentation({workspaceDir:root,candidatePath:candidate,finalPath:path.join(root,'output/presentation/NeuroQuest_College_Presentation_Final.pptx'),pythonExecutable:python,integrityValidatorPath:path.join(skill,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(skill,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit','--require-native-table-slide','8','--require-native-table-slide','11','--require-native-table-slide','12'],requiredNativeTableOwnerSlides:[8,11,12],fontPolicy:{basis:'design',families:['Arial']},verifyArtifactToolImport:true,receiptPath:path.join(tmp,'validation-final.json')});
console.log(JSON.stringify(result));
