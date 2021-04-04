/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable prettier/prettier */

declare module "*.vue" {
  import type { DefineComponent } from "vue"

  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module "@aacassandra/vue3-progressbar" {}
declare module "*.png"