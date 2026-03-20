/**
 * elsa-mcp — eLSA 딥테크 액셀러레이터 MCP 서버
 *
 * eLSA FastAPI 백엔드에 연결하여 스타트업, 스크리닝, 파이프라인,
 * 포트폴리오, KPI, AI 분석 데이터를 Claude에게 제공한다.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerStartupTools } from "./tools/startups.js";
import { registerScreeningTools } from "./tools/screenings.js";
import { registerPipelineTools } from "./tools/pipeline.js";
import { registerPortfolioTools } from "./tools/portfolio.js";
import { registerWriteTools } from "./tools/write.js";

// ---------------------------------------------------------------------------
// Server 생성
// ---------------------------------------------------------------------------

const server = new McpServer({
  name: "elsa-mcp",
  version: "1.0.0",
});

// ---------------------------------------------------------------------------
// 도구 등록
// ---------------------------------------------------------------------------

registerStartupTools(server);
registerScreeningTools(server);
registerPipelineTools(server);
registerPortfolioTools(server);
registerWriteTools(server);

// ---------------------------------------------------------------------------
// stdio 전송 시작
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("elsa-mcp server started on stdio");
}

main().catch((err) => {
  console.error("elsa-mcp fatal error:", err);
  process.exit(1);
});
