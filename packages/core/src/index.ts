// The core's published API: what extensions, kits and a company's factory
// may use. Anything not exported here is the core's own and may change in
// any release; a change to what is here goes in CHANGELOG.md.

export {
  COMPANY_FILE,
  companySchema,
  readCompany,
  type Company,
} from "./company/company.ts";
export {
  defineExtension,
  defineKit,
  type Detected,
  type Extension,
  type ExtensionFile,
  type Guide,
  type McpServer,
  type Kit,
  type KitFile,
} from "./extensions/extension.ts";
export { copyStarter, starterName } from "./extensions/starter.ts";
export {
  assembleFactory,
  type Available,
  type Factory,
  type KnownProduct,
} from "./extensions/registry.ts";
export { type InCopy, loadFactory, prepareFactory } from "./load.ts";
export {
  addressOf,
  envOf,
  linkOf,
  portOf,
  readSettings,
} from "./parts/addresses.ts";
export {
  AREAS,
  checkParts,
  inStartOrder,
  partSchema,
  type Area,
  type Part,
} from "./parts/part.ts";
export {
  findProducts,
  PRODUCT_FILE,
  PRODUCTS_FOLDER,
} from "./products/find-products.ts";
export {
  detectProducts,
  idFrom,
  withFreePorts,
  type Candidate,
} from "./setup/detect.ts";
export {
  addProduct,
  createFactoryFolder,
  hasFactory,
  DOCS_FOLDER,
  FACTORY_FOLDER,
  findFactory,
  knowledgeBaseOf,
  pointToFactory,
  projectOf,
  saveCompany,
  type Templates,
} from "./setup/factory-folder.ts";
export {
  productSchema,
  readProduct,
  type Product,
  type ProductFile,
} from "./products/product.ts";
export {
  changeEnvText,
  checkChanges,
  checkGroups,
  groupView,
  moveFormerValues,
  readGroup,
  saveGroup,
  SECRET_SET,
  settingGroupSchema,
  type Changes,
  type GroupView,
  type SettingField,
  type SettingGroup,
  type SettingView,
} from "./settings/setting-groups.ts";
export { claudeArgs, type Claude, type RunOptions } from "./agents/claude.ts";
export { describeEvent, formatDuration } from "./agents/activity.ts";
export { withChosenModel } from "./agents/model-setting.ts";
export {
  builderModel,
  builderSettings,
  parallelCards,
} from "./agents/builder-settings.ts";
export {
  chooseUpdatesByItself,
  updatesByItself,
  updateSettings,
  usageFolder,
  usageFolderSettings,
  usageSettings,
} from "./agents/usage-settings.ts";
export {
  KEEP_TEAM_FILE,
  keepTeamFile,
  PERSONAL_FILE,
  TEAM_FILE,
} from "./settings/team-file.ts";
export { WarmClaude, type Child, type Start } from "./agents/warm.ts";
export {
  addsText,
  readEvent,
  replySoFar,
  resultOf,
  type ClaudeResult,
} from "./agents/events.ts";
export {
  retryWhileLocked,
  stageAllButSettings,
  Workspace,
  type CopySettings,
} from "./copies/workspace.ts";
export { run } from "./processes.ts";
export { alreadyFor, titleOf } from "./kobble/already.ts";
export {
  type Face,
  faceFor,
  faceFrom,
  type PersonaColor,
  type PersonaHat,
  faceOf,
  PERSONA_COLORS,
  PERSONA_HATS,
} from "./kobble/face.ts";
export {
  liveExportSchema,
  type LiveEvent,
  type LiveExport,
} from "./kobble/live.ts";
export {
  type Already,
  type Board,
  type BoardLink,
  type Exploration,
  type Heard,
  type KobblePersona,
  type KobbleSignal,
  type PersonaTest,
  type SignalStep,
  type SyncState,
  type TestStep,
  type Thing,
} from "./kobble/schemas.ts";
export { checkKobbleIn } from "./kobble/check.ts";
export {
  type SituationName,
  Situations,
  worldFolder,
} from "./kobble/situations.ts";
export {
  changeWorld,
  startWorld,
  type World,
  type WorldChange,
  worldChangeSchema,
  WorldRefused,
  worldText,
} from "./kobble/world.ts";
export {
  addToGitignore,
  IGNORED_SIGNALS,
  ignoreSignals,
} from "./kobble/ignored.ts";
export {
  type Conversation,
  heardOf,
  KOBBLE_FOLDER,
  type KobbleKind,
  type KobbleKinds,
  KobbleRefused,
  KobbleStore,
} from "./kobble/store.ts";
export {
  type Finding,
  takeInEvents,
  takeInFindings,
} from "./kobble/take-in.ts";

export {
  compareVersions,
  CORE_VERSION,
  FIRST_VERSION,
  RELEASE_SOURCE,
  releaseOf,
} from "./version.ts";
