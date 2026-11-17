// GET /api/product: the project the factory is connected to, and each of
// its products with what it is built with (stack.ts).

import type { Route } from "../add-ons/add-on.ts";
import type { ProductView } from "../api.ts";
import { Refused } from "../refused.ts";
import type { Session } from "../session.ts";
import {
  folderIn,
  type ProjectView,
  projectView,
  type StackGroup,
  stackOf,
} from "./stack.ts";

export type ProductPage = {
  project: ProjectView;
  products: (ProductView & { stack: StackGroup[] })[];
};

export function productRoutes(session: Session): Record<string, Route> {
  return {
    "GET /api/product": async (): Promise<ProductPage> => {
      const state = session.state();
      if (state.mode !== "factory")
        throw new Refused("There is no factory yet: set it up first.");
      const { project } = session.options;
      return {
        project: await projectView(project),
        products: state.products.map((product) => ({
          ...product,
          stack: stackOf(folderIn(project, product.folder)),
        })),
      };
    },
  };
}
