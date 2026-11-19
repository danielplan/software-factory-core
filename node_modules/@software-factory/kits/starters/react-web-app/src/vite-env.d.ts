/// <reference types="vite/client" />

// Set only in prototype mode, when the factory gives a shared made-up world
// (FACTORY_WORLD_URL, passed on by the prototype scripts).
interface ImportMetaEnv {
  readonly VITE_FACTORY_WORLD_URL?: string;
}
