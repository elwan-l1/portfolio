import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import simpleImportSort from "eslint-plugin-simple-import-sort";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "components/ui/**", // Ignore shadcn/ui components
  ]),
  {
    plugins: {
      "simple-import-sort": simpleImportSort,
    },

    rules: {
      "react/no-children-prop": "off",
      "simple-import-sort/imports": [
        "error",
        {
          groups: [
            // everything from 'react'
            ["^react$"],

            // shadcn/ui components
            ["^@/components/ui", "^lucide-react"],

            // custom components
            ["^@/components/(?!ui/)"],

            // Prisma/Types/Core/Lib
            ["^@prisma/client", "^@/types", "^@/core", "^@/lib",],

            // Hooks/Contexts/Stores
            ["^@/hooks", "^@/contexts", "^@/stores"],

            ["^"]
          ]
        }
      ],
      "simple-import-sort/exports": "error"
    },
  }
]);

export default eslintConfig;
