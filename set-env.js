const fs = require("fs");

const apiUrl = process.env.API_URL || "http://localhost:5010";

fs.writeFileSync(
  "src/environments/environment.production.ts",
  `export const environment = {
  apiUrl: '${apiUrl}'
};
`,
);
