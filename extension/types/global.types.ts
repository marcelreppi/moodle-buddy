/* eslint-disable prettier/prettier */
declare module "*.vue" {
  import type { DefineComponent } from "vue"

  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module "@aacassandra/vue3-progressbar" {}
declare module "*.png"
