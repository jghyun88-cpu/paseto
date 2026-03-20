/**
 * Portfolio(포트폴리오) 관련 MCP 도구 — 포트폴리오 기업 조회, 이슈 조회
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getClient } from "../client.js";

export function registerPortfolioTools(server: McpServer): void {
  // -----------------------------------------------------------------
  // elsa_list_portfolio
  // -----------------------------------------------------------------
  server.tool(
    "elsa_list_portfolio",
    "eLSA 포트폴리오 기업 목록. is_portfolio=true인 스타트업만 조회한다.",
    {
      industry: z.string().optional().describe("산업 분야 필터"),
      stage: z.string().optional().describe("성장 단계 필터"),
      page: z.number().int().min(1).optional().describe("페이지 번호"),
      page_size: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe("페이지 크기"),
    },
    async (params) => {
      try {
        const client = getClient();
        const result = await client.listStartups({
          is_portfolio: true,
          industry: params.industry,
          stage: params.stage,
          page: params.page,
          page_size: params.page_size,
        });

        if (result.data.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "포트폴리오 기업이 없습니다.",
              },
            ],
          };
        }

        const summary = `포트폴리오 기업 총 ${result.total}개 (${result.page}/${Math.ceil(result.total / result.page_size) || 1} 페이지)`;

        const lines = result.data.map(
          (s) =>
            `- [${s.company_name}] ${s.industry} | ${s.stage} | 등급: ${s.portfolio_grade ?? "미지정"} | 매출: ${s.current_revenue !== null ? s.current_revenue.toLocaleString() + "원" : "N/A"} | ID: ${s.id}`,
        );

        return {
          content: [
            {
              type: "text" as const,
              text: `${summary}\n\n${lines.join("\n")}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `포트폴리오 목록 조회 실패: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // -----------------------------------------------------------------
  // elsa_get_portfolio
  // -----------------------------------------------------------------
  server.tool(
    "elsa_get_portfolio",
    "eLSA 포트폴리오 기업 상세. 스타트업 정보 + 보육(incubation) 데이터를 함께 조회한다.",
    {
      startup_id: z.string().uuid().describe("스타트업 UUID"),
    },
    async (params) => {
      try {
        const client = getClient();

        // 스타트업 + incubation을 병렬 조회
        const [startup, incubations] = await Promise.all([
          client.getStartup(params.startup_id),
          client.listIncubations({ search: params.startup_id }),
        ]);

        const startupSection = [
          `# ${startup.company_name} (포트폴리오)`,
          `- CEO: ${startup.ceo_name}`,
          `- 산업: ${startup.industry} | 단계: ${startup.stage}`,
          `- 등급: ${startup.portfolio_grade ?? "미지정"}`,
          `- 원라이너: ${startup.one_liner}`,
          startup.current_revenue !== null
            ? `- 매출: ${startup.current_revenue.toLocaleString()}원`
            : null,
          startup.current_employees !== null
            ? `- 직원: ${startup.current_employees}명`
            : null,
          startup.current_traction
            ? `- 트랙션: ${startup.current_traction}`
            : null,
          startup.invested_at ? `- 투자일: ${startup.invested_at}` : null,
        ]
          .filter(Boolean)
          .join("\n");

        let incubationSection = "\n\n## 보육 정보\n없음";
        if (incubations.data.length > 0) {
          const inc = incubations.data[0];
          incubationSection = [
            "\n\n## 보육 정보",
            `- 보육 상태: ${inc.status}`,
            `- 등급: ${inc.portfolio_grade}`,
            `- 프로그램 기간: ${inc.program_start} ~ ${inc.program_end}`,
            inc.growth_bottleneck
              ? `- 성장 병목: ${inc.growth_bottleneck}`
              : null,
            inc.crisis_flags
              ? `- 위기 플래그: ${JSON.stringify(inc.crisis_flags)}`
              : null,
            inc.diagnosis
              ? `- 진단: ${JSON.stringify(inc.diagnosis)}`
              : null,
          ]
            .filter(Boolean)
            .join("\n");
        }

        return {
          content: [
            {
              type: "text" as const,
              text: startupSection + incubationSection,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `포트폴리오 상세 조회 실패: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // -----------------------------------------------------------------
  // elsa_list_issues
  // -----------------------------------------------------------------
  server.tool(
    "elsa_list_issues",
    "eLSA 포트폴리오 이슈 목록. 특정 스타트업의 리스크 이슈를 조회한다.",
    {
      startup_id: z.string().uuid().describe("스타트업 UUID"),
      resolved: z
        .boolean()
        .optional()
        .describe("해결 상태 필터 (true: 해결됨, false: 미해결)"),
    },
    async (params) => {
      try {
        const client = getClient();
        const items = await client.listIssues({
          startup_id: params.startup_id,
          resolved: params.resolved,
        });

        if (items.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "해당 스타트업의 이슈가 없습니다.",
              },
            ],
          };
        }

        const lines = items.map((issue) => {
          const status = issue.resolved ? "[해결]" : "[미해결]";
          return `- ${status} [${issue.severity}] ${issue.issue_type}: ${issue.description} (감지: ${issue.detected_by}, ${issue.created_at})`;
        });

        return {
          content: [
            {
              type: "text" as const,
              text: `이슈 ${items.length}건:\n\n${lines.join("\n")}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `이슈 조회 실패: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
