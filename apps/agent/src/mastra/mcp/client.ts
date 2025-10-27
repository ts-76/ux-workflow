import { MCPClient } from "@mastra/mcp";

export const mcp = new MCPClient({
  servers: {
    "playwright-mcp": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--headless"
      ]
    }
  },
});