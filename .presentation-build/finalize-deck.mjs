import path from 'node:path';
import {pathToFileURL} from 'node:url';
process.env.RUNTIME_NODE_MODULES='C:/Users/Dell/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const root='C:/Users/Dell/Desktop/nice one';
const skill='C:/Users/Dell/.codex/plugins/cache/openai-primary-runtime/presentations/26.909.12148/skills/presentations';
const {finalizePresentation}=await import(pathToFileURL(path.join(skill,'container_tools/artifact_tool_utils.mjs')).href);
const result=await finalizePresentation({workspaceDir:root,candidatePath:path.join(root,'.presentation-build/candidate.pptx'),finalPath:path.join(root,'output/presentation/NeuroQuest_College_Presentation.pptx'),pythonExecutable:'C:/Users/Dell/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe',integrityValidatorPath:path.join(skill,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(skill,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit','--require-native-table-slide','8','--require-native-table-slide','11','--require-native-table-slide','12'],requiredNativeTableOwnerSlides:[8,11,12],fontPolicy:{basis:'design',families:['Arial']},verifyArtifactToolImport:true,receiptPath:path.join(root,'.presentation-build/validation.json')});
console.log(JSON.stringify(result));
