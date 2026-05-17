import { createServer } from "vite";
const vite = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
});
const { products } = await vite.ssrLoadModule("/src/data/products.ts");
console.log(products[0].name);
await vite.close();
