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
  type Extension,
  type ExtensionFile,
  type Guide,
  type Kit,
  type KitFile,
} from "./extensions/extension.ts";
export {
  assembleFactory,
  type Available,
  type Factory,
  type KnownProduct,
} from "./extensions/registry.ts";
export { loadFactory } from "./load.ts";
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
export { findProducts, PRODUCT_FILE } from "./products/find-products.ts";
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
  saveGroup,
  settingGroupSchema,
  type Changes,
  type GroupView,
  type SettingField,
  type SettingGroup,
  type SettingView,
} from "./settings/setting-groups.ts";
export { claudeArgs, type Claude, type RunOptions } from "./agents/claude.ts";
export {
  addsText,
  readEvent,
  replySoFar,
  resultOf,
  type ClaudeResult,
} from "./agents/events.ts";
export {
  retryWhileLocked,
  Workspace,
  type CopySettings,
} from "./copies/workspace.ts";
export { run } from "./processes.ts";
