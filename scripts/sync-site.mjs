import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dest = process.argv[2];
if (!dest || !path.isAbsolute(dest))
  throw new Error("Provide an absolute prepared Sites checkout path.");
const hosting = JSON.parse(
  await readFile(path.join(dest, ".openai", "hosting.json"), "utf8"),
);
if (!hosting.project_id) throw new Error("Register the Site before syncing.");
await mkdir(path.join(dest, "studio", "src"), { recursive: true });
await mkdir(path.join(dest, "server"), { recursive: true });
await cp(path.join(root, "studio", "src"), path.join(dest, "studio", "src"), {
  recursive: true,
});
for (const file of ["api.mjs", "contracts.mjs", "providers.mjs"])
  await cp(path.join(root, "server", file), path.join(dest, "server", file));
await cp(
  path.join(root, "studio", "public", "favicon.svg"),
  path.join(dest, "public", "favicon.svg"),
);
await cp(path.join(root,'studio','public','third-party-licenses.txt'),path.join(dest,'public','third-party-licenses.txt'));
const manifestPath = path.join(dest, "package.json"),
  pkg = JSON.parse(await readFile(manifestPath, "utf8"));
Object.assign(pkg.dependencies, {
  "@huggingface/transformers": "4.3.1",
  idb: "8.0.3",
  "lucide-react": "1.61.0",
});
pkg.name = "sassycam-site";
pkg.version = "1.0.0";
pkg.scripts.build = "node scripts/build-hosted.mjs";
await cp(
  path.join(root, "scripts", "build-hosted.mjs"),
  path.join(dest, "scripts", "build-hosted.mjs"),
);
await writeFile(manifestPath, JSON.stringify(pkg, null, 2) + "\n");
const vitePath = path.join(dest, "vite.config.ts");
let vite = await readFile(vitePath, "utf8");
if (!vite.includes("sassycam-worker-format")) {
  if (!vite.includes("return {"))
    throw new Error(
      "Inspect the starter Vite configuration before adding worker format.",
    );
  vite = vite.replace(
    "return {",
    'return {\n    // sassycam-worker-format: local models run outside the UI thread.\n    worker: { format: "es" },',
  );
  await writeFile(vitePath, vite);
}
await mkdir(path.join(dest, "app", "api", "[...path]"), { recursive: true });
await writeFile(
  path.join(dest, "app", "page.tsx"),
  `import App from '@/studio/src/App';\nexport const dynamic = 'force-dynamic';\nexport default function Page(){return <App/>;}\n`,
);
await writeFile(
  path.join(dest, "app", "layout.tsx"),
  `import type {Metadata} from 'next';\nimport '../studio/src/styles.css';\nexport const metadata:Metadata={title:'SassyCam — Studio',description:'Votre webcam, avec de la personnalité. IA locale gratuite, portraits et fournisseurs personnels.',icons:{icon:'/favicon.svg'}};\nexport default function RootLayout({children}:{children:React.ReactNode}){return <html lang="fr"><body>{children}</body></html>;}\n`,
);
await writeFile(
  path.join(dest, "app", "api", "[...path]", "route.ts"),
  `import {getChatGPTUser} from '@/app/chatgpt-auth';\nimport {handleAPI} from '@/server/api.mjs';\nexport const dynamic='force-dynamic';\nasync function handle(request:Request){const user=await getChatGPTUser();return handleAPI(request,{local:false,user:user?{id:user.userId,name:user.displayName,email:user.email}:null});}\nexport const GET=handle;export const POST=handle;\n`,
);
await writeFile(
  path.join(dest, "SASSYCAM_SOURCE.json"),
  JSON.stringify(
    {
      application: "SassyCam",
      version: "1.0.0",
      upstream: "https://github.com/vhaloo/SassyCam",
      shared: [
        "studio/src",
        "server/api.mjs",
        "server/contracts.mjs",
        "server/providers.mjs",
      ],
      constraints: {
        ownerAPIKey: false,
        remotePlanInference: false,
        localBrowserAI: true,
        cloudCredentials: "visitor supplied, request-scoped only",
      },
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "SassyCam source synchronized; existing Site identity and starter integrations preserved.",
);
