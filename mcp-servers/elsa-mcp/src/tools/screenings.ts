/**
 * Screening + DealFlow 관련 MCP 도구
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getClient } from "../client.js";

export function registerScreeningTools(server: McpServer): void {
  // -----------------------------------------------------------------
  // elsa_list_screenings
  // -----------------------------------------------------------------
  server.tool(
    "elsa_list_screenings",
    "eLSA 스크리닝(1차 심사) 결과 목록. 특정 스타트업의 스크리닝 점수와 추천을 확인한다.",
    {
      startup_id: z.string().uuid().describe("스타트업 UUID"),
    },
    async (params) => {
      try {
        const client = getClient();
        const items = await client.listScreenings({
          startup_id: params.startup_id,
        });

        if (items.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "해당 스타트업의 스크리닝 결과가 없습니다.",
              },
            ],
          };
        }

        const lines = items.map((sc) => {
          const scores = [
            `상근: ${sc.fulltime_commitment}`,
            `문제명확: ${sc.problem_clarity}`,
            `기술차별: ${sc.tech_differentiation}`,
            `시장잠재: ${sc.market_potential}`,
            `초기검증: ${sc.initial_validation}`,
            `전략적합: ${sc.strategy_fit}`,
          ].join(", ");

          return [
            `## 스크리닝 ${sc.id.slice(0, 8)}`,
            `- 종합점수: ${sc.overall_score.toFixed(1)} | 추천: ${sc.recommendation}`,
            `- 법적클리어: ${sc.legal_clear ? "Y" : "N"}`,
            `- 세부점수: ${scores}`,
            sc.risk_notes ? `- 리스크: ${sc.risk_notes}` : null,
            sc.handover_memo ? `- 인계메모: ${sc.handover_memo}` : null,
            `- 심사일: ${sc.created_at}`,
          ]
            .filter(Boolean)
            .join("\n");
        });

        return {
          content: [
            {
              type: "text" as const,
              text: `스크리닝 결과 ${items.length}건:\n\n${lines.join("\n\n")}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `스크리닝 목록 조회 실패: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // -----------------------------------------------------------------
  // elsa_get_screening
  // -----------------------------------------------------------------
  server.tool(
    "elsa_get_screening",
    "eLSA 스크리닝 상세 조회. 특정 스크리닝의 모든 점수와 메모를 확인한다.",
    {
      id: z.string().uuid().describe("스크리닝 UUID"),
    },
    async (params) => {
      try {
        const client = getClient();
        const sc = await client.getScreening(params.id);

        const text = [
          `# 스크리닝 상세`,
          `- ID: ${sc.id}`,
          `- 스타트업 ID: ${sc.startup_id}`,
          `- 심사자 ID: ${sc.screener_id}`,
          `- 종합점수: ${sc.overall_score.toFixed(1)}`,
          `- 추천: ${sc.recommendation}`,
          "",
          "## 세부 점수 (1~5)",
          `- 상근 몰입도: ${sc.fulltime_commitment}`,
          `- 문제 명확성: ${sc.problem_clarity}`,
          `- 기술 차별성: ${sc.tech_differentiation}`,
          `- 시장 잠재력: ${sc.market_potential}`,
          `- 초기 검증: ${sc.initial_validation}`,
          `- 전략 적합성: ${sc.strategy_fit}`,
          `- 법적 클리어: ${sc.legal_clear ? "Y" : "N"}`,
          "",
          sc.risk_notes ? `## 리스크 노트\n${sc.risk_notes}` : null,
          sc.handover_memo ? `## 인계 메모\n${sc.handover_memo}` : null,
          `\n심사일: ${sc.created_at}`,
        ]
          .filter(Boolean)
          .join("\n");

        return {
          content: [{ type: "text" as const, text }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `스크리닝 조회 실패: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
