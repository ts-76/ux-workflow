
import { Mastra } from "@mastra/core";
import { PinoLogger } from "@mastra/loggers";
import { LibSQLStore } from "@mastra/libsql";
import { WatchEvent } from "@mastra/core/workflows";
import { LangfuseExporter } from "langfuse-vercel";

// エージェントのインポート
import { uxEvaluationAgent } from "./agents/ux-evaluation-agent";

// ワークフローのインポート
import { uxEvaluationWorkflow } from "./workflows/ux-evaluation-workflow";
import { personaJourneyEvalWorkflow } from "./workflows/subflow/persona-journey-evaluation-flow";
import { tinyAgent } from "./agents/tiny-agent";
import { summarizeAgent } from "./agents/summarize-agent";

export const mastra = new Mastra({
  agents: {
    tinyAgent,
    uxEvaluationAgent,
    summarizeAgent
  },
  workflows: {
    uxEvaluationWorkflow,
    personaJourneyEvalWorkflow,
  },
  storage: new LibSQLStore({
    url: ":memory:",
  }),
  logger: new PinoLogger({
    name: "Mastra",
    level: "info",
  }),
  bundler: {
    externals: ["playwright-core"],
  },
  // telemetry: {
  //   serviceName: "ai", // this must be set to "ai" so that the LangfuseExporter thinks it's an AI SDK trace
  //   enabled: true,
  //   export: {
  //     // @ts-ignore
  //     type: "custom",
  //     // @ts-ignore
  //     exporter: new LangfuseExporter({
  //       publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  //       secretKey: process.env.LANGFUSE_SECRET_KEY,
  //       baseUrl: process.env.LANGFUSE_HOST,
  //     }),
  //   },
  // },
});
